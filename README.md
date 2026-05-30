# SaveMyParking

This app includes a parking timer and an AI helper that parses parking billing rules.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the Vite app:
   `npm run dev`

The web client calls `/api/parse-parking-rule`. In production this route is served by the Cloudflare Worker in `worker/index.js`.

## Backend Gemini Key

The Gemini API key must be stored only on the backend.

For Cloudflare Workers local development:

1. Create a local Worker secret file:
   `echo GEMINI_API_KEY=your_gemini_key > .dev.vars`
2. Build the frontend:
   `npm run build`
3. Start the Worker locally with Wrangler:
   `npx wrangler dev`

For deployed Workers, configure the secret with:

`npx wrangler secret put GEMINI_API_KEY`

Frontend code, browser bundles, and WeChat Mini Program code must not store production Gemini keys. Do not add `VITE_GEMINI_API_KEY`, `process.env.GEMINI_API_KEY`, hardcoded Gemini keys, or `key=` Gemini URLs to frontend code.

For the mini program, update `xiaochengxu/services/geminiService.js` so `API_URL` points to your deployed backend endpoint, for example:

`https://your-worker-domain.example.com/api/parse-parking-rule`
