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
	 - Add `ALLOWED_ORIGINS` to allow the frontend origin(s), for example:
		 `ALLOWED_ORIGINS=https://med-ai-healthcare-platform-33kkxmgh9-vtsrinivas07s-projects.vercel.app`
	 - If your backend handles OAuth callbacks, set `GOOGLE_REDIRECT_URI` to your backend callback, for example:
		 `GOOGLE_REDIRECT_URI=https://medai-healthcare-platform-y8lf.onrender.com/api/auth/google/callback`
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
	 - Example values for your project:
		 - `VITE_API_URL=https://medai-healthcare-platform-y8lf.onrender.com`
		 - `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`
		 - `VITE_GOOGLE_REDIRECT_URI=https://med-ai-healthcare-platform-33kkxmgh9-vtsrinivas07s-projects.vercel.app/auth/callback`
	 - After setting envs, trigger a redeploy in Vercel so the build picks up the new values.
4. Add the OAuth redirect URI in Google Cloud Console to match your Vercel domain (e.g., `https://your-vercel-domain.vercel.app/auth/callback`).
	 - For your deployment, add these entries in Google Cloud Console (APIs & Services → Credentials → OAuth 2.0 Client ID):
		 - Authorized JavaScript origin: `https://med-ai-healthcare-platform-33kkxmgh9-vtsrinivas07s-projects.vercel.app`
		 - Authorized redirect URI (frontend): `https://med-ai-healthcare-platform-33kkxmgh9-vtsrinivas07s-projects.vercel.app/auth/callback`
		 - If your backend handles OAuth callbacks, also add: `https://medai-healthcare-platform-y8lf.onrender.com/api/auth/google/callback`

## Notes
- Do NOT commit real secrets to the repository. Use Render and Vercel secret managers. Rotate any keys that were exposed.
- If you have large ML model weights, prefer storing them in S3 or a managed storage and download at runtime, instead of committing them to the repo.
