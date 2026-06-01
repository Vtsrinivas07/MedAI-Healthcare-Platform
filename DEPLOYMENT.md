# Deployment guide

This repository contains a monorepo with `frontend` (Vite + React) and `backend` (FastAPI).

## Backend — Render (Docker)

Files added:
- `backend/Dockerfile` — builds on Python 3.11-slim and installs system deps required by Pillow and other binary packages.
- `backend/.python-version` — pins Python for Render native (non-Docker) deployments.
- `backend/.dockerignore` — ignores local files, weights, and caches.
- `render.yaml` — minimal Render Docker service config.

Steps:
1. Push the repo to GitHub (if not already). Render will read `render.yaml` if you connect the repo.
2. In Render, create a new Web Service and choose "Deploy from Git" → select the repo. Render will use the `render.yaml` and build the Docker image.
3. In Render service settings, add environment variables (MONGODB_URI, JWT_SECRET_KEY, REDIS_URL, etc.) in the Environment tab.

If Render locks the Root Directory, Build Command, or Start Command fields in the UI, do not fight the dashboard settings. Delete the existing service and recreate it from the repository blueprint so the updated `render.yaml` is applied.


### Render Environment Variables

Required:

- `MONGODB_URI`
- `JWT_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_ORIGINS`

Recommended:

- `REDIS_URL`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `DEBUG`

Optional, depending on features you use:

- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `HUGGINGFACE_API_KEY`
- `HUGGINGFACE_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `GOOGLE_MAPS_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`












	 - Add `ALLOWED_ORIGINS` to allow the frontend origin(s), for example:
		 `ALLOWED_ORIGINS=https://med-ai-healthcare-platform-33kkxmgh9-vtsrinivas07s-projects.vercel.app`
4. Optionally, use the following local commands to test the Docker image:

```bash
docker build -t medai-backend -f MedAi/backend/Dockerfile .
docker run -e PORT=8000 -p 8000:8000 medai-backend
```

## Backend — Render (Native Python)

If you deploy as a Python service (instead of Docker), set **Root Directory** to `backend`.

Version pinning:
- Keep `backend/.python-version` in git so Render does not use the platform default Python.
- Current pin: `3.11.9`.

Build/start commands:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Frontend — Vercel

Files added:
- `frontend/vercel.json` — Vercel config for static build output.
- `frontend/.env.production.example` — example `VITE_` env vars to add in Vercel.

Steps:
1. Create a new project on Vercel and connect the `frontend` folder in the repo (set Root Directory to `frontend`).
2. Set Build Command: `npm run build` (or `yarn build`) and Output Directory: `dist`.
3. Add environment variables in the Vercel project settings using the names in `.env.production.example` (prefix `VITE_` is required by Vite). The frontend reads `VITE_API_URL` for the backend base URL.


### Vercel Environment Variables

Required:

- `VITE_API_URL=https://medai-healthcare-platform-y8lf.onrender.com`
- `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`

Optional:

- `VITE_GOOGLE_MAPS_API_KEY`

Not needed for the current popup-based Google login flow:

- `VITE_GOOGLE_REDIRECT_URI`

4. Add the OAuth origin in Google Cloud Console to match your Vercel domain.
	 - Authorized JavaScript origin: `https://med-ai-healthcare-platform.vercel.app`
	 - If you later switch to a redirect-based flow, add `https://med-ai-healthcare-platform.vercel.app/auth/callback` as a redirect URI and keep the route alias in the frontend.
	 - After setting envs, trigger a redeploy in Vercel so the build picks up the new values.

## Notes
- Do NOT commit real secrets to the repository. Use Render and Vercel secret managers. Rotate any keys that were exposed.
- If you have large ML model weights, prefer storing them in S3 or a managed storage and download at runtime, instead of committing them to the repo.
