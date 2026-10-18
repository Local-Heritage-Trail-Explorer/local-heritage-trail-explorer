# Member 8 — Historical RAG Chatbot Integration Guide

This document defines the integration specification, file ownership, service signatures, and CLI usage for **Member 8: Historical RAG Chatbot** (Ollama + LangChain.js) within the **Local Heritage Trail Explorer** repository.

---

## 1. Files Owned and Maintained by Member 8

### Core Service & Configuration Files
- `server/config/ollama.js`: Ollama configuration and environment variable parsing.
- `server/services/llm.service.js`: LangChain.js integration (`ChatOllama`), timeout/connection error classification, and testing mock hooks.
- `server/services/generate-chat-answer.service.js`: Source-grounded RAG answer synthesis, prompt defense, multi-turn history sanitization, and citation validation.
- `server/api/chat.router.js`: Express router handling `POST /api/chat` and `GET /api/chat/status`, CSRF protection, and retriever adapter.

### Terminal CLI & Verification Scripts
- `server/tests/chat-cli.js`: Standalone interactive terminal chatbot (runs with zero browser or Express dependency).

### Test Suites
- `server/tests/rag.test.js`: 16 Vitest unit tests covering grounded answering, citations, malformed JSON, and prompt defense.
- `server/tests/chat-api.test.js`: 8 Supertest integration tests covering CSRF, routing, input validation, and HTTP status codes.

### Supporting Frontend & Documentation
- `client/src/components/SourceCitation.jsx`: Accessible source citation chips.
- `client/src/pages/heritage-chat.page.jsx`: React chat interface with multi-turn support and status banners.
- `docs/ai-contracts.md` & `docs/api-contracts.md`: Interface contracts for Team 4.

---

## 2. Dependencies & Environment Configuration

### Required Dependencies
Installed in `server/package.json`:
- `@langchain/core` (`^1.2.17`)
- `@langchain/ollama` (`^1.3.0`)

### Environment Variables
Configure in `server/.env` (documented in `server/.env.example`):
```dotenv
# Local Ollama LLM Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_MS=60000

# Optional: Enable development evidence fallback for local browser testing
DEV_FALLBACK_RETRIEVER=true
```

---

## 3. How to Run the Terminal Chatbot (No Browser Required)

The chatbot can be run and demonstrated completely inside the terminal without starting Vite or localhost:

```bash
# From repository root or server directory:
cd server

# 1. Interactive multi-turn chat (Live local Ollama):
npm run chat

# 2. Interactive multi-turn chat with mock LLM (no Ollama required):
npm run chat -- --mock

# 3. Single-shot query:
node tests/chat-cli.js "When was the temple vimana gilded?"
```

### Terminal Commands in Session:
- Type your question and press `Enter`.
- Type `clear` to reset conversation history.
- Type `exit`, `quit`, or press `Ctrl+C` to cleanly terminate.

---

## 4. Service Function Signature & Inputs

The primary answer-generation service is located in `server/services/generate-chat-answer.service.js`.

### Function Signature
```javascript
import { generateChatAnswer } from "./services/generate-chat-answer.service.js";

const result = await generateChatAnswer({
  question,   // string (required, non-empty)
  passages,   // Array<Passage> (required, server-retrieved evidence)
  history,    // Array<{ role: "user"|"assistant", content: string }> (optional)
  llmCaller,  // Function(prompt): Promise<string> (optional, for test mocking)
});
```

### Input Parameters
1. `question` (`string`): The user's historical inquiry (trimmed, non-empty).
2. `passages` (`Array<Object>`): Retrieved passages with shape:
   ```javascript
   {
     id: "ttd-arch-01",              // Stable passage or source identifier
     title: "Epigraphia Tirupati",    // Title of the verified heritage document
     page: 112,                       // Page number (or null if unpaged)
     text: "Passage text content..."  // Historical text (max 4,000 chars)
   }
   ```
3. `history` (`Array<Object>`, optional): Prior conversation turns (supports both standard `[{ role, content }]` and legacy `[{ question, answer }]`). Sanitized automatically to recent 6 turns.

---

## 5. Answer & Citation Response Structure

### Canonical Return Structure
```javascript
{
  answer: "In 1516 CE, Emperor Sri Krishnadevaraya visited the shrine and gilded the vimana.",
  citations: [
    {
      id: "ttd-arch-01",
      title: "Epigraphia Tirupati — Vol. IV: Vijayanagara Inscriptions",
      page: 112
    }
  ],
  insufficientEvidence: false,
  suggestedFollowUps: [
    "When did Sri Krishnadevaraya rule?",
    "What other gifts were offered to the temple?"
  ]
}
```

### Insufficient Evidence Structure
When no evidence is provided, or the passages do not contain facts answering the question:
```javascript
{
  answer: "I couldn't find enough information in the approved historical sources to answer that question.",
  citations: [],
  insufficientEvidence: true,
  suggestedFollowUps: []
}
```

---

## 6. How Member 7's Retriever Should Provide Evidence

Member 7 is responsible for document chunking, embeddings, and Atlas Vector Search in `server/services/vector-search.service.js`.

### Expected Export
Member 7's service should export `searchSimilarPassages` (or `retrievePassages`):
```javascript
/**
 * @param {string} query - The user's query
 * @param {Object} [options]
 * @returns {Promise<Array<{ id: string, title: string, page?: number|string, text: string }>>}
 */
export async function searchSimilarPassages(query, options = {}) {
  // Query MongoDB Atlas Vector Search index on Chunk collection
  // Filter by approvalStatus: "APPROVED"
}
```

`server/api/chat.router.js` dynamically imports and checks `vector-search.service.js`. When Member 7 implements and exports this function, the chat endpoint will automatically consume real vector search results.

---

## 7. How the Main Backend Integrates the Service

In `server/server.js`:
```javascript
import chatRouter from "./api/chat.router.js";

// Mount API route (CSRF & cookie parsers already active)
app.use("/api/chat", chatRouter);
```

### Endpoints Exposed:
- `POST /api/chat`: Accepts `{ question, history }`, validates CSRF, calls retriever, generates answer, returns `{ success: true, data: result, error: null }`.
- `GET /api/chat/status`: Returns `{ success: true, data: { service: "heritage-chat", model: "llama3.2", retrieverReady: boolean }, error: null }`.

---

## 8. Error Handling & Safeguards

- **No Hallucinated Citations**: Every citation ID returned is checked against actual retrieved passage IDs. Any reference to non-existent passages is rejected.
- **Client Passages Ignored**: The backend never accepts passages in `req.body` to prevent prompt injection and untrusted evidence injection.
- **Retriever Safeguard**: If vector retrieval is not configured, returns `503 RETRIEVER_NOT_READY`.
- **LLM Failure**: If Ollama times out (504) or is stopped (503), returns `LLM_TIMEOUT` or `LLM_UNAVAILABLE` without exposing raw stack traces.

---

## 9. Automated Testing & Verification Results

All tests are verified and passing using Vitest:

```bash
cd server
npx vitest run tests/rag.test.js tests/chat-api.test.js
```

### Results Summary
- `tests/rag.test.js`: **16 passed (16 total)**
  - Evidence-grounded generation
  - Empty passage fallback
  - Out-of-bounds citation rejection
  - Explicit insufficient evidence admission
  - Malformed and empty JSON handling
  - Multi-turn history sanitization
  - Prompt injection defense
  - Ollama timeout and connection error mapping
- `tests/chat-api.test.js`: **8 passed (8 total)**
  - `GET /api/chat/status`
  - CSRF 403 enforcement
  - 400 validation on missing question / bad history
  - Client-supplied passage rejection
  - 503 `RETRIEVER_NOT_READY` safeguard
  - 200 grounded answer with standard response envelope
  - 503 `LLM_UNAVAILABLE` on LLM failure

**Total: 24 passed out of 24 tests.**

---

## 10. Status & Dependency Checklist

| Task | Status | Notes |
| :--- | :---: | :--- |
| **Ollama + LangChain.js Integration** | **Complete** | Model invocation, timeouts, error classification, testable. |
| **Grounded Answers & Citations** | **Complete** | Evidence-grounded, validated citations, no hallucinations. |
| **Multi-turn History Support** | **Complete** | Conversation context preserved across turns. |
| **Insufficient Evidence Handling** | **Complete** | Safe fallback with empty citations. |
| **Terminal Interactive CLI** | **Complete** | Runnable via `npm run chat`. |
| **Express Route & CSRF Integration** | **Complete** | Mounted at `/api/chat` with `{ success, data, error }`. |
| **Automated Tests** | **Complete** | 24 tests passing. |
| **Live MongoDB Vector Search** | **Blocked by Member 7** | Awaiting Member 7's implementation of `server/services/vector-search.service.js`. Interface is defined and ready. |
