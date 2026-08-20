# DocuMind AI - Project Explanation and Expected Q&A

## Purpose of This File

This file is a presentation and defense guide for DocuMind AI. It explains the
project in a clear, academic, and practical way, then lists questions that may
be asked by judges, supervisors, backend reviewers, AI reviewers, or deployment
reviewers.

The focus is especially on:

- The Agent behavior.
- The FastAPI APIs.
- Source-only RAG.
- Hallucination control.
- Persistent indexing.
- Exam generation.
- Production deployment.

---

## 1. Project Short Explanation

DocuMind AI is a production-ready PDF intelligence platform. The user uploads
PDF files inside a chat, and the system answers questions only from these
uploaded PDFs. It does not use outside knowledge as a factual source.

The project is not just a normal chatbot. It is an adaptive RAG system that:

1. Accepts PDF files from the user.
2. Extracts text, tables, and visual information where possible.
3. Builds searchable indexes for the uploaded source.
4. Rewrites the user query for better retrieval.
5. Retrieves the most relevant evidence.
6. Sends only the retrieved evidence to the LLM.
7. Generates an answer with source pages.
8. Checks grounding and hallucination risk.
9. Refuses unsupported questions instead of guessing.
10. Can generate exams from the uploaded source.

The key idea is trust. The answer should be connected to evidence in the PDF,
not generated freely from model memory.

---

## 2. One-Minute Pitch

DocuMind AI is an adaptive multimodal RAG platform for academic PDFs. Students,
doctors, teaching assistants, and researchers can upload source PDFs, ask
questions, and generate exams from the same source. The system is designed to
answer only from the uploaded documents. If the evidence is not available, it
refuses politely and recommends consulting a doctor or a qualified specialist
depending on the field. The platform includes authentication, chat-scoped
document memory, persistent uploaded sources, FastAPI endpoints, React frontend,
PostgreSQL storage, Groq LLM integration, query rewriting, hybrid retrieval,
hallucination scoring, and production deployment on Railway.

---

## 3. System Architecture

```text
User
  |
  v
React Frontend
  |
  | HTTPS / JSON / Multipart Upload
  v
FastAPI Backend
  |
  +--> Auth Layer
  |      - Signup
  |      - Login
  |      - JWT validation
  |
  +--> Document API
  |      - Upload PDFs
  |      - Persist original PDFs
  |      - Build runtime indexes
  |
  +--> Agent / RAG Manager
  |      - Chat isolation
  |      - Query rewriting
  |      - Retrieval
  |      - Generation
  |      - Grounding verification
  |      - Refusal policy
  |      - Exam generation
  |
  +--> Database Layer
  |      - Users
  |      - Uploaded document sources
  |
  v
PostgreSQL + Runtime Vector/Search Indexes
```

---

## 4. What Is the Agent in This Project?

The Agent is the decision and orchestration layer that controls the AI flow. It
is not only a prompt sent to an LLM. In this project, the agent behavior is
implemented mainly through the `ChatRagManager`, `RagService`, and the RAG
pipeline modules.

The Agent is responsible for:

- Managing each chat as an isolated workspace.
- Remembering recent conversation messages only for reference resolution.
- Making sure memory is not used as factual evidence.
- Building and selecting the correct RAG index for the current chat.
- Rewriting the user query into retrieval-friendly search queries.
- Retrieving relevant chunks from the uploaded PDFs.
- Passing evidence to the LLM.
- Generating grounded answers.
- Detecting weak or missing evidence.
- Measuring hallucination risk and groundedness.
- Refusing to answer when the source is insufficient.
- Generating exams using the same source-only behavior.

So if we are asked, "Where is the Agent?", the answer is:

The Agent is implemented as an orchestration layer in the backend, mainly inside
`ChatRagManager`, `RagService`, and the RAG pipeline. It coordinates tools such
as retrieval, query rewriting, memory, LLM generation, citation verification,
and refusal logic.

---

## 5. Agent Flow

```text
User Question
  |
  v
ChatRagManager
  |
  +--> Add bounded memory for references only
  |
  v
RagService.ask()
  |
  +--> Check if source index is ready
  |
  v
RAG Pipeline
  |
  +--> Detect language
  +--> Classify query type
  +--> Extract filters
  +--> Rewrite query
  +--> Retrieve evidence
  +--> Rerank results
  +--> Build context
  +--> Generate answer
  +--> Extract claims
  +--> Verify citations
  |
  v
Safety Layer
  |
  +--> If no evidence: refuse
  +--> If hallucination risk is high: refuse
  |
  v
Structured API Response
```

---

## 6. Why This Is More Than a Normal RAG

Normal RAG usually retrieves chunks and asks the LLM to answer. DocuMind AI adds
extra production and academic features:

- Query rewriting before retrieval.
- Hybrid search using dense and keyword-based retrieval.
- Chat-scoped indexes.
- Bounded memory per chat.
- Source-only refusal behavior.
- Hallucination risk score.
- Groundedness score.
- Citation and claim verification.
- Persistent uploaded sources so PDFs can be rebuilt after restart.
- Exam generation API for doctors and teaching assistants.
- Structured Pydantic responses for frontend and external API consumers.

---

## 7. API Architecture

The backend is built with FastAPI. The API is structured around controllers,
schemas, services, repositories, and models.

```text
FastAPI App
  |
  +--> Controllers
  |      - auth_controller.py
  |      - document_controller.py
  |      - assistant_controller.py
  |      - exam_controller.py
  |      - health_controller.py
  |
  +--> Schemas
  |      - Pydantic request/response models
  |
  +--> Services
  |      - Auth service
  |      - RAG service
  |
  +--> Repositories
  |      - User repository
  |      - Document source repository
  |
  +--> Models
         - User
         - DocumentSource
```

This structure makes the system easier to maintain because API routing,
business logic, database logic, and AI logic are separated.

---

## 8. Main APIs

### 8.1 Authentication APIs

Used for user accounts and secure access.

Expected endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`

Purpose:

- Create account.
- Login and receive bearer token.
- Identify the current user.

Why this matters:

- Each user's uploaded PDFs should be private.
- Chat data and sources should be linked to the authenticated user.
- Production APIs should not be open without identity.

---

### 8.2 Document Upload API

Endpoint:

```http
POST /chats/{chat_id}/sources
```

Input:

- Multipart PDF files.
- JWT bearer token.
- Chat ID.

What it does:

1. Validates that uploaded files are PDFs.
2. Saves the files temporarily for indexing.
3. Builds the RAG knowledge base.
4. Builds runtime indexes.
5. Persists the original PDF bytes in the database.
6. Returns indexing status.

Response shape:

```json
{
  "documents": {},
  "chunk_count": 120,
  "ready": true
}
```

Why this API is important:

- Every chat has its own source.
- The LLM cannot answer before source upload.
- The source is persisted so it can be rebuilt after server restart.

---

### 8.3 Build Index API

Endpoint:

```http
POST /build
```

Purpose:

Build indexes from PDF paths visible to the backend.

This is useful for backend/internal workflows, while `/chats/{chat_id}/sources`
is the main user-facing upload endpoint.

---

### 8.4 Ask API

Endpoint:

```http
POST /ask
```

Request:

```json
{
  "query": "اشرح النقطة دي من الملف",
  "chat_id": "chat-123",
  "document_ids": null,
  "verbose": false,
  "use_memory": true
}
```

Response:

```json
{
  "answer": "الإجابة من المصدر...",
  "query": {
    "original": "اشرح النقطة دي من الملف",
    "rewritten": "retrieval friendly query",
    "language": "ar",
    "query_type": "factual_text",
    "filters": {
      "page": null,
      "type_hint": null
    },
    "search_queries": []
  },
  "confidence": 0.82,
  "hallucination_risk": 0.0,
  "groundedness_score": 1.0,
  "unsupported_claims": 0,
  "sources": [3, 4],
  "evidence": [],
  "claims": [],
  "sub_questions": [],
  "raw": {}
}
```

What happens internally:

1. The API validates the request using Pydantic.
2. It checks the authenticated user.
3. It calls `ChatRagManager.ask()`.
4. The manager adds recent memory only for resolving references.
5. `RagService.ask()` checks that indexes exist.
6. The RAG pipeline retrieves evidence from the uploaded source.
7. The LLM generates the answer.
8. The service calculates hallucination risk and groundedness.
9. If unsupported, it refuses instead of guessing.

---

### 8.5 Chat Memory API

Endpoint:

```http
GET /chats/{chat_id}/memory
```

Purpose:

Return bounded memory for the chat.

Important point:

Memory is used only to understand references such as "explain the previous
point" or "continue from that answer". It is not treated as a factual source.
The PDF remains the only factual source.

---

### 8.6 Exam API

Endpoint:

```http
POST /exam
```

Request:

```json
{
  "chat_id": "chat-123",
  "topic": "Chapter 2",
  "difficulty": "medium",
  "question_count": 10,
  "total_marks": 100,
  "question_types": ["mcq", "short_answer", "essay"],
  "language": "ar"
}
```

Response:

```json
{
  "title": "Source-grounded exam",
  "questions": [
    {
      "type": "mcq",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Based on page 5",
      "page": 5,
      "section": "Topic section"
    }
  ],
  "confidence": 0.88,
  "hallucination_risk": 0.0,
  "groundedness_score": 1.0,
  "sources": [5],
  "evidence": [],
  "raw": {}
}
```

Why this API is strong:

- It turns the system from a Q&A chatbot into an educational assistant.
- Doctors and teaching assistants can generate exams from their own material.
- The questions are still grounded in the uploaded source.
- Output is structured JSON, which is easy for the frontend to render or export.

---

### 8.7 Health API

Purpose:

Used by Railway or monitoring systems to check if the backend is running.

Expected response includes:

- Whether the service is ready.
- Number of documents.
- Number of chunks.

---

## 9. Pydantic Schemas

Pydantic is used because production APIs need stable request and response
contracts.

Main schemas:

- `AskRequest`
- `AskResponse`
- `ExamRequest`
- `ExamResponse`
- `BuildRequest`
- `BuildResponse`
- `AuthSignupRequest`
- `AuthLoginRequest`
- `AuthResponse`
- `EvidenceItem`
- `ClaimItem`
- `QueryMetadata`

Why this matters:

- The frontend knows exactly what shape to expect.
- Backend validation happens before business logic.
- API documentation is automatically generated by FastAPI.
- It reduces integration bugs between backend and frontend.

---

## 10. Query Rewriting

Query rewriting improves retrieval quality. User questions are often vague,
short, conversational, or in Arabic. The retrieval system needs a clearer query.

Example:

Original:

```text
اشرح الجدول اللي في صفحة 5
```

Rewritten:

```text
اشرح الجدول اللي في صفحة 5 page 5 table
```

The rewrite module returns:

- Original query.
- Rewritten query.
- Language.
- Query type.
- Filters such as page number.
- Alternative search queries.

Why this matters:

- Better retrieval.
- Better handling of Arabic and English.
- Better support for page-specific questions.
- Better retrieval for tables, charts, diagrams, and summaries.

---

## 11. Source-Only Policy

The system must not answer from outside the uploaded PDF.

If evidence is missing, the answer should be:

```text
المصدر المرفوع لا يحتوي على معلومات كافية لدعم إجابة موثوقة.
لو السؤال طبي فالأفضل استشارة طبيب، ولو في مجال آخر فاستشر متخصصًا مؤهلًا
في نفس المجال أو ارفع مصدرًا أوضح.
```

This is better than saying:

```text
أنا لا أعرف.
```

Because it is more professional, domain-aware, and safe.

---

## 12. Hallucination Risk and Groundedness

The system returns:

- `hallucination_risk`
- `groundedness_score`
- `unsupported_claims`
- `claims`
- `sources`
- `evidence`

Meaning:

- `hallucination_risk`: estimated probability that the answer contains claims
  not supported by the uploaded source.
- `groundedness_score`: how strongly the answer is supported by retrieved
  evidence.
- `unsupported_claims`: number of generated claims that failed verification.

If hallucination risk is high, the system refuses the answer.

This is important because in education and medicine, a fluent wrong answer can
be dangerous.

---

## 13. Persistent Indexing

Runtime indexes like FAISS and BM25 may disappear after server restart because
they live in memory. To solve this, the project persists the original uploaded
PDF files in the database.

Flow:

```text
User uploads PDF
  |
  +--> Build runtime index
  |
  +--> Save original PDF bytes in database

Server restarts
  |
  +--> Runtime index is missing
  |
  +--> API detects missing index
  |
  +--> Rebuilds index from persisted PDFs
  |
  +--> Continues answering
```

Why this matters:

- Railway containers can restart.
- In-memory indexes are not enough for production.
- Users should not lose their uploaded source after deployment or restart.

---

## 14. Database Role

The database is used for:

- User accounts.
- Authentication-related user data.
- Persisted uploaded PDF sources.
- Linking uploaded sources to user ID and chat ID.

This makes the project production-oriented rather than demo-only.

---

## 15. Frontend Role

The frontend is a React and TypeScript application. It provides:

- Landing page.
- Authentication screens.
- Chat interface.
- PDF upload.
- Source-grounded answers.
- Source/evidence display.
- Exam generation UI.
- Voice input using browser speech recognition where supported.
- Responsive mobile layout.
- Dark/light mode and language toggle.

The frontend calls the FastAPI backend through structured API services.

---

## 16. Deployment Architecture

```text
GitHub Repository
  |
  v
Railway Deployment
  |
  v
Docker Build
  |
  +--> Build React frontend
  +--> Install Python backend dependencies
  +--> Install OCR/runtime dependencies
  +--> Run FastAPI with Uvicorn
  |
  v
Production URL
```

Important environment variables:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `DOCUMIND_LOW_MEMORY`
- `DOCUMIND_MAX_ANSWER_TOKENS`

The Groq API key should be stored only as an environment variable. It should not
be committed in the repository.

---

## 17. Questions and Answers

### Q1. What problem does DocuMind AI solve?

It solves the problem of unreliable PDF question answering. Many systems answer
from model memory and may hallucinate. DocuMind AI forces the answer to be
grounded in the uploaded PDFs and refuses when evidence is missing.

### Q2. What makes your project different from ChatGPT with file upload?

Our project is a controllable production system with our own APIs, database,
authentication, chat-scoped sources, persistent PDF storage, source-only
refusal, hallucination scoring, and an exam generation workflow. It can be
integrated with a backend and frontend as a product, not only used as a chat
tool.

### Q3. Where is the Agent in the architecture?

The Agent is the backend orchestration layer. It is mainly represented by
`ChatRagManager`, `RagService`, and the RAG pipeline. It manages memory,
retrieval, generation, verification, refusal, and exam generation.

### Q4. Is the Agent an autonomous agent?

It is not a fully open-ended autonomous agent that browses the internet or takes
uncontrolled actions. It is a controlled task-specific agent. Its tools are
limited to the uploaded source, retrieval indexes, LLM generation, verification,
and structured APIs.

### Q5. Why did you choose a controlled agent instead of an open autonomous agent?

Because the project needs trust and safety. In academic and medical contexts,
the agent must not search outside the uploaded source or invent information. A
controlled agent is safer and easier to evaluate.

### Q6. What are the Agent tools?

The agent uses these internal tools:

- Query rewriting.
- Language detection.
- Query classification.
- Dense retrieval.
- BM25 retrieval.
- Table retrieval.
- Visual retrieval where available.
- Reranking.
- Context building.
- LLM generation.
- Claim extraction.
- Citation verification.
- Hallucination scoring.
- Refusal policy.
- Exam JSON generation.

### Q7. Does the Agent use the internet?

No. The factual source is only the uploaded PDF. The LLM may have general
language ability, but the prompt and safety layer constrain it to use retrieved
PDF evidence only.

### Q8. How do you prevent hallucination?

We prevent hallucination using multiple layers:

1. Retrieve evidence from the uploaded PDF.
2. Generate answers from the retrieved context.
3. Extract claims and verify support.
4. Calculate hallucination risk.
5. Return source pages and evidence.
6. Refuse when evidence is missing or risk is high.

### Q9. What happens if the user asks something outside the PDF?

The system refuses politely. In Arabic, it says the uploaded source does not
contain enough evidence and recommends consulting a doctor for medical questions
or a qualified specialist for other fields.

### Q10. Why not just answer "I do not know"?

Because the product should sound professional and helpful. The refusal explains
why the answer cannot be given and guides the user to upload a clearer source or
consult a specialist.

### Q11. What is query rewriting and why is it important?

Query rewriting converts the user's natural question into a better retrieval
query. It can add hints like page numbers, table/chart keywords, or alternative
search queries. This improves retrieval quality before the LLM generates an
answer.

### Q12. Does query rewriting change the user's meaning?

It should not change the meaning. It only makes the query more searchable. The
original query is still preserved in the API response.

### Q13. What is hybrid retrieval?

Hybrid retrieval combines semantic search and keyword search. Semantic search
finds meaning-similar chunks, while BM25 keyword search catches exact terms,
numbers, definitions, and page-specific matches.

### Q14. Why use FAISS?

FAISS is fast for local vector similarity search. It is suitable for a hackathon
and for runtime indexing of uploaded PDFs. For larger production scale, we can
migrate to pgvector, Qdrant, Pinecone, Weaviate, or another persistent vector
database.

### Q15. Will FAISS lose data after restart?

The runtime FAISS index can be lost after restart. That is why the project
persists original PDF bytes in the database and rebuilds the index when needed.

### Q16. Why not store only the vector index?

Storing the original PDF is more reliable because indexes can be rebuilt after
code changes, model changes, chunking changes, or deployment restarts. A future
version can store both PDFs and persistent vector indexes.

### Q17. How does persistent indexing work?

When the user uploads PDFs, the system stores the original PDF bytes in the
database. If the server restarts and the chat index is missing, the backend
rebuilds the index from those persisted PDFs.

### Q18. What is the role of PostgreSQL?

PostgreSQL stores users and uploaded document sources. It supports production
authentication and source persistence.

### Q19. Is every chat isolated?

Yes. Each chat can have its own uploaded source and its own runtime RAG service.
This prevents one chat's PDFs from leaking into another chat.

### Q20. How is memory handled?

The chat manager stores a bounded number of recent messages. Memory is used only
to understand references in the conversation. It is not used as factual source
evidence.

### Q21. Why is bounded memory important?

It controls token usage, reduces privacy risk, and prevents old conversation
content from dominating the current answer.

### Q22. Can the LLM answer from memory?

The design says no. Memory can clarify the question, but the final answer must
be supported by uploaded PDF evidence.

### Q23. What LLM provider is used?

The project is configured to use Groq through an environment variable. The key
must be stored in `.env` locally or Railway variables in production.

### Q24. Why use Groq?

Groq is fast and suitable for low-latency LLM generation. This helps the app
feel responsive during chat and exam generation.

### Q25. Is the Groq API key enough to run the whole project?

No. The backend also needs other production variables such as database URL and
JWT secret. The Groq key powers the LLM, but auth and persistence need database
and security configuration.

### Q26. What are the most important APIs?

The most important APIs are:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /chats/{chat_id}/sources`
- `POST /ask`
- `GET /chats/{chat_id}/memory`
- `POST /exam`
- Health endpoint for deployment monitoring.

### Q27. Why use FastAPI?

FastAPI is fast, typed, production-friendly, and integrates naturally with
Pydantic schemas. It also generates API docs automatically.

### Q28. Why use Pydantic?

Pydantic validates request and response data. This makes frontend-backend
integration safer and gives predictable API contracts.

### Q29. What is the response shape of the Ask API?

The response includes answer, query metadata, confidence, hallucination risk,
groundedness score, unsupported claims, source pages, evidence items, claims,
sub-questions, and raw debug data.

### Q30. Why return hallucination risk to the frontend?

Because the frontend can communicate answer reliability to the user. It also
makes the system more transparent for academic evaluation.

### Q31. What is the Exam API?

The Exam API generates structured questions from the uploaded PDF only. It
supports topic, difficulty, question count, total marks, question types, and
language.

### Q32. How can doctors use the system?

A doctor or university instructor can upload lecture notes or a chapter, then
ask the system to generate an exam with a specific difficulty, number of
questions, and question types. The output includes answers, explanations, and
source pages.

### Q33. How do you make sure exam questions are from the PDF?

The exam generation goes through the same RAG flow. It retrieves evidence from
the uploaded source, asks the LLM to output strict JSON, and adjusts grounding
scores based on source pages.

### Q34. What happens if the Exam API returns invalid JSON?

The backend detects invalid JSON and returns a controlled API error instead of
sending broken data to the frontend.

### Q35. Why is structured JSON important for exams?

Because the frontend can render questions cleanly, export them later, calculate
marks, or transform them into printable formats.

### Q36. Does the system support Arabic?

Yes. It detects Arabic characters, supports Arabic refusals, and can generate
Arabic exams. Query rewriting also adds bilingual hints for better retrieval.

### Q37. Does the system support English?

Yes. The same APIs support English questions and English exam generation.

### Q38. How does the frontend connect to the backend?

The frontend sends HTTP requests to FastAPI endpoints using JSON or multipart
form uploads. It stores the auth token and passes it as a bearer token for
protected endpoints.

### Q39. Is the frontend responsive?

Yes. It is designed for desktop and mobile, including mobile-friendly cards,
horizontal movement for some card sections, dark/light mode, and language
toggle.

### Q40. Does voice recognition work?

Voice recognition can work using the browser Web Speech API where supported.
This is mainly a frontend capability. Browser support may vary, especially on
mobile and different browsers.

### Q41. Is voice recognition part of the AI backend?

No. In the current design, voice input converts speech to text in the browser,
then sends the text question to the existing Ask API.

### Q42. How would you improve voice recognition in production?

We can add a backend speech-to-text API using Whisper or another speech model.
That would support more browsers and provide more consistent Arabic handling.

### Q43. What is the deployment platform?

The project is prepared for Railway deployment using Docker.

### Q44. Why Docker?

Docker gives a consistent production environment. It installs backend
dependencies, builds the frontend, and runs the FastAPI server in one
deployment unit.

### Q45. What caused the earlier `uvicorn: command not found` issue?

That usually happens when dependencies are not installed in the production
container or the start command runs outside the correct environment. The fix is
to ensure the Dockerfile installs backend requirements and starts Uvicorn from
the installed Python environment.

### Q46. What caused memory issues on the server?

RAG systems can use memory for PDF parsing, embeddings, FAISS indexes, OCR, and
LLM context preparation. Low-memory deployment needs smaller models, lower token
budgets, careful indexing, and possibly background jobs or external vector
storage.

### Q47. How did you address memory issues?

The project supports low-memory configuration and limits answer tokens. It also
persists PDFs so indexes can be rebuilt. Future improvements can move embeddings
and vectors to external services.

### Q48. What are the main environment variables?

Important variables include:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `DOCUMIND_LOW_MEMORY`
- `DOCUMIND_MAX_ANSWER_TOKENS`

### Q49. Should API keys be committed to GitHub?

No. API keys must be stored in environment variables. Committing secrets to
GitHub is unsafe.

### Q50. What is MVC in your backend?

The backend follows a clean layered structure similar to MVC:

- Controllers handle HTTP requests.
- Schemas define request and response contracts.
- Services contain business logic.
- Repositories handle database access.
- Models represent database tables.
- RAG modules contain AI pipeline logic.

### Q51. Why separate controllers, services, and repositories?

Separation makes the code easier to test, maintain, and extend. It also makes
the project look more production-ready for evaluation.

### Q52. What is the strongest part of the project?

The strongest part is that it combines product features and AI safety: source
upload, chat, exam generation, persistent PDF sources, authentication,
hallucination scoring, and source-only refusal.

### Q53. What is the weakest or unfinished part?

The current runtime vector index is not yet a full persistent vector database.
It can be rebuilt from persisted PDFs, but future production scale should use
pgvector, Qdrant, Pinecone, Weaviate, or another persistent vector store.

### Q54. What would you improve next?

Main future improvements:

- Persistent vector database.
- Background indexing queue.
- Better OCR pipeline.
- Admin dashboard.
- Export exams as PDF or DOCX.
- Better evaluation dataset.
- Automated hallucination tests.
- Backend speech-to-text.
- Multi-role accounts for students and instructors.

### Q55. How do you evaluate answer quality?

We evaluate by checking:

- Retrieval relevance.
- Citation correctness.
- Groundedness.
- Hallucination risk.
- Refusal accuracy.
- User-facing answer quality.
- Latency and memory usage.

### Q56. What is refusal accuracy?

Refusal accuracy measures whether the system refuses only when the source does
not support an answer, and answers when the source does contain enough evidence.

### Q57. What is citation correctness?

Citation correctness means the cited page actually contains evidence supporting
the answer.

### Q58. How do you handle medical questions?

The system answers only if the uploaded source contains evidence. If not, it
does not guess and recommends consulting a doctor.

### Q59. Is the system safe for medical use?

It is safer than a general chatbot because it is source-grounded and refuses
unsupported answers. However, it should be used as an educational assistant, not
as a replacement for professional medical judgment.

### Q60. Can the system be used by universities?

Yes. Universities can use it for lecture-based Q&A, exam generation, study
support, and source-grounded academic assistance.

### Q61. Can it support multiple PDFs?

Yes. The upload API accepts one or more PDF files and builds a knowledge base
from them for the chat.

### Q62. What happens if the uploaded file is not PDF?

The backend rejects it with a validation error because only PDF files are
supported.

### Q63. Can two users access each other's PDFs?

The design links uploaded sources to authenticated users and chat IDs. The goal
is to isolate user data and prevent cross-user access.

### Q64. Why return raw data in the API?

The `raw` field can help during debugging and development. In a stricter
production version, raw details can be limited or hidden from normal users.

### Q65. Why include confidence?

Confidence gives the frontend and user an estimate of reliability. It should be
interpreted together with groundedness and hallucination risk.

### Q66. What is the difference between confidence and groundedness?

Confidence is a general reliability estimate. Groundedness specifically
measures whether the answer is supported by the retrieved PDF evidence.

### Q67. Can the system summarize a PDF?

Yes, if the summary is based on retrieved or processed content from the uploaded
PDF. For long summaries, hierarchical summarization can be used.

### Q68. Can the system answer questions about tables and charts?

The system includes table and visual-oriented pipeline components. Its quality
depends on the PDF quality, extraction quality, and available OCR/visual
processing.

### Q69. What if the PDF is scanned?

Scanned PDFs require OCR. The project includes OCR-related dependencies and
pipeline functions, but scanned PDF quality can affect accuracy.

### Q70. How does the system know the language?

It detects Arabic characters and uses pipeline language detection. The response
and refusal behavior can then match Arabic or English.

### Q71. Why use React and TypeScript?

React supports a rich interactive UI, and TypeScript reduces frontend bugs by
adding static types.

### Q72. Why use Railway?

Railway is simple for full-stack deployment, supports Docker, environment
variables, logs, and managed databases.

### Q73. Can the backend be deployed separately from the frontend?

Yes. The architecture can serve both together or split them into separate
frontend and backend deployments.

### Q74. What is the API integration story?

Any frontend, mobile app, or external backend can call the FastAPI endpoints
using bearer authentication. The response schemas are stable and documented.

### Q75. What would you say if asked for the full flow in 20 seconds?

The user logs in, uploads PDFs into a chat, the backend persists the source and
builds indexes, the agent rewrites the query, retrieves evidence, asks the LLM
to answer only from that evidence, verifies support, returns answer with
sources and hallucination risk, and refuses if the PDF does not support the
answer.

---

## 18. Strong Defense Points

Use these points in the presentation:

- We are not building a generic chatbot; we are building source-grounded PDF
  intelligence.
- The Agent is controlled and safe, not open-ended.
- The LLM is not the source of truth; the uploaded PDF is the source of truth.
- The API returns structured metadata, not only plain text.
- Hallucination is handled as a product feature, not ignored.
- Exam generation makes the system useful for universities and doctors.
- Persistent PDF storage solves restart issues in cloud deployment.
- The backend has production-oriented layering: controllers, schemas, services,
  repositories, models, and AI modules.

---

## 19. If Asked About Limitations

Answer honestly:

The current system is strong for a hackathon and early production prototype,
but it can be improved. The biggest future improvements are persistent vector
storage, background indexing, stronger OCR, more evaluation tests, and better
monitoring. We already designed the architecture so these improvements can be
added without rewriting the whole project.

---

## 20. Final Closing Answer

DocuMind AI is designed around one principle: the uploaded source is the truth.
The Agent does not freely invent answers. It retrieves, verifies, cites, scores,
and refuses when needed. This makes the project suitable for academic and
educational environments where trust, traceability, and structured APIs matter.
