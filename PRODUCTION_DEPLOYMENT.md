# Production Deployment

This repository is structured as a production-oriented monorepo:

```text
adaptive-rag-platform/
  frontend/            # React/Vite frontend for Railway
  backend/             # FastAPI backend for Railway
    documind_rag/
      app/
        controllers/   # HTTP controllers
        core/          # configuration and dependencies
        schemas.py     # Pydantic request/response models
      rag/             # RAG pipeline, services, retrieval, evaluation
```

## Backend on Railway

Create a Railway service with root directory:

```text
backend
```

Set variables in Railway:

```env
GROQ_API_KEY=your_new_groq_key
DATABASE_URL=${{ Postgres.DATABASE_URL }}
JWT_SECRET_KEY=generate_a_long_random_secret
FRONTEND_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
DOCUMIND_AUTO_BUILD=false
DOCUMIND_PDF_PATHS=
```

Railway uses:

- `backend/railway.json`
- `backend/nixpacks.toml`
- `backend/requirements.txt`
- `backend/Procfile`

Healthcheck:

```http
GET /health
```

## Frontend

Create a separate Railway service with root directory:

```text
frontend
```

Set the backend URL:

```env
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app
```

The frontend calls:

- `POST /chats/{chat_id}/sources`
- `POST /ask`
- `POST /exam`
- `GET /health`

## Notes

- Secrets must stay in Railway variables or local `.env` files.
- `.env`, uploads, cache files, and compiled Python bytecode are ignored by git.
- The backend app imports without loading ML models; models load lazily when the first document is indexed.
