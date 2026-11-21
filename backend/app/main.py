import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes.ocr import MAX_UPLOAD_BYTES, router as ocr_router

app = FastAPI(title="Shenova OCR API", version="1.0.0")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def reject_oversized_ocr_requests(request, call_next):
    """Reject oversized declared requests before multipart parsing spools the upload."""
    if request.url.path == "/api/ocr/extract":
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                request_size = int(content_length)
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid request size header."})
            if request_size > MAX_UPLOAD_BYTES + 64 * 1024:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "File is too large. Choose a document smaller than 20 MB."},
                )
    return await call_next(request)

app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR"])


@app.get("/health")
def health_check():
    return {"success": True, "message": "OCR service is ready"}
