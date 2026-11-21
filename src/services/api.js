// Integration points for a future OCR and language service.
// These intentionally fail closed: the prototype never presents sample output as real processing.
export async function extractText(file) {
  if (!(file instanceof File)) throw new Error('Choose a file to continue.');
  throw new Error('Text extraction is unavailable because no OCR service is connected yet. Your file has not been processed.');
}

export async function explainText(text) {
  if (!text?.trim()) throw new Error('Add some text to continue.');
  throw new Error('Simplification is unavailable because no AI service is connected yet. No explanation has been generated.');
}
