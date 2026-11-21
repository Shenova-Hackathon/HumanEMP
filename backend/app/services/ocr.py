"""In-memory image and PDF preparation and Tesseract OCR helpers."""

from __future__ import annotations

import io
import os
import re
import warnings
from dataclasses import dataclass

import pymupdf
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError
from pytesseract import Output, TesseractError, TesseractNotFoundError

SUPPORTED_IMAGE_FORMATS = {"PNG", "JPEG", "BMP", "TIFF"}
MAX_IMAGE_PIXELS = 50_000_000
MAX_PDF_PAGES = 20
MAX_PDF_RENDER_SIDE = 3000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

configured_tesseract = os.getenv("TESSERACT_CMD")
if configured_tesseract:
    pytesseract.pytesseract.tesseract_cmd = configured_tesseract


class DocumentValidationError(Exception):
    """Raised when an upload is malformed, unsupported, or too complex."""


class UnsupportedDocumentError(DocumentValidationError):
    """Raised when the actual file content is a format this service does not support."""


class OCREngineError(Exception):
    """Raised when Tesseract is unavailable or cannot process the document."""


@dataclass
class OCRResult:
    text: str
    word_count: int
    character_count: int
    confidence: float | None


def available_languages() -> list[str]:
    """Return installed language packs, limited to the app's supported choices."""
    try:
        installed = set(pytesseract.get_languages(config=""))
    except TesseractNotFoundError as exc:
        raise OCREngineError("Tesseract OCR is not installed or configured on the server.") from exc
    return [language for language in ("eng", "hin") if language in installed]


def _preprocess(image: Image.Image) -> list[Image.Image]:
    """Create a readable grayscale variant and, when useful, a thresholded one."""
    normalized = ImageOps.exif_transpose(image).convert("L")
    if max(normalized.size) < 1800:
        scale = min(2.0, 1800 / max(normalized.size))
        normalized = normalized.resize((round(normalized.width * scale), round(normalized.height * scale)), Image.Resampling.LANCZOS)

    normalized = ImageOps.autocontrast(normalized, cutoff=1)
    normalized = normalized.filter(ImageFilter.MedianFilter(size=3))
    normalized = ImageEnhance.Contrast(normalized).enhance(1.25)

    variants = [normalized]
    low, high = normalized.getextrema()
    if high - low > 25:
        threshold = low + (high - low) * 0.52
        binary = normalized.point(lambda value: 255 if value >= threshold else 0, mode="1")
        variants.append(binary)
    return variants


def _correct_orientation(image: Image.Image, language: str) -> Image.Image:
    """Apply EXIF orientation and Tesseract OSD rotation when it can be detected."""
    corrected = ImageOps.exif_transpose(image)
    if min(corrected.size) < 160:
        return corrected
    try:
        orientation = pytesseract.image_to_osd(corrected, lang=language, timeout=10)
        match = re.search(r"Rotate:\s*(\d+)", orientation)
        rotation = int(match.group(1)) if match else 0
        if rotation in {90, 180, 270}:
            corrected = corrected.rotate(-rotation, expand=True)
    except (TesseractError, TesseractNotFoundError, RuntimeError):
        # Orientation detection needs enough text and the optional OSD data.
        pass
    return corrected


def _format_text(data: dict) -> tuple[str, list[float]]:
    """Rebuild words into lines and paragraphs from Tesseract's layout data."""
    lines: list[str] = []
    confidences: list[float] = []
    previous_key: tuple[int, int, int] | None = None
    words: list[str] = []

    def flush_line():
        if words:
            lines.append(" ".join(words))
            words.clear()

    for index, raw_text in enumerate(data.get("text", [])):
        word = raw_text.strip()
        if not word:
            continue
        key = (
            int(data["block_num"][index]),
            int(data["par_num"][index]),
            int(data["line_num"][index]),
        )
        if previous_key is not None and key != previous_key:
            flush_line()
            if key[:2] != previous_key[:2] and lines and lines[-1] != "":
                lines.append("")
        words.append(word)
        previous_key = key
        try:
            confidence = float(data["conf"][index])
            if confidence >= 0:
                confidences.append(confidence)
        except (TypeError, ValueError):
            pass
    flush_line()
    return "\n".join(lines).strip(), confidences


def _run_tesseract(image: Image.Image, language: str) -> OCRResult:
    """OCR a prepared page, trying alternate layouts only when confidence is low."""
    candidates: list[tuple[tuple[float, int], str, list[float]]] = []
    variants = _preprocess(_correct_orientation(image, language))

    def recognize(variant: Image.Image, page_segmentation: int):
        try:
            data = pytesseract.image_to_data(
                variant,
                lang=language,
                config=f"--psm {page_segmentation}",
                output_type=Output.DICT,
                timeout=30,
            )
        except TesseractNotFoundError as exc:
            raise OCREngineError("Tesseract OCR is not installed or configured on the server.") from exc
        except TesseractError as exc:
            raise OCREngineError("OCR could not process this page. Please try another document.") from exc
        except RuntimeError as exc:
            raise OCREngineError("OCR took too long to process this page. Try a smaller or clearer document.") from exc
        text, confidences = _format_text(data)
        mean_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        score = mean_confidence + min(len(text), 500) * 0.03
        candidates.append(((score, len(text)), text, confidences))

    recognize(variants[0], 3)
    if not candidates[0][2] or sum(candidates[0][2]) / len(candidates[0][2]) < 78:
        recognize(variants[0], 6)
        if len(variants) > 1:
            recognize(variants[1], 6)

    best = max(candidates, key=lambda candidate: candidate[0])
    best_confidence = sum(best[2]) / len(best[2]) if best[2] else 0
    if best[1] and best_confidence < 70:
        # OSD can miss short or sparse pages; try the other right-angle orientations only
        # after a low-confidence read so normal pages do not pay this processing cost.
        for angle in (90, 180, 270):
            rotated = variants[0].rotate(angle, expand=True)
            recognize(rotated, 3)

    _, text, confidences = max(candidates, key=lambda candidate: candidate[0])
    word_count = len(text.split())
    confidence = round(sum(confidences) / len(confidences), 1) if confidences else None
    return OCRResult(text, word_count, len(text), confidence)


def _open_image(contents: bytes) -> Image.Image:
    supported_signatures = (
        b"\x89PNG\r\n\x1a\n",
        b"\xff\xd8\xff",
        b"BM",
        b"II*\x00",
        b"MM\x00*",
    )
    if not contents.startswith(supported_signatures):
        raise UnsupportedDocumentError("Supported document types are PNG, JPG, BMP, TIFF, and PDF.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(contents)) as source:
                if source.format not in SUPPORTED_IMAGE_FORMATS:
                    raise UnsupportedDocumentError("Supported image types are PNG, JPG, BMP, and TIFF.")
                source.verify()
            with Image.open(io.BytesIO(contents)) as source:
                source.load()
                if source.width < 1 or source.height < 1:
                    raise DocumentValidationError("This image is empty. Choose another file.")
                # EXIF orientation is applied during preprocessing; return a detached copy.
                return source.copy()
    except DocumentValidationError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning, ValueError) as exc:
        raise DocumentValidationError("This image is malformed or too large to process.") from exc


def _ocr_pdf(contents: bytes, language: str) -> list[OCRResult]:
    try:
        document = pymupdf.open(stream=contents, filetype="pdf")
    except (pymupdf.FileDataError, ValueError, RuntimeError) as exc:
        raise DocumentValidationError("This PDF is damaged or cannot be opened.") from exc

    with document:
        if document.is_encrypted and not document.authenticate(""):
            raise DocumentValidationError("This PDF is password-protected and cannot be processed.")
        if document.page_count < 1:
            raise DocumentValidationError("This PDF has no pages to process.")
        if document.page_count > MAX_PDF_PAGES:
            raise DocumentValidationError(f"PDFs can contain up to {MAX_PDF_PAGES} pages per upload.")

        pages: list[OCRResult] = []
        for page in document:
            rect = page.rect
            if rect.width <= 0 or rect.height <= 0:
                raise DocumentValidationError("A PDF page has invalid dimensions and cannot be rendered.")
            scale = min(2.0, MAX_PDF_RENDER_SIDE / max(rect.width, rect.height))
            try:
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                with Image.open(io.BytesIO(pixmap.tobytes("png"))) as image:
                    image.load()
                    pages.append(_run_tesseract(image, language))
            except (pymupdf.FileDataError, ValueError, RuntimeError) as exc:
                raise DocumentValidationError("A PDF page could not be rendered.") from exc
    return pages


def extract_document(contents: bytes, filename: str, language: str = "eng") -> dict:
    """Inspect the actual document bytes, process them in memory, and return page data."""
    installed_languages = available_languages()
    if language not in {"eng", "hin"}:
        raise DocumentValidationError("Choose English or Hindi for OCR.")
    if language not in installed_languages:
        human_language = "Hindi" if language == "hin" else "English"
        raise DocumentValidationError(f"{human_language} OCR language data is not installed on the server.")

    if contents.startswith(b"%PDF-"):
        pages = _ocr_pdf(contents, language)
        document_type = "pdf"
    else:
        image = _open_image(contents)
        try:
            pages = [_run_tesseract(image, language)]
        finally:
            image.close()
        document_type = "image"

    text = "\n\n".join(page.text for page in pages).strip()
    words = sum(page.word_count for page in pages)
    characters = len(text)
    weighted_confidence = [
        (page.confidence, page.word_count)
        for page in pages
        if page.confidence is not None and page.word_count > 0
    ]
    confidence = None
    if weighted_confidence:
        confidence = round(sum(value * count for value, count in weighted_confidence) / sum(count for _, count in weighted_confidence), 1)

    return {
        "success": True,
        "filename": os.path.basename(filename.replace("\\", "/")) or "document",
        "document_type": document_type,
        "language": language,
        "extracted_text": text,
        "word_count": words,
        "character_count": characters,
        "confidence": confidence,
        "page_count": len(pages),
        "pages": [
            {
                "page_number": index,
                "extracted_text": page.text,
                "word_count": page.word_count,
                "character_count": page.character_count,
                "confidence": page.confidence,
            }
            for index, page in enumerate(pages, start=1)
        ],
        "message": "OCR completed successfully" if text else "No readable text was detected in this document.",
    }
