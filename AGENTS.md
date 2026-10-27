# Project notes for agents

Single FastAPI service (`main.py`) that also serves the static UI in `static/`. No database, no migrations, no build step.

## Environment

- `docker-compose.base44.yml` runs the app from a plain `python:3.12-slim` image with the repo bind-mounted at `/app`; dependencies are installed at container start from `requirements.txt`, then `uvicorn --reload` serves it. Edits to `main.py` reload automatically; edits to `static/` are served as-is (browser reload).
- Host port `3000` maps to the container's `8000`.
- `OPENAI_API_KEY` arrives only through `/run/base44/app.env` (`env_file`, last entry). Never put it under compose `environment:` — that would permanently override the platform secret. The app boots without it and returns HTTP 503 with a readable message; the UI surfaces that message in a banner.
- `OPENAI_MODEL` is not a secret and is set in compose (`gpt-4o-mini`).

## Verify

```bash
docker compose -f docker-compose.base44.yml up -d
curl -sf http://localhost:3000/ | head -5          # UI is served
curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"code":"def add(a,b): return a-b","mode":"debug"}'
```

`/api/analyze` answers HTTP 200 with `{"mode","model","result"}` on success or `{"error": "…"}` when the model call fails (missing key, invalid key, no OpenAI credits). Do not "fix" this by raising a 5xx: the preview proxy swaps 5xx bodies for its own "Preview starting…" error page, so the UI would only ever see a generic message.
