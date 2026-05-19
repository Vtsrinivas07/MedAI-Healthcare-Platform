# MedAI Healthcare Platform

MedAI is a full-stack healthcare platform built around a FastAPI backend, a Vite + React frontend, and a medical AI layer for chat, image-based diagnosis, reminders, consultations, prescriptions, lab tests, pharmacy flows, and role-aware dashboards.

## What’s Inside

- [backend/](backend/) contains the API, domain routers, middleware, configuration, schedulers, and model services.
- [frontend/](frontend/) contains the React UI and page-level workflows for patients, doctors, and admins.
- [models/](models/) stores trained checkpoints and shared model assets.
- [medical_docs/](medical_docs/) contains retrieval content used by the medical guidance and RAG flows.
- [scripts/](scripts/) contains data, model, and verification helpers.
- [setup_models.bat](setup_models.bat) and [setup_models.sh](setup_models.sh) provide quick model setup entry points.

## Platform Overview

MedAI is organized as a single product with several coordinated workflows:

- Patient-facing flows for chat, health tracking, medicines, lab tests, consultations, orders, and prescriptions.
- Doctor-facing flows for dashboards, patient management, consultations, appointments, prescriptions, and settings.
- Admin-facing flows for user management, roles, analytics, settings, and doctor onboarding.
- AI services for chat, document parsing, symptom guidance, and medical image diagnosis.
- Model-backed image classification for supported modalities such as skin, chest, eye/OCT, and brain/organ-based images.

## Key Features

- Authentication with JWT and Google OAuth.
- Role-based route protection for patients, doctors, and admins.
- AI chat and symptom guidance with optional retrieval augmentation.
- Medical image diagnosis using stored weights and modality-specific pipelines.
- Health logs, analytics, reminders, and longitudinal tracking.
- Lab test bookings, prescriptions, product browsing, and order flows.
- Doctor and admin dashboards with operational views.

## Architecture

The backend starts a FastAPI application that connects to MongoDB, optionally connects to Redis, launches the reminder scheduler, applies rate limiting, and includes routers for authentication, chat, health, medicine, admin, doctor, lab tests, products, prescriptions, analysis, diagnosis, orders, and consultations.

The frontend uses React Router, Google OAuth, Tailwind CSS, Framer Motion, and lazy-loaded pages to keep the app responsive while preserving clear separation between public, patient, doctor, and admin routes.

## Requirements

- Python 3.10 or newer.
- Node.js 18 or newer.
- MongoDB.
- Redis for caching and rate limiting support.
- A Google OAuth client for frontend login.

## Backend Setup

1. Create and activate a Python virtual environment.
2. Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

3. Create a backend `.env` file with the required values. Use [backend/config/settings.py](backend/config/settings.py) as the source of truth for the settings the app reads. The backend expects at least:

- `MONGODB_URI`
- `JWT_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

4. Optionally add AI and integration settings depending on the features you want to enable:

- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `HUGGINGFACE_API_KEY`
- `OPENAI_API_KEY`
- `OLLAMA_BASE_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `SENDGRID_API_KEY`
- `GOOGLE_MAPS_API_KEY`

5. Start the backend:

```bash
python main.py
```

The API runs on `http://localhost:8000`. Interactive documentation is available at `http://localhost:8000/docs`.

### Backend Behavior Notes

- The app loads environment variables from `.env`.
- Redis is optional at startup; if it is unavailable, the backend starts with a warning and rate limiting is degraded.
- On Windows, Uvicorn reload is intentionally opt-in through `UVICORN_RELOAD=1` because reloading can double-initialize heavier ML imports.

## Frontend Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Create a frontend `.env` file with:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_URL` if you want to point the UI at a non-default backend URL

3. Start the development server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### Frontend Scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run lint` checks the codebase with ESLint.
- `npm run format` formats the source files with Prettier.

## Model Setup

The repository already includes trained weights under [models/weights/](models/weights/), including modality-specific EfficientNet checkpoints and the symptom text classifier.

If you want to regenerate baseline weights or retrain models:

- Windows: run [setup_models.bat](setup_models.bat)
- macOS/Linux: run [setup_models.sh](setup_models.sh)
- Direct Python option: run [backend/scripts/setup_models_simple.py](backend/scripts/setup_models_simple.py)

The quick setup path creates ImageNet-pretrained baseline classifiers. For stronger medical accuracy, use the MedMNIST training and download scripts in [backend/scripts/](backend/scripts/).

### Supported Model Assets

- [models/weights/efficientnet_skin_disease.pth](models/weights/efficientnet_skin_disease.pth)
- [models/weights/efficientnet_chest_disease.pth](models/weights/efficientnet_chest_disease.pth)
- [models/weights/efficientnet_eye_disease.pth](models/weights/efficientnet_eye_disease.pth)
- [models/weights/efficientnet_brain_disease.pth](models/weights/efficientnet_brain_disease.pth)
- [models/weights/symptom_text_clf.joblib](models/weights/symptom_text_clf.joblib)

## Quick Start

From the repository root:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the frontend in your browser and sign in with a configured Google OAuth client.

## Common URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Backend health check: `http://localhost:8000/api/health-check`

## Project Structure At A Glance

- `backend/main.py` wires the app, middleware, routers, and startup lifecycle.
- `backend/config/` stores database, Redis, and settings configuration.
- `backend/services/` contains the diagnosis, RAG, analytics, scheduler, and AI services.
- `backend/routes/` contains feature-specific API routers.
- `frontend/src/pages/` contains the user-facing screens.
- `frontend/src/components/` contains shared layouts and reusable UI pieces.

## Troubleshooting

- If the backend fails to connect to MongoDB, verify `MONGODB_URI` and that the database is reachable.
- If Redis is unavailable, expect warnings at startup and reduced rate-limiting support.
- If Google login fails, confirm `VITE_GOOGLE_CLIENT_ID` on the frontend and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on the backend.
- If image diagnosis is unavailable, confirm the relevant files exist under [models/weights/](models/weights/).
- If the frontend cannot reach the API, set `VITE_API_URL` to the correct backend base URL.

## Notes

- The backend uses model and service defaults that make local development possible even if some optional integrations are not configured.
- Medical image inference depends on the checkpoint files in [models/weights/](models/weights/).
- The reminder scheduler and several AI features assume a working backend process and configured environment variables.
