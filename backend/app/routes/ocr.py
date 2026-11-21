import asyncio

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.services.ocr import DocumentValidationError, OCREngineError, UnsupportedDocumentError, available_languages, extract_document

router = APIRouter()
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
OCR_SEMAPHORE = asyncio.Semaphore(2)


@router.get("/languages")
def languages():
    """List the supported OCR languages installed on this server."""
    try:
        installed = available_languages()
    except OCREngineError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"success": True, "languages": installed}


@router.post("/extract")
async def extract(file: UploadFile = File(...), language: str = Form("eng")):
    """Extract text from an image or PDF without persisting the uploaded file."""
    try:
        contents = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()

    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Choose a document smaller than 20 MB.")

    try:
        async with OCR_SEMAPHORE:
            return await run_in_threadpool(extract_document, contents, file.filename or "document", language)
    except UnsupportedDocumentError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except DocumentValidationError as exc:
        message = str(exc)
        status = 422 if "password-protected" in message.lower() or "language" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message) from exc
    except OCREngineError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
