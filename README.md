# ExamGen AI

Generate exam papers from your own study material, take them under timed conditions and analyse the results.

## Architecture

```
React (Vite, Tailwind)  --REST + JWT-->  Express API  -->  MongoDB
      client/                              server/   \-->  OpenAI-compatible LLM API
```

| Server folder | Responsibility |
|---|---|
| `routes/`, `controllers/` | REST endpoints, ownership checks |
| `services/` | document parsing, generation, evaluation, LLM client, demo bank |
| `utils/` | validation, question schema, grounding and scoring (dependency-free, unit tested) |
| `models/` | `User`, `Material`, `Paper`, `Attempt` |
| `middleware/`, `config/` | auth, upload limits, errors, environment |

**Generation pipeline:** extract text → select relevant chunks → request JSON in batches of 8 → validate each question → check its source quote exists in the material → drop duplicates → request replacements. If the requested count can't be met, the request fails. It never pads with sample questions.

**Exam integrity:** answers and explanations are not sent while an attempt is running. The deadline is enforced by the server (15 s network grace). Autosaves carry a revision number, submission is claimed atomically, and each attempt stores a snapshot of the paper. An expired attempt is graded the next time it is accessed (there is no background job). The paper owner can view the answer key in Preview, so this is a practice tool, not a proctored exam system.

## Local setup

Needs Node.js 20+ and MongoDB (local or Atlas).

```bash
cd server
cp .env.example .env      # set JWT_SECRET and MONGODB_URI
npm install
npm test
npm run dev               # http://localhost:5000
```
```bash
cd client                 # second terminal
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```
Commit the generated `package-lock.json` files, and run `npm audit` in both folders.

## AI and demo mode

- **Demo mode** (no `AI_API_KEY`, or `DEMO_MODE=true`): serves a fixed bank of 18 labelled computer science questions. It ignores uploads, subject and topic. There are only 3–6 samples per type, so large or single-type papers are refused. Short answers are self-graded.
- **AI mode:** set `AI_API_KEY`, `AI_MODEL` and, for providers other than OpenAI, `AI_BASE_URL`. The provider must offer an OpenAI-compatible `/chat/completions` endpoint. If it rejects `response_format`, set `AI_JSON_MODE=false`. A failed AI call shows an error and never falls back to samples.

Study text and short answers are sent to your AI provider, so check its data policy. Usage may cost money.

## API (prefix `/api`)

All routes except health, signup and login need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` (logout is client-side) |
| Profile | `PATCH /users/me`, `PUT /users/me/password` |
| Files | `GET, POST /materials`, `GET, DELETE /materials/:id` |
| Papers | `GET /patterns`, `GET, POST /papers`, `GET, PATCH, DELETE /papers/:id`, `POST /papers/:id/regenerate`, `PUT /papers/:id/questions/:qid`, `POST /papers/:id/questions/:qid/regenerate` |
| Attempts | `GET, POST /attempts`, `GET /attempts/:id`, `PUT /attempts/:id/progress`, `POST /attempts/:id/submit` |
| Grading | `POST /attempts/:id/questions/:qid/regrade`, `.../self-grade` |
| Dashboard | `GET /stats` |

## Deployment

1. **MongoDB Atlas:** create a cluster and database user. Under Network Access, allow your Render service's outbound IP ranges. `0.0.0.0/0` also works but opens access to any address, so use a strong password. Copy the connection string and add the database name (`/examgen`).
2. **Push to GitHub.**
3. **Render:** New → Blueprint, choose the repository (`render.yaml`). Enter `MONGODB_URI`, `CLIENT_ORIGIN`, and optionally the AI values (leave empty for demo mode). Check `/api/health`.
4. **Netlify:** import the repository (`netlify.toml`). Set `VITE_API_URL=https://YOUR-API.onrender.com/api` before building.
5. Set Render's `CLIENT_ORIGIN` to your exact Netlify URL (no trailing slash) and redeploy.

Check current plan limits with each provider. Free web services may sleep when idle, making the first request slow.

## Security notes and known limitations

- bcrypt password hashes, rate limits, Helmet, CORS allow-list, per-user ownership checks, upload type/size/signature checks. Original files are not kept.
- The JWT is kept in `localStorage` (the frontend and API are on different domains). An XSS bug could expose it. For a real product, consider same-site HTTP-only cookies.
- There is no email verification or password reset.
- Source-quote checking proves a passage exists. It does **not** prove the question or answer is correct, or that the passage supports it. Review AI output before relying on it.
- Prompt instructions reduce, but cannot eliminate, prompt injection from documents or answers.
- Duplicate detection is based on wording, so reworded duplicates can slip through.
- Retrieval is keyword based. Topic words must appear in the material. Very long documents are sampled, not fully covered.
- Exam presets are simplified practice styles with one marks value per paper. They don't reproduce official section rules or mixed 1/2-mark schemes. Check current official notices.
- Multiple select has no partial marking. Scanned PDFs, images and equations in documents are not read.
- Generation runs inside one HTTP request. Very large papers may time out on some hosts; a job queue would fix this.
- Rate limits are per server instance. A public deployment also needs per-user AI quotas.
- Direct PDF download uses jsPDF's Latin fonts. Use Print → Save as PDF for other scripts and maths symbols.
