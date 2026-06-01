# MedAI Healthcare Platform

MedAI is an open, full-stack healthcare platform that combines a FastAPI backend, a Vite + React frontend, and a medical AI layer for chat, image diagnosis, prescriptions, lab flows, and role-aware dashboards.

This README gives a concise, step-by-step setup, development, and deployment guide so anyone can run the project locally or deploy it to production.

---

## Quick links

- Backend entry: [backend/main.py](backend/main.py)
- Backend settings: [backend/config/settings.py](backend/config/settings.py)
- Frontend entry: [frontend/src/main.jsx](frontend/src/main.jsx)
- Demo seed script: [backend/scripts/seed_demo_doctors.py](backend/scripts/seed_demo_doctors.py)

---

## Tech stack

- Frontend: React, Vite, JavaScript, React Router, Axios, Tailwind CSS
- Backend: Python, FastAPI, Uvicorn
- Database: MongoDB (Motor/PyMongo)
- Auth: JWT, Google OAuth
- AI/ML: Gemini API (`google-generativeai`), PyTorch, `timm`, `medmnist`, `sentence-transformers`
- Infra / Deploy: Render (backend), Vercel (frontend), Docker (optional)
- Other: Redis (optional), SendGrid, Twilio, CORS, rate limiting

---

## Prerequisites

- Python 3.10+ and pip
- Node.js 18+ and npm/yarn
- A MongoDB instance (Atlas or local)
- (Optional) Redis instance for caching/rate limiting
- A Google Cloud OAuth client (Client ID + Secret) if you want Google login

---

## Environment variables

Create a `.env` file in `backend/`. Required values for basic operation:

- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET_KEY` — secret for signing JWT access/refresh tokens
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (frontend uses `VITE_GOOGLE_CLIENT_ID`)
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret

Optional integrations (enable as needed):

- `AI_PROVIDER`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`
- `REDIS_URL` — Redis connection URL for caching and rate limiting
- `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `GOOGLE_MAPS_API_KEY`

Frontend environment (create `.env` in `frontend/`):

- `VITE_GOOGLE_CLIENT_ID` — matches backend `GOOGLE_CLIENT_ID`
- `VITE_API_URL` — backend base URL for the frontend (default: `http://localhost:8000`)

---

## Quick local development (recommended)

1) Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
.venv\Scripts\Activate    # Windows PowerShell
pip install -r requirements.txt
# create .env (see variables above)
python main.py
```

Backend runs on `http://localhost:8000` (docs at `/docs`).

2) Start the frontend

```bash
cd frontend
npm install
# create frontend/.env with VITE_GOOGLE_CLIENT_ID and VITE_API_URL
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

---

## Demo credentials

The repository includes a seed script that inserts demo doctors. Run it from `backend/` after you point the `.env` to your DB.

```bash
cd backend
python scripts/seed_demo_doctors.py
```

Demo doctor login credentials (common password): `Doctor@123`

- dr.aisha.patel@medai.demo  / Doctor@123
- dr.michael.chen@medai.demo / Doctor@123
- dr.sofia.martinez@medai.demo / Doctor@123
- dr.rahul.iyer@medai.demo / Doctor@123
- dr.priya.sharma@medai.demo / Doctor@123
- dr.arjun.nair@medai.demo / Doctor@123

Note: There is no demo admin account seeded by default. Create an admin through the admin UI or insert directly into the database.

---

## Deployment (Render backend + Vercel frontend) — high level

1) Backend (Render)

- Create a new Web Service on Render and point it to this repository.
- Use `rootDir: backend` so Render builds and runs from the backend folder.
- Build command: `pip install -r ../requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add the same environment variables you set locally to the Render service (see Environment variables above).

2) Frontend (Vercel)

- Create a new Vercel project pointing to the `frontend/` folder.
- Set `VITE_API_URL` to your Render service URL (e.g. `https://<your-render-service>.onrender.com`).
- Add `VITE_GOOGLE_CLIENT_ID` to Vercel env vars.
- Deploy.

Important: If you test on Vercel preview URLs, add every preview origin as an authorized JavaScript origin in your Google Cloud OAuth client; otherwise Google will return an `origin_mismatch` error.

---

## Common troubleshooting

- Google OAuth origin_mismatch: make sure the browser origin you're testing (exact preview or production URL) is listed in the Google Cloud Console OAuth credentials. Also confirm `VITE_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID` match.
- CORS errors: the backend reads CORS settings in `backend/main.py`; ensure `VITE_API_URL` points to the correct backend.
- Missing packages at runtime: ensure `requirements.txt` is up-to-date and that Render installs from the file at the correct path (`backend/` vs repo root). See [render.yaml](render.yaml) in the repo for an example blueprint.
- Redis warnings: Redis is optional. If you don't have Redis, the app runs with degraded rate-limiting.

---

## Where to look in the code

- App startup and middleware: [backend/main.py](backend/main.py)
- Settings and environment model: [backend/config/settings.py](backend/config/settings.py)
- Auth routes: [backend/routes/auth.py](backend/routes/auth.py)
- AI services and Gemini integration: [backend/services/ai_service.py](backend/services/ai_service.py)
- Frontend API client: [frontend/src/services/api.js](frontend/src/services/api.js)
- Frontend auth context: [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)
