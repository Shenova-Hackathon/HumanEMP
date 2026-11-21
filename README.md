# HumanEMP
Human Empowerment &amp; Assistive Innovation focuses on developing innovative, technology-driven solutions that improve people's lives, promote independence, and make everyday activities easier for everyone, especially people with disabilities, elderly individuals, and those facing physical, sensory, or communication challenges.

## Cross-language speech (English and Hindi)

The Speak Text page can send original text to a LibreTranslate-compatible translation provider and then speak the returned translation with an installed system voice. The provider must be configured; without it, translation returns an actionable error and never substitutes sample/fake output. Same-language selection passes the original text through without calling a translation provider.

For local development, copy `.env.example` to `.env`, then set `LIBRETRANSLATE_URL` and, if required by your provider, `LIBRETRANSLATE_API_KEY`. Keep `.env` private and never use a `VITE_` prefix for the key.

Run the API and Vite frontend in separate terminals:

```powershell
npm run dev:api
npm run dev
```

Vite forwards `/api` requests to the local API on port 3001. For production hosting, route `/api/translate` to `server/translation.js` from your host or reverse proxy; the static Vite preview alone does not run the translation server. The API accepts English (`en`), Hindi (`hi`), and auto-detect (`auto`) source text, with English or Hindi targets.

Run the local server tests with `npm test` and create a production frontend build with `npm run build`.
