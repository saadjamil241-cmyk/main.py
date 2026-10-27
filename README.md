# Star.AI

A minimal AI code assistant: paste code, pick **Analyze / Debug / Optimize / Explain**, and get a review from OpenAI.

- Backend: FastAPI (`main.py`), single file, serves the UI and `/api/analyze`.
- Frontend: plain HTML/CSS/JS in `static/` — no build step, no npm.
- Model: `gpt-4o-mini` by default, override with `OPENAI_MODEL`.

## Run it

```bash
docker compose -f docker-compose.base44.yml up --build
```

Then open http://localhost:3000.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes, for responses | OpenAI key used for the review. Delivered by Base44 secrets into `/run/base44/app.env`; the UI shows a clear message when it is missing. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini`. |

## API

`POST /api/analyze`

```json
{ "code": "def add(a, b): return a - b", "mode": "debug", "language": "python" }
```

`mode` is one of `analyze`, `debug`, `optimize`, `explain`. `language` is optional (`auto` by default).

The response is `{"mode","model","result"}` on success, or `{"error": "…"}` with HTTP 200 when the model call fails (missing key, quota, bad key). Errors intentionally use a 200 body: the preview proxy replaces 5xx bodies with its own error page.
