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

export async function translateText(text, sourceLanguage, targetLanguage) {
  if (!text?.trim()) throw new Error('Enter some text to translate.');
  if (sourceLanguage === targetLanguage) return text;
  let response;
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
    });
  } catch {
    throw new Error('Could not reach the translation service. Check that the translation server is running and try again.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The translation service returned an unreadable response. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'Translation failed. Please try again.');
  if (typeof data.translatedText !== 'string' || !data.translatedText.trim()) {
    throw new Error('The translation service did not return translated text. Please try again.');
  }
  return data.translatedText;
}
