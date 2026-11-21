const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:8000';
const SUPPORTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'pdf']);
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function extractText(file) {
  if (!(file instanceof File)) throw new Error('Choose a file to continue.');

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Choose a PNG, JPG, BMP, TIFF, or PDF document.');
  }
  if (!file.size) throw new Error('This file is empty. Choose another document.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('This file is larger than 20 MB. Choose a smaller document.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', 'eng');

  let response;
  try {
    response = await fetch(`${OCR_API_URL}/api/ocr/extract`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Could not reach the OCR service. Make sure the backend is running, then try again.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The OCR service returned an unexpected response.');
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Text extraction failed. Please try another document.');
  }
  if (data.success !== true || typeof data.extracted_text !== 'string') {
    throw new Error('The OCR service returned an unexpected response.');
  }
  if (!data.extracted_text.trim()) {
    throw new Error(data.message || 'No readable text was found in this document.');
  }

  // The existing ReadPage expects extracted text, while the API returns structured JSON.
  return data.extracted_text;
}

export async function explainText(text) {
  if (!text?.trim()) throw new Error('Add some text to continue.');
  throw new Error('Simplification is unavailable because no AI service is connected yet. No explanation has been generated.');
}
