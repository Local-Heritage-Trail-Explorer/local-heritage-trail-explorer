import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { setCustomRetriever } from "../api/chat.router.js";
import { setChatModel } from "../services/llm.service.js";

describe("Chat API Integration Tests (POST /api/chat)", () => {
  let app;

  beforeAll(() => {
    // Isolated in-memory session store for fast integration testing
    const memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);
  });

  beforeEach(() => {
    setCustomRetriever(null);
    setChatModel(null);
  });

  /**
   * Helper to retrieve CSRF token and session cookies
   */
  const getCsrfAuth = async () => {
    const res = await request(app).get("/api/csrf-token");
    const setCookies = res.headers["set-cookie"] || [];
    const xsrfCookie = setCookies.find((c) => c.startsWith("XSRF-TOKEN=")) || "";
    const token =
      res.body?.data?.csrfToken || xsrfCookie.split(";")[0].split("=")[1];
    return { token, cookies: setCookies };
  };

  // 1. GET /api/chat/status
  it("GET /api/chat/status returns operational status", async () => {
    const res = await request(app).get("/api/chat/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe("heritage-chat");
    expect(res.body.data.model).toBeDefined();
  });

  // 2. CSRF Protection
  it("rejects POST /api/chat without CSRF token with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "When was the temple built?" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EBADCSRFTOKEN");
  });

  // 3. Missing or empty question
  it("returns 400 INVALID_QUESTION when question is missing or blank", async () => {
    const { token, cookies } = await getCsrfAuth();

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({ question: "   " });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_QUESTION");
  });

  // 4. Invalid history structure
  it("returns 400 INVALID_HISTORY when history is not an array", async () => {
    const { token, cookies } = await getCsrfAuth();

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({
        question: "When was the gopuram constructed?",
        history: "invalid-string-history",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_HISTORY");
  });

  // 5. Returns 503 RETRIEVER_NOT_READY when document retrieval is unconfigured
  it("returns 503 RETRIEVER_NOT_READY when server retrieval service is not configured", async () => {
    const { token, cookies } = await getCsrfAuth();

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({ question: "When was the temple built?" });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("RETRIEVER_NOT_READY");
    expect(res.body.error.message).toContain("retrieval is not configured yet");
  });

  // 6. Ignores client-provided passages (security constraint)
  it("refuses to trust client-supplied passages in the request body", async () => {
    const { token, cookies } = await getCsrfAuth();

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({
        question: "Tell me about secret treasures.",
        passages: [
          {
            id: "fake-passage",
            title: "Fake source",
            text: "Secret treasure is buried at location X.",
          },
        ],
      });

    // Must still return 503 because client passages are rejected as untrusted
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("RETRIEVER_NOT_READY");
  });

  // 7. Successful grounded answer when retriever and model respond
  it("returns 200 with answer, citations, and standard response envelope when retriever is ready", async () => {
    const { token, cookies } = await getCsrfAuth();

    // Mock retriever
    setCustomRetriever(async (query) => [
      {
        id: "source-42",
        title: "Tirumala Temple Architecture Manual",
        page: 7,
        text: "The main vimana towers 37 feet above the sanctum sanctorum and was gilded in gold by Pandyan kings.",
      },
    ]);

    // Mock LangChain model
    setChatModel({
      invoke: async () => ({
        content: JSON.stringify({
          answer: "The main vimana was gilded in gold by Pandyan kings.",
          citationNumbers: [1],
          insufficientEvidence: false,
          suggestedFollowUps: ["When did the Pandyan kings reign?"],
        }),
      }),
    });

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({
        question: "Who gilded the vimana in gold?",
        history: [{ role: "user", content: "Tell me about the vimana." }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.error).toBeNull();
    expect(res.body.data.answer).toContain("Pandyan kings");
    expect(res.body.data.insufficientEvidence).toBe(false);
    expect(res.body.data.citations).toEqual([
      {
        id: "source-42",
        title: "Tirumala Temple Architecture Manual",
        page: 7,
      },
    ]);
    expect(res.body.data.suggestedFollowUps).toHaveLength(1);
  });

  // 8. Handles LLM communication errors safely
  it("returns 503 LLM_UNAVAILABLE when LLM service fails", async () => {
    const { token, cookies } = await getCsrfAuth();

    setCustomRetriever(async () => [
      {
        id: "doc-1",
        title: "Test Inscription",
        page: 1,
        text: "Some historical text.",
      },
    ]);

    // Mock failing model
    setChatModel({
      invoke: async () => {
        throw new Error("fetch failed: ECONNREFUSED 127.0.0.1:11434");
      },
    });

    const res = await request(app)
      .post("/api/chat")
      .set("Cookie", cookies)
      .set("x-csrf-token", token)
      .send({ question: "Where is the temple?" });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("LLM_UNAVAILABLE");
  });
});
