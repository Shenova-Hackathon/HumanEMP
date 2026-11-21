# HumanEMP

Human Empowerment & Assistive Innovation focuses on technology-driven tools that improve independence and everyday access.

## OCR document processing

The **Read Text** page supports PNG, JPG/JPEG, BMP, TIFF, and PDF. Files are inspected by their actual content and are not saved to application storage. FastAPI/Starlette may temporarily spool larger multipart uploads to a temporary file; the endpoint closes the upload after reading it. Image processing applies EXIF orientation, grayscale, contrast normalization, median noise reduction, selective thresholding, and low-resolution upscaling. Low-confidence pages also try alternate page segmentation and right-angle orientations.

PDFs are rendered and processed page by page. Uploads are limited to 20 MB, images to 50 million pixels, and PDFs to 20 pages. Tesseract's English and Hindi choices are exposed only when the matching language data is installed.

### Windows setup

Install Tesseract OCR:

```powershell
winget install --id UB-Mannheim.TesseractOCR -e
```

Create the Python environment and install backend dependencies from the repository root:

```powershell
py -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
py -m pip install -r backend\requirements.txt
```

If Tesseract is not on PATH, set its executable location in the backend terminal before starting the service:

```powershell
$env:TESSERACT_CMD = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

Start FastAPI from the repository root:

```powershell
uvicorn app.main:app --app-dir backend --reload
```

In a second terminal, start React:

```powershell
npm install
npm run dev
```

Open the Vite URL, select **Read Text**, choose or drop a document, choose an installed language, then select **Extract Text**. `backend\.venv` is a local environment and is ignored by Git.

### API

`GET /api/ocr/languages` returns the installed supported language codes, for example `{"success":true,"languages":["eng"]}`.

`POST /api/ocr/extract` accepts `multipart/form-data` with:

- `file`: PNG, JPG/JPEG, BMP, TIFF, or PDF document
- `language`: `eng` or `hin` (defaults to `eng`; the language pack must be installed)

The response includes document type, aggregated extracted text, word and character counts, measured confidence (or `null` when no words were recognized), page count, and page-wise results. Error responses use a `detail` message and meaningful HTTP statuses: 400 for empty or malformed documents, 413 for size limits, 415 for unsupported content formats, 422 for password-protected PDFs or unavailable requested language data, and 503 when Tesseract is unavailable.

Example successful response:

```json
{
  "success": true,
  "filename": "sample.pdf",
  "document_type": "pdf",
  "language": "eng",
  "extracted_text": "Page one text\n\nPage two text",
  "word_count": 6,
  "character_count": 28,
  "confidence": 96.4,
  "page_count": 2,
  "pages": [
    { "page_number": 1, "extracted_text": "Page one text", "word_count": 3, "character_count": 13, "confidence": 96.1 },
    { "page_number": 2, "extracted_text": "Page two text", "word_count": 3, "character_count": 13, "confidence": 96.7 }
  ],
  "message": "OCR completed successfully"
}
```

Set `VITE_OCR_API_URL` in a project-root `.env` file to use another backend URL. Set backend `CORS_ORIGINS` to a comma-separated allowlist if the frontend uses another origin.

### Verification notes

Verified with printed, low-resolution, 90-degree rotated, BMP, and TIFF images; a blank image; and a two-page PDF. The rotated image was initially misread; a low-confidence orientation fallback was added and the same sample then returned the expected text. The blank image returned a successful structured response with zero counts and `confidence: null`. Corrupt/unsupported/empty uploads, a misleading `.txt` filename on a real PNG, an oversized upload, a password-protected PDF, and Hindi selection without the Hindi language pack returned the expected responses. The local Tesseract installation has `eng` and `osd`; Hindi data is not installed.
