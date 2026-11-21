import http from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BODY_BYTES = 24 * 1024;
const VALID_LANGUAGES = new Set(['en', 'hi']);

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw Object.assign(new Error('Text is too long. Please use fewer than 20,000 characters.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

export function createTranslationHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/translate') {
      send(response, 404, { error: 'Translation endpoint not found.' });
      return;
    }
    try {
      const body = await readJson(request);
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const source = body.sourceLanguage;
      const target = body.targetLanguage;
      if (!text) throw Object.assign(new Error('Enter some text to translate.'), { status: 400 });
      if (text.length > 20000) throw Object.assign(new Error('Text is too long. Please use fewer than 20,000 characters.'), { status: 413 });
      if (!(source === 'auto' || VALID_LANGUAGES.has(source)) || !VALID_LANGUAGES.has(target)) {
        throw Object.assign(new Error('Choose English or Hindi as the target language, and a supported source language.'), { status: 400 });
      }
      if (source === target) { send(response, 200, { translatedText: text }); return; }
      if (env.TRANSLATION_PROVIDER !== 'libretranslate' || !env.LIBRETRANSLATE_URL) {
        throw Object.assign(new Error('Translation is not configured. Set TRANSLATION_PROVIDER=libretranslate and LIBRETRANSLATE_URL in the server environment; add LIBRETRANSLATE_API_KEY if your provider requires one.'), { status: 503 });
      }

      let endpoint;
      try {
        endpoint = new URL(env.LIBRETRANSLATE_URL);
        if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('protocol');
      } catch {
        throw Object.assign(new Error('The translation provider URL is invalid. Check LIBRETRANSLATE_URL.'), { status: 503 });
      }
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/translate`;
      endpoint.search = '';
      const payload = { q: text, source, target, format: 'text' };
      if (env.LIBRETRANSLATE_API_KEY) payload.api_key = env.LIBRETRANSLATE_API_KEY;

      let upstream;
      try {
        upstream = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
        });
      } catch (error) {
        const timedOut = error?.name === 'TimeoutError';
        throw Object.assign(new Error(timedOut ? 'Translation took too long. Please try again.' : 'Could not reach the translation provider. Check its URL and network connection.'), { status: 502 });
      }
      let result;
      try { result = await upstream.json(); }
      catch { throw Object.assign(new Error('The translation provider returned an unreadable response.'), { status: 502 }); }
      if (!upstream.ok) {
        const providerError = typeof result.error === 'string' ? result.error : '';
        throw Object.assign(new Error(providerError ? `Translation provider error: ${providerError}` : `Translation provider returned HTTP ${upstream.status}.`), { status: 502 });
      }
      if (typeof result.translatedText !== 'string' || !result.translatedText.trim()) {
        throw Object.assign(new Error('The provider did not return translated text.'), { status: 502 });
      }
      send(response, 200, { translatedText: result.translatedText });
    } catch (error) {
      send(response, error.status || 500, { error: error.status ? error.message : 'An unexpected translation error occurred.' });
    }
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const port = Number(process.env.TRANSLATION_PORT || 3001);
  http.createServer(createTranslationHandler()).listen(port, '127.0.0.1', () => {
    console.log(`SHENOVA translation API listening at http://127.0.0.1:${port}`);
  });
}
