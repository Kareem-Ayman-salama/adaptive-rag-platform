# DocuMind AI

Production-oriented adaptive multimodal RAG platform for PDF question answering,
evidence grounding, hallucination checks, and exam generation.

## Structure

```text
adaptive-rag-platform/
  frontend/            # React + Vite frontend deployable on Railway
  backend/             # FastAPI backend deployable on Railway
    documind_rag/
      app/
        controllers/   # HTTP controllers
        core/          # configuration and dependencies
        schemas.py     # Pydantic models
      rag/             # RAG pipeline and services
```

## Backend

```powershell
cd backend
pip install -r requirements.txt
uvicorn documind_rag.app.main:app --reload
```

Required environment variables:

```env
GROQ_API_KEY=your_new_groq_key
DATABASE_URL=sqlite:///./documind.db
JWT_SECRET_KEY=change-this-secret
FRONTEND_ORIGINS=http://localhost:5173
DOCUMIND_AUTO_BUILD=false
DOCUMIND_LOW_MEMORY=true
DOCUMIND_MAX_ANSWER_TOKENS=2500
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend environment:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Production

Railway backend root directory:

```text
backend
```

Railway frontend root directory:

```text
frontend
```

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md).
