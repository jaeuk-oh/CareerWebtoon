# CareerCraft

A career document (resume/cover letter) generation tool. React + Vite frontend, FastAPI backend powered by the NVIDIA API Catalog.

## Run Locally

**Prerequisites:** Node.js, Python 3.11+

### Frontend

```
npm install
npm run dev
```

### Backend

```
cd backend
pip install -r ../requirements.txt
cp .env.example .env   # fill in NVIDIA_API_KEY, SUPABASE_*, etc.
uvicorn app.main:app --reload
```

The Vite dev server proxies `/api` requests to the backend at `http://127.0.0.1:8000`.
