# OCR Module Review, Viva Guide, and Demo Plan

This guide describes the implementation in this repository as it currently exists. It distinguishes verified checks from browser interactions that could not be exercised in this session.

## 1. Architecture in one picture

```text
React Read Text page
   │ selects a file and language
   ▼
src/services/api.js
   │ POST multipart/form-data to /api/ocr/extract
   ▼
FastAPI route (size checks, form parsing, status mapping)
   │ bounded file read, OCR work in a worker thread
   ▼
Document service
   ├─ image bytes → Pillow validation and preprocessing ─┐
   └─ PDF bytes → PyMuPDF page rendering ────────────────┤
                                                        ▼
                                   pytesseract → Tesseract executable
                                                        │
                                                        ▼
                             structured JSON → React result panel
```

The app has a second small endpoint, `GET /api/ocr/languages`, which lets the page offer only the English or Hindi models installed on the backend. `GET /health` is a simple service-health check.

## 2. Concepts from the ground up

### What OCR is

OCR means **Optical Character Recognition**. It turns text represented by pixels in a picture or scanned page into editable computer text. A photo of the words `PROJECT OCR AUDIT` contains colored pixels; OCR returns the characters as a string that can be searched, copied, read aloud, or saved.

OCR can misread small, blurry, rotated, handwritten, or unusual text. The result should be reviewed when accuracy matters.

### Tesseract and pytesseract

**Tesseract** is the separate OCR program that analyzes a prepared page and recognizes characters and words. **pytesseract** is the Python wrapper used in `backend/app/services/ocr.py`: it starts Tesseract and passes it image data, language codes, and page-layout settings. Installing the Python package does not install the Tesseract executable or its language files.

The project uses Tesseract's `eng` model when English is selected. Hindi is offered only when `hin` appears in the installed Tesseract language list. This machine has `eng` and `osd`; Hindi data is not installed.

### Pillow and PyMuPDF

**Pillow** opens and verifies raster image formats, applies EXIF orientation, converts images to grayscale, adjusts contrast, filters noise, resizes small inputs, and prepares OCR variants.

**PyMuPDF** (`pymupdf`) opens PDFs, renders each page to a PNG image in memory, and passes each rendered page to the same OCR pipeline. This implementation OCRs the PDF rendering; it does not first extract embedded selectable PDF text.

### FastAPI, API, HTTP POST, JSON, and multipart form data

**FastAPI** is the Python web framework in `backend/app/main.py` and `backend/app/routes/ocr.py`. It exposes the OCR functions to the React app over HTTP.

An **API** is a defined way for one program to request work from another. In this project React calls `POST /api/ocr/extract`. **POST** is the HTTP method used to send data to a server for processing.

The uploaded file is sent as **`multipart/form-data`**. This HTTP encoding supports file bytes and ordinary form fields together; here those fields are `file` and `language`. The response is **JSON**, a text format for structured data. For example, the response contains fields such as `success`, `extracted_text`, `word_count`, `confidence`, and `pages`.

### CORS

**CORS** (Cross-Origin Resource Sharing) is a browser rule for requests between different origins. The Vite page runs at port 5173 and FastAPI at port 8000, so their origins differ. `main.py` allows `http://localhost:5173` and `http://127.0.0.1:5173` by default. CORS tells the browser which frontend origins may read the API response; CORS is not authentication and does not prevent non-browser clients from contacting the API.

### Why a backend in this project

The browser page sends the file to Python because this design uses the installed Tesseract executable, Python's Pillow/PyMuPDF processing, and server-side limits. Browser JavaScript cannot directly start arbitrary local executables such as Tesseract. Browser OCR is possible with a separate WebAssembly or JavaScript OCR library, but that would be a different architecture and would put more processing on the user's device.

## 3. Request and processing flow

1. The user opens **Read Text**. `ReadPage` fetches installed language codes from `getOcrLanguages()`.
2. The user browses for a file or drops it on the upload panel. `choose()` checks the extension for a friendly early message, checks that the file is non-empty and at most 20 MB, and makes an object URL preview for browser-displayable images. The backend still validates actual bytes; the filename and MIME type are not trusted there.
3. `extract()` calls `extractText(file, language)`. That function creates `FormData`, appends the file and language, then uses `fetch()` to send `POST /api/ocr/extract`.
4. FastAPI checks a declared `Content-Length` before multipart parsing when available. The route reads at most 20 MB plus one byte, closes the uploaded file, and rejects empty or oversized inputs.
5. OCR work runs in a worker thread, with an asyncio semaphore limiting concurrent OCR jobs to two. This prevents the blocking Tesseract subprocess call from occupying the event loop and limits simultaneous OCR work.
6. `extract_document()` checks the file signature. A PDF goes to `_ocr_pdf()`; supported raster formats go to `_open_image()`.
7. Images are verified and decoded with Pillow. EXIF and Tesseract orientation detection are applied where possible. Preprocessing creates a grayscale, autocontrasted, median-filtered, contrast-enhanced image; it may upscale small inputs and may create a thresholded alternate.
8. `_run_tesseract()` first tries page segmentation mode 3. When confidence is low it tries mode 6 and, when available, a thresholded image. If the best read is still low-confidence, it tries the other right-angle orientations. It calls `image_to_data()` to get recognized words and Tesseract's per-word confidence values.
9. For a PDF, PyMuPDF renders each page and the same OCR process runs page by page. The API aggregates the text and counts while keeping a `pages` array.
10. The route returns JSON. React stores the full response in `result`, puts `extracted_text` in a read-only text area, displays counts/confidence/page count, and shows each PDF page under **View text by page**.
11. The page has Copy, Download `.txt`, and Read aloud controls. Copy uses the browser Clipboard API; download creates a text Blob and clicks a temporary download link; read aloud uses the existing browser speech synthesis feature.

An empty but valid page returns HTTP 200 with `success: true`, empty `extracted_text`, zero counts, and `confidence: null`. The UI presents a warning message. This is different from a malformed or unsupported upload, which is an HTTP error.

## 4. Important project files

### `backend/app/main.py`

- Creates `FastAPI(title="Shenova OCR API", version="1.0.0")`.
- Reads `CORS_ORIGINS`, or uses the two local Vite origins as a development default.
- Adds `CORSMiddleware` for browser access.
- `reject_oversized_ocr_requests()` checks a declared request length for the OCR endpoint before multipart parsing. It allows the file limit plus 64 KiB for multipart headers and fields.
- Includes the router with `/api/ocr` as its prefix.
- `GET /health` returns a small JSON readiness response.

The early size check only works when the request includes a trustworthy `Content-Length`. The route also reads only 20 MB plus one byte from the uploaded file, but multipart parsing can spool an upload before the route sees it. For a production deployment, place the API behind a server/proxy with a hard request-body limit and use rate limiting and authentication if exposed beyond a trusted local network.

### `backend/app/routes/ocr.py`

- `MAX_UPLOAD_BYTES` is `20 * 1024 * 1024` (20 MiB).
- `OCR_SEMAPHORE` limits work to two concurrent OCR jobs.
- `GET /api/ocr/languages` calls `available_languages()` and returns `{"success": true, "languages": [...]}`.
- `POST /api/ocr/extract` expects multipart fields `file` and optional `language` (default `eng`).
- It reads the file with a maximum bound, closes its `UploadFile` in `finally`, and offloads blocking OCR with `run_in_threadpool()`.
- It maps unsupported formats to 415, malformed/empty documents to 400, file size to 413, unavailable/invalid language and password-protected PDFs to 422, and OCR engine errors to 503. Errors are returned as JSON `detail` messages rather than Python tracebacks.

### `backend/app/services/ocr.py`

- `SUPPORTED_IMAGE_FORMATS`, `MAX_IMAGE_PIXELS`, `MAX_PDF_PAGES`, and `MAX_PDF_RENDER_SIDE` define the processing limits.
- `TESSERACT_CMD` optionally sets the executable path; this is useful on Windows when the installer did not update the current terminal's PATH.
- `DocumentValidationError`, `UnsupportedDocumentError`, and `OCREngineError` distinguish bad input, unsupported content, and OCR installation/processing failures.
- `OCRResult` groups one page's recognized text, counts, and measured confidence.
- `available_languages()` asks Tesseract for its installed language packs and exposes only `eng` and `hin`.
- `_preprocess()` handles EXIF orientation, grayscale, upscaling, autocontrast, median noise reduction, contrast enhancement, and an optional binary threshold image.
- `_correct_orientation()` uses Tesseract OSD (orientation and script detection) when possible. Sparse text can defeat OSD, so `_run_tesseract()` has a low-confidence fallback that tests 90°, 180°, and 270° rotations.
- `_format_text()` rebuilds words from Tesseract layout data, adding line breaks and paragraph breaks where Tesseract marks them.
- `_run_tesseract()` uses `image_to_data()` with PSM 3, then PSM 6/threshold as needed. Its confidence values come from the actual Tesseract output. A confidence score is a recognition signal, not a guarantee or a calibrated probability of correctness.
- `_open_image()` checks file signatures, verifies and fully loads images with Pillow, applies Pillow's decompression-bomb limits, and maps malformed data to a safe validation error.
- `_ocr_pdf()` opens PDF bytes with PyMuPDF, rejects encrypted PDFs without an empty-password unlock, rejects empty or over-20-page documents, renders pages with a maximum 3000-pixel side, and OCRs each page.
- `extract_document()` validates the selected language, detects PDF by its `%PDF-` signature or decodes an image, aggregates counts/confidence, sanitizes the response filename to a basename, and builds the page-wise JSON response.

### `backend/requirements.txt`

- `fastapi`: web app and routes.
- `uvicorn[standard]`: development ASGI server.
- `pillow`: image decode, validation, and preprocessing.
- `pytesseract`: Python interface to the separately installed Tesseract program.
- `python-multipart`: multipart file/form parsing for FastAPI.
- `PyMuPDF`: PDF parsing and page rendering.

### `src/services/api.js`

- `OCR_API_URL` uses `VITE_OCR_API_URL` or defaults to `http://localhost:8000`.
- `extractText(file, language)` performs quick browser-side format/empty-file checks, appends the file and language to `FormData`, calls the endpoint, maps network failures to a helpful message, parses JSON errors, validates the success shape, and returns the full response object.
- `getOcrLanguages()` calls the language endpoint. If the service cannot be reached it falls back to English in the UI, so a later upload can display the backend-unavailable error.
- `explainText()` belongs to the existing Simplify Information feature and intentionally reports that no AI service is connected. It is not part of OCR.

### `src/App.jsx`

- `ReadPage()` is the existing `/read` route's OCR UI; the app was extended rather than replaced.
- State values: `file` is the selected browser File; `preview` is an object URL; `result` is the API JSON; `busy` drives the spinner and disabled controls; `dragging` styles the drop zone; `message`/`messageType` control accessible status feedback; `languages`/`language` control OCR language; `speaking`/`paused` control speech synthesis.
- The language `useEffect` requests server-supported language codes. The preview cleanup effect calls `URL.revokeObjectURL()` to release browser object URLs.
- `choose()` clears the previous selection, accepts supported suffixes for user convenience, rejects empty and over-20-MB files, and previews PNG/JPEG/BMP. TIFF and PDFs are shown by file name rather than as an inline image preview.
- `extract()` calls the API service and sets success or no-text status. On failure it clears stale results and shows a readable error.
- `copyText()` uses `navigator.clipboard.writeText()` and catches permission/browser failures.
- `downloadText()` creates a `text/plain` Blob and temporary link, downloads a `.txt` file, then revokes its object URL.
- `say()`, pause/resume, and `stop()` retain the pre-existing accessibility read-aloud capability.
- `clear()` resets state and the file input so the same file can be selected again.
- JSX renders the accessible upload panel, statistics, read-only text area, per-page PDF details, action controls, and privacy note.

The rest of `App.jsx` still contains the dashboard, Speech to Text, Speak Text, Simplify Information, and Settings pages. OCR work did not replace those screens.

### `src/styles.css`, `src/main.jsx`, `index.html`, `package.json`, and `README.md`

- `styles.css` contains the existing Shenova colors/layout and the extra OCR rules for drag state, language, statistics, page details, and message states. It also styles the shared button row.
- `main.jsx` mounts React, wraps the app in `BrowserRouter`, and imports the stylesheet.
- `index.html` supplies the root element, viewport metadata, and document title. It was converted to UTF-8 so Vite can build it.
- `package.json` still uses the existing React/Vite dependencies; no extra frontend package was needed.
- `README.md` documents Windows install/run commands, supported formats, limits, endpoints, response shape, and tested behavior.
- `.gitignore` excludes the Python virtual environment, Python bytecode caches, and Vite build output.

## 5. Verified results and honest limitations

Executed during this review:

- `npm run build`: passed. Vite prints dependency `"use client"` directive warnings, but completes the production build.
- `python -m compileall backend\app`: passed.
- Live Vite root request: HTTP 200.
- Live React API helper (`extractText`) → FastAPI → Tesseract: returned expected sample text and structured JSON; `getOcrLanguages()` returned `eng`.
- Printed image and two-page PDF: HTTP 200; text, page list, counts, and confidence were correct on the generated samples.
- Blank image: HTTP 200, empty text, zero counts, `confidence: null`.
- Unsupported content: HTTP 415; malformed and empty files: HTTP 400; oversized file/request: HTTP 413; password-protected PDF and missing Hindi language: HTTP 422.
- BMP, TIFF, low-quality image, rotated text, and mismatched filename/MIME against a real PNG were tested in the prior OCR integration pass. The rotated test initially failed, a fallback was added, and the test then returned the expected text.
- Backend-unavailable error mapping in the React API helper was checked with the service stopped.

Not executed in this review because the browser automation host was unavailable: a real Chrome UI upload, display inspection, clipboard button click, and downloaded-file inspection. Those controls exist in code, but do not present them as browser-verified. Hindi OCR could not be tested because this installation has no Hindi traineddata. Multipage TIFF is not expanded; the current TIFF path processes its first frame. PDF text is rasterized and OCRed rather than extracted from its embedded text layer.

## 6. Seventy viva questions and answers

### Level 1 — Basic OCR Concepts

1. **What is OCR?** OCR recognizes text in image pixels and converts it into characters a computer can edit or search.
2. **Why is OCR useful in this project?** The Read Text feature turns a photo or scanned page into text that can be read aloud, copied, or saved.
3. **What is the input to OCR?** Here it is an uploaded raster image or a rendered PDF page.
4. **What is OCR's output?** A Unicode text string plus page and quality metadata.
5. **Does OCR always return exactly the original text?** No. Blur, rotation, handwriting, fonts, layout, and language affect recognition.
6. **What is the difference between OCR and scanning?** Scanning captures pixels; OCR interprets those pixels as text.
7. **What does “machine-readable text” mean?** Text stored as characters, so software can select, search, copy, or read it, unlike words that exist only as pixels.
8. **Why does OCR need image quality?** The recognizer must distinguish character shapes from noise, blur, shadows, and background.
9. **Can OCR recognize handwriting?** Sometimes, but this implementation uses Tesseract and is primarily for printed text; handwriting is less reliable.
10. **What is a page segmentation mode?** A Tesseract setting describing expected page layout. This service tries PSM 3 and may try PSM 6 for low-confidence input.

### Level 2 — Python and FastAPI

11. **What is FastAPI?** A Python framework that defines HTTP endpoints and turns validated requests into Python function calls.
12. **What does Uvicorn do?** It runs the ASGI FastAPI app and listens for HTTP requests.
13. **What is an endpoint?** A route plus HTTP method, such as `POST /api/ocr/extract`.
14. **Why is the upload endpoint POST?** The client sends file data for processing, so POST is the suitable request method.
15. **What is `UploadFile`?** FastAPI's uploaded-file object; it exposes filename, content type, and a file-like stream.
16. **Why does the endpoint use `await file.read(limit)`?** To read a bounded number of bytes instead of reading an unbounded upload into memory.
17. **Why close the upload in `finally`?** It makes cleanup happen even when reading fails.
18. **Why is OCR sent to `run_in_threadpool()`?** Tesseract and image processing block while they run; a worker thread keeps the async event loop available for other requests.
19. **What does the semaphore do?** `OCR_SEMAPHORE` caps simultaneous OCR jobs at two, limiting CPU and memory pressure.
20. **How are errors returned?** The route raises `HTTPException` with a status and safe `detail` text; internal Python traceback details are not sent to the React response.

### Level 3 — Tesseract and Image Processing

21. **What is Tesseract?** The external OCR engine that analyzes page images and outputs recognized text and word confidence data.
22. **What is pytesseract?** A Python wrapper that invokes Tesseract and returns results to Python code.
23. **Why do we need both?** `pytesseract` is the integration library; the Tesseract executable and traineddata do the recognition.
24. **What does Pillow do here?** It validates, decodes, rotates, resizes, filters, and normalizes raster images before OCR.
25. **Why grayscale?** It reduces color information that usually does not help printed-text recognition and simplifies contrast processing.
26. **Why autocontrast and contrast enhancement?** They make text/background differences more visible when scans have low contrast.
27. **Why median filtering?** It can remove isolated speckle noise while retaining many text edges.
28. **What is thresholding?** Converting gray values into black or white according to a cutoff. This code creates an optional threshold variant for lower-confidence cases.
29. **How does the app handle orientation?** It applies EXIF orientation, tries Tesseract OSD, and if confidence remains low tests 90°, 180°, and 270° rotations.
30. **What is the confidence score?** It is the mean of nonnegative word confidence values returned by Tesseract. It is a heuristic quality signal, not a probability or guarantee.

### Level 4 — React and API Integration

31. **What is React state used for in `ReadPage()`?** It stores the selected file, preview, API response, busy state, language, status message, and speech state so the UI updates after actions.
32. **Why use `FormData`?** It packages a file and the `language` field as multipart form data for FastAPI.
33. **How does React call the backend?** `extractText()` calls `fetch()` with POST to `${OCR_API_URL}/api/ocr/extract`.
34. **Where does the backend URL come from?** `VITE_OCR_API_URL`, or `http://localhost:8000` by default.
35. **How does React handle a non-200 response?** It parses JSON and shows the API's `detail`; network failures get a backend-unavailable message.
36. **How are available languages displayed?** The page calls `GET /api/ocr/languages` and builds the selector from the returned `eng`/`hin` list.
37. **How does the image preview work?** `URL.createObjectURL(file)` makes a temporary browser URL; an effect revokes it when the preview changes or the page unmounts.
38. **How does copy work?** `navigator.clipboard.writeText()` copies the aggregate extracted text; errors are caught and shown.
39. **How does download work?** The page makes a `text/plain` Blob, creates a temporary anchor with a `.txt` filename, clicks it, then revokes the object URL.
40. **How are PDF pages shown?** The response's `pages` array is rendered in a `<details>` section, with the aggregate text in the main read-only textarea.

### Level 5 — Backend Architecture and Security

41. **Why validate file content instead of the suffix?** A `.png` suffix can be attached to non-image bytes. The service checks magic bytes and then decodes/verifies the actual image or PDF.
42. **Does the backend trust the browser MIME type?** No. It routes by bytes and file signatures; browser checks are only for a friendlier early message.
43. **What is the upload limit?** The API accepts files up to 20 MiB, with a declared request-size precheck that allows 64 KiB multipart overhead.
44. **What is the image-pixel limit?** Pillow is configured for 50 million pixels and decompression-bomb warnings are treated as validation failures.
45. **What PDF limits exist?** Up to 20 pages, each rendered with its longest side capped at 3000 pixels.
46. **How are uploaded files stored?** The app does not save them to a permanent application directory. Starlette may spool larger multipart uploads temporarily; `file.close()` cleans up the upload stream.
47. **How is path traversal avoided?** The client filename is never used as a path. The response filename is reduced to a basename.
48. **What is CORS and what does this app allow?** CORS is a browser cross-origin access rule. Defaults allow only the two local Vite origins, with no credentialed CORS.
49. **Is CORS a security/authentication mechanism?** No. It controls browser response access, not API caller identity. This local project has no authentication or rate limiting.
50. **How are password-protected PDFs handled?** The service attempts only the empty password; if that fails, it returns HTTP 422 with a safe explanation.

### Level 6 — Practical Implementation Questions

51. **Which image formats are supported?** PNG, JPEG/JPG, BMP, and TIFF, detected by their contents and decoded by Pillow.
52. **How does PDF OCR work?** PyMuPDF renders each PDF page to an in-memory PNG, then that image goes through the same preprocessing and Tesseract pipeline.
53. **Does the API return page-wise content?** Yes. The `pages` list contains page number, text, counts, and confidence for each page.
54. **What does an empty page return?** HTTP 200 with empty text, zero counts, `confidence: null`, and a no-readable-text message.
55. **What response fields are returned on success?** `success`, `filename`, `document_type`, `language`, `extracted_text`, word/character counts, confidence, page count, `pages`, and message.
56. **What happens if Hindi data is missing?** The language endpoint omits Hindi, and a direct Hindi request returns HTTP 422.
57. **What happens when Tesseract is missing?** The service maps the missing executable to HTTP 503; the UI displays the backend's safe error message.
58. **Why test rotated text?** It verifies orientation behavior. A sparse 90° sample initially defeated OSD; low-confidence rotation trials were added and the sample then recognized correctly.
59. **How do you start the app?** Start Uvicorn with `uvicorn app.main:app --app-dir backend --reload`, then start Vite with `npm run dev` in another terminal.
60. **What did the real audit tests show?** A generated printed PNG returned the expected text with 95.7 Tesseract confidence; a two-page PDF returned both pages. Invalid, blank, oversize, and unsupported requests produced the tested outcomes listed in the README.

### Level 7 — Advanced Technical Questions

61. **Why try more than one PSM?** PSM 3 assumes a general page layout; PSM 6 assumes a single uniform text block. Low-confidence pages may fit one better.
62. **How do you select an OCR variant?** The code uses mean Tesseract word confidence plus a small text-length tie-breaker. This is a practical heuristic, not a trained ranking model.
63. **What is OSD?** Tesseract's Orientation and Script Detection. It attempts to infer page rotation/script before recognition, but it can fail on sparse text.
64. **Why use `asyncio.Semaphore` with a worker thread?** The thread keeps OCR from blocking the event loop; the semaphore separately bounds concurrent CPU/memory-heavy jobs.
65. **Why not just use an async OCR function?** Tesseract is an external synchronous process launched by pytesseract. Offloading that blocking work is appropriate for this endpoint.
66. **What is the biggest remaining upload-security limitation?** The early guard depends on `Content-Length`. A chunked request without that header may be parsed/spooled before the route's bounded read rejects it. A production reverse proxy should enforce a hard body limit.
67. **How would you scale this?** Put FastAPI behind a reverse proxy with request limits, run multiple worker processes, use a bounded job queue for long PDFs, add authentication/rate limiting/observability, and store results only if product requirements need persistence.
68. **Why choose Tesseract over Google Vision?** Tesseract is local, open-source, and does not require sending document images to a paid cloud API. The trade-off is that the team must install/update the engine and language models, and accuracy/support may be lower for difficult documents.
69. **Why FastAPI over Flask?** FastAPI provides typed request parsing, first-class async endpoints, generated OpenAPI docs, and a convenient `UploadFile` path. Flask could also implement this API; FastAPI matches this project well.
70. **What is the difference between OCR and document understanding?** OCR transcribes visible text. Document understanding interprets structure and meaning—such as identifying totals, fields, tables, or relationships—which this project does not implement.

## 7. Difficult professor questions

- **Why not Google Vision API?** “Our group selected a local Tesseract path so the demo can run without a cloud account, API key, per-page fee, or sending documents to a third party. I understand that managed vision services can be more accurate on difficult scans. We would compare accuracy, privacy, cost, and language needs before changing it.”
- **Why FastAPI instead of Flask?** “FastAPI gives us typed request handling, async route support, automatic OpenAPI documentation, and a simple file-upload interface. Flask could do the same job, but FastAPI fit this API module cleanly.”
- **What if an image is poor?** “We apply contrast normalization, grayscale, median noise reduction, optional thresholding, and low-resolution upscaling. We also try another page segmentation mode and rotation when Tesseract confidence is low. These can help, but cannot guarantee recovery of unreadable pixels.”
- **What if no text is recognized?** “The endpoint returns a successful structured result with empty text, zero counts, null confidence, and a no-readable-text message. The UI presents a warning so the user can retry with a clearer image.”
- **How are multiple uploads handled?** “The current interface handles one document per request. The backend limits OCR concurrency to two jobs. Batch upload would need a list of files and a response per document, likely with a queue for large jobs.”
- **How are malicious files handled?** “The backend checks signatures and decodes with Pillow/PyMuPDF, caps file size, pixels, PDF pages, and rendered page dimensions, validates language codes, sanitizes the returned filename, closes upload streams, and maps errors to safe messages. For deployment I would also add proxy body limits, authentication, rate limits, antivirus/content scanning if required, and monitoring.”
- **How would you improve accuracy further?** “I would assemble a representative test set, measure character/word error rates by language and scan quality, then tune preprocessing and PSM based on evidence. I would add deskew and adaptive thresholding where tests show benefit, plus a review UI for uncertain words.”
- **What are Tesseract's limits?** “Accuracy depends on print quality, layout, fonts, language data, and preprocessing. Handwriting, tables, mixed scripts, low contrast, and complex layouts can be difficult. Confidence is only a signal and needs human review in important cases.”
- **How would you scale?** “Enforce body limits at a reverse proxy, put long OCR work in a bounded task queue, scale worker processes based on CPU/memory, set per-job timeouts, and add metrics. I would avoid unbounded concurrent subprocesses.”
- **How would you support handwriting?** “I would benchmark a handwriting-focused model or cloud OCR option, add it behind a separate service interface, and compare it on labeled handwriting samples. Tesseract's printed-text path should not be presented as reliable handwriting recognition.”
- **How is OCR different from document understanding?** “OCR returns what the page says. Document understanding also decides what those words mean and how fields relate—for example, identifying an invoice number and total. We currently stop at transcription and page statistics.”
- **Did you verify the UI copy and download buttons?** “They are implemented with Clipboard API and Blob download code, and the React production build passes. In this review the browser automation host was unavailable, so I did not click those controls and will not claim that browser interaction was verified.”

## 8. Three-to-five-minute presentation script

> Good morning. I am Member 2, responsible for OCR and document processing in our HumanEMP project. My contribution connects the Read Text feature in our React app to a Python FastAPI service that uses Tesseract OCR.
>
> The user selects or drops an image or PDF. The React page sends the file and selected language as multipart form data to `POST /api/ocr/extract`. FastAPI checks the upload size and hands the OCR work to a worker thread. The service validates the actual file bytes rather than trusting the name. Pillow handles PNG, JPEG, BMP, and TIFF images. PyMuPDF renders PDF pages one by one.
>
> Before recognition, the service corrects EXIF orientation and tries Tesseract orientation detection. It converts the page to grayscale, adjusts contrast, reduces small noise, and may upscale small scans or try a thresholded image. Tesseract returns the text and word confidence values. For a low-confidence page the service can try a different segmentation mode and other right-angle rotations. It returns the aggregate text, page-by-page results, counts, and a measured confidence value when available.
>
> The React screen displays the text, page count, counts, and confidence. It also includes copy, text download, and read-aloud controls. The service exposes installed languages, so Hindi appears only when Hindi traineddata is installed.
>
> One challenge was a sparse rotated page that Tesseract's orientation detector did not correct. I reproduced it, added a low-confidence fallback that tries right-angle rotations, and verified that the same sample then returned the expected words. I also added content-signature checks, file and pixel/page limits, password-protected PDF handling, and safe API error messages.
>
> In my verification, the production build and Python compilation passed. A printed sample returned the expected text and 95.7 confidence, and a two-page PDF returned both pages. Unsupported, corrupt, empty, oversized, and password-protected inputs were also checked. Hindi was not tested because this machine has only English and OSD language data. The browser automation host was unavailable for this review, so I have not claimed a live click-through test of the copy and download buttons.
>
> Future improvements include installing and evaluating Hindi data, testing a larger labeled image set, adding deskew and adaptive thresholding if measured results justify them, supporting multipage TIFF, and adding a production proxy body limit and rate limiting. That is my OCR contribution. Thank you.

## 9. Live technical demonstration plan

1. **Start FastAPI.** Run the backend commands from the README. Say: “This starts the Python API on port 8000. The OCR executable is a separate install, and `TESSERACT_CMD` points to it if PATH is not configured.”
2. **Start React.** In another terminal run `npm run dev`. Say: “The Vite frontend normally opens on port 5173; the backend CORS allowlist includes this local origin.”
3. **Open Read Text.** Navigate to the app and choose the Read Text item. Say: “This screen is the existing accessibility feature extended to accept documents.”
4. **Choose language and upload.** Use a clear printed-text PNG. Say: “The language list comes from the backend's installed Tesseract packs. The browser checks file size and suffix for quick feedback; the backend validates the file bytes.”
5. **Extract text.** Click **Extract Text**. Say: “The file and language go in multipart form data. The route reads a bounded upload, then runs the blocking OCR work in a worker thread.”
6. **Review result.** Point out the text area, word/character counts, confidence, and PDF page list if demonstrating a PDF. Say: “Confidence is the mean of Tesseract's word scores, not a guarantee that every word is correct.”
7. **Copy and download.** Click **Copy**, paste into a scratch text editor, then click **Download .txt** and open the downloaded file. Say: “These controls use the browser clipboard and Blob download APIs.” Do this live yourself because those clicks were not verified in this review.
8. **Demonstrate error handling.** Upload an unsupported file or a blank image. Say: “Unsupported and malformed data return a clear API error. A valid blank page returns a structured empty result with null confidence and a warning.” A password-protected PDF can demonstrate HTTP 422 if you have a safe test file.
9. **Close.** Say: “The app processes files without storing them in application storage. For production I would enforce a proxy-level request limit and add authentication/rate limiting.”

## 10. Final evaluation checklist

- [ ] **Backend:** `GET /health` works; Tesseract executable is configured; English model appears at `/api/ocr/languages`.
- [ ] **Frontend:** Read Text opens; preview and filename appear; drag/drop and browse both work; language selector matches installed models.
- [ ] **API integration:** POST sends `file` and `language`; CORS allows the local Vite origin; response fields render as expected.
- [ ] **OCR accuracy:** Test a clean printed page, low-quality scan, rotated page, and target-language examples; compare expected text rather than trusting confidence alone.
- [ ] **PDF:** Test multiple pages, protected PDF, corrupt PDF, and page-count limit.
- [ ] **Error handling:** Test empty, malformed, unsupported, oversized, blank, missing-engine, and backend-unavailable cases.
- [ ] **Copy/download:** Click each control in the browser; paste clipboard text and open the downloaded `.txt` to verify content.
- [ ] **Security:** Verify byte validation, file/pixel/page limits, path-free processing, cleanup, proxy body limits, and that errors show no stack traces.
- [ ] **Code quality:** Run Python compile, React production build, inspect dependency list, and review changed files.
- [ ] **Documentation:** Rehearse setup commands, endpoint schema, limitations, and why confidence is not a probability.
- [ ] **Viva:** Practice a 30-second architecture explanation, the demo script, one failure case, and the scaling/security answers.
