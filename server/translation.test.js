import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import http from 'node:http';
import { createTranslationHandler } from './translation.js';

const servers = new Set();
async function requestTranslation({ env = {}, fetchImpl, body }) {
  const server = http.createServer(createTranslationHandler({ env, fetchImpl }));
  servers.add(server);
  servers.add(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}/api/translate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
afterEach(async () => { await Promise.all([...servers].map(server => new Promise(resolve => server.close(resolve)))); servers.clear(); });

test('translates English to Hindi through the provider and keeps its key server-side', async () => {
  let calledUrl, calledPayload;
  const response = await requestTranslation({
    env: { TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'https://provider.example', LIBRETRANSLATE_API_KEY: 'test-placeholder-key' },
    fetchImpl: async (url, options) => { calledUrl = String(url); calledPayload = JSON.parse(options.body); return Response.json({ translatedText: 'नमस्ते' }); },
    body: { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { translatedText: 'नमस्ते' });
  assert.equal(calledUrl, 'https://provider.example/translate');
  assert.equal(calledPayload.source, 'en');
  assert.equal(calledPayload.target, 'hi');
  assert.equal(calledPayload.api_key, 'test-placeholder-key');
});

test('translates Hindi to English', async () => {
  let calledPayload;
  const response = await requestTranslation({
    env: { TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'http://provider.example' },
    fetchImpl: async (_url, options) => { calledPayload = JSON.parse(options.body); return Response.json({ translatedText: 'Good morning' }); },
    body: { text: 'सुप्रभात', sourceLanguage: 'hi', targetLanguage: 'en' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calledPayload, { q: 'सुप्रभात', source: 'hi', target: 'en', format: 'text' });
});

test('sends an auto-detected source to the English translation provider', async () => {
  let calledPayload;
  const response = await requestTranslation({
    env: { TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'http://provider.example' },
    fetchImpl: async (_url, options) => { calledPayload = JSON.parse(options.body); return Response.json({ translatedText: 'Good morning' }); },
    body: { text: 'सुप्रभात', sourceLanguage: 'auto', targetLanguage: 'en' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calledPayload, { q: 'सुप्रभात', source: 'auto', target: 'en', format: 'text' });
});

test('returns an actionable error without configured translation provider', async () => {
  const response = await requestTranslation({ body: { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
});

test('reports provider errors without returning fake output', async () => {
  const response = await requestTranslation({
    env: { TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'https://provider.example' },
    fetchImpl: async () => { throw new TypeError('offline'); },
    body: { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' },
  });
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /could not reach/i);
});

test('rejects unsupported languages and bypasses provider for same-language requests', async () => {
  const invalid = await requestTranslation({ body: { text: 'Hello', sourceLanguage: 'fr', targetLanguage: 'hi' } });
  assert.equal(invalid.status, 400);
  const same = await requestTranslation({ body: { text: 'Hello', sourceLanguage: 'en', targetLanguage: 'en' } });
  assert.equal(same.status, 200);
  assert.deepEqual(await same.json(), { translatedText: 'Hello' });
});
