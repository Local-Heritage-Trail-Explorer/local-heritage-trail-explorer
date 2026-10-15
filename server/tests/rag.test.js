import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateChatAnswer,
  cleanPassages,
  cleanHistory,
  INSUFFICIENT_EVIDENCE_FALLBACK,
} from "../services/generate-chat-answer.service.js";
import { generateWithOllama, setChatModel } from "../services/llm.service.js";

describe("RAG & Chat Generation Service Tests", () => {
  const samplePassages = [
    {
      id: "doc-1",
      title: "Epigraphia Tirupati Vol. 1",
      page: 42,
      text: "The Sri Venkateswara Temple gopuram was renovated in 1516 CE by Sri Krishnadevaraya of the Vijayanagara Empire.",
    },
    {
      id: "doc-2",
      title: "Sacred Water Bodies of Seshachalam",
      page: 18,
      text: "Swami Pushkarini is the holy temple tank located adjacent to the northern wall of the main sanctum.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setChatModel(null);
  });

  // 1. Supported question returns an answer with correct source metadata
  it("returns a grounded answer with matching source metadata when evidence supports it", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "The temple gopuram was renovated in 1516 CE by Sri Krishnadevaraya.",
        citationNumbers: [1],
        insufficientEvidence: false,
        suggestedFollowUps: ["Who was Sri Krishnadevaraya?"],
      })
    );

    const result = await generateChatAnswer({
      question: "When was the temple gopuram renovated?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(false);
    expect(result.answer).toContain("1516 CE");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      id: "doc-1",
      title: "Epigraphia Tirupati Vol. 1",
      page: 42,
    });
    expect(result.suggestedFollowUps).toEqual(["Who was Sri Krishnadevaraya?"]);
  });

  // 2. No retrieved passages leads to an insufficient-evidence response
  it("returns insufficient evidence immediately when no passages are retrieved", async () => {
    const mockLlm = vi.fn();

    const result = await generateChatAnswer({
      question: "What is the annual budget of the temple in 2026?",
      passages: [],
      history: [],
      llmCaller: mockLlm,
    });

    expect(mockLlm).not.toHaveBeenCalled();
    expect(result.insufficientEvidence).toBe(true);
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_FALLBACK);
    expect(result.citations).toEqual([]);
  });

  // 3. Unknown source IDs are rejected
  it("rejects citation numbers that do not correspond to retrieved passages", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "The temple was founded in 800 BCE according to mysterious scrolls.",
        citationNumbers: [99], // Out of range! Only 2 passages exist
        insufficientEvidence: false,
      })
    );

    const result = await generateChatAnswer({
      question: "When was the temple originally founded?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_FALLBACK);
  });

  // 4. Model explicitly marks the answer as insufficient
  it("handles explicit insufficient evidence admission from the model", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "The provided sources do not mention the modern ticket pricing.",
        citationNumbers: [],
        insufficientEvidence: true,
      })
    );

    const result = await generateChatAnswer({
      question: "How much are the darshan tickets?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("do not mention");
  });

  // 5. Invalid JSON is handled safely
  it("handles malformed JSON from the LLM without crashing", async () => {
    const mockLlm = vi.fn().mockResolvedValue("This is raw unformatted text without JSON");

    const result = await generateChatAnswer({
      question: "What is Swami Pushkarini?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_FALLBACK);
  });

  // 6. Invalid response structures are rejected
  it("rejects non-object or invalid response schema", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        unrelatedField: "hello",
        // missing answer, citationNumbers, insufficientEvidence
      })
    );

    const result = await generateChatAnswer({
      question: "What is Swami Pushkarini?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe(INSUFFICIENT_EVIDENCE_FALLBACK);
  });

  // 7. Empty model answers are rejected
  it("rejects empty or whitespace-only model answers", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "   ",
        citationNumbers: [1],
        insufficientEvidence: false,
      })
    );

    const result = await generateChatAnswer({
      question: "Where is the pond?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
  });

  // 8. Invalid and excessive history is handled correctly
  it("sanitizes conversation history, supporting both formats and truncating excess turns", () => {
    const largeHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i} `.repeat(50),
    }));

    const cleaned = cleanHistory(largeHistory);
    // Should cap at 6 most recent turns
    expect(cleaned.length).toBeLessThanOrEqual(6);
    // Should cap length of individual messages
    expect(cleaned[0].content.length).toBeLessThanOrEqual(1000);

    // Legacy format support
    const legacyHistory = [
      { question: "Where is the pond?", answer: "North of the sanctum." },
    ];
    const cleanedLegacy = cleanHistory(legacyHistory);
    expect(cleanedLegacy).toEqual([
      { role: "user", content: "Where is the pond?" },
      { role: "assistant", content: "North of the sanctum." },
    ]);
  });

  // 9. Input validation rejects missing or blank questions
  it("throws a 400 error if question is missing or blank", async () => {
    await expect(
      generateChatAnswer({
        question: "   ",
        passages: samplePassages,
      })
    ).rejects.toThrow("A non-empty question string is required.");
  });

  // 10. Passages normalization sanitizes IDs, titles, and handles missing page numbers
  it("normalizes diverse passage shapes safely", () => {
    const rawPassages = [
      {
        content: "Ancient stone inscription text",
        sourceTitle: "Tirupati Inscriptions",
        page: "12",
      },
      {
        text: "Another record",
        id: "rec-99",
        page: null,
      },
      null,
      { text: "" }, // empty text should be filtered
    ];

    const cleaned = cleanPassages(rawPassages);
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0].title).toBe("Tirupati Inscriptions");
    expect(cleaned[0].page).toBe(12);
    expect(cleaned[1].id).toBe("rec-99");
    expect(cleaned[1].page).toBeNull();
  });

  // 11. LLM communication failures return serviceUnavailable
  it("handles LLM communication failures safely", async () => {
    const mockLlm = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:11434"));

    const result = await generateChatAnswer({
      question: "When was the temple built?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.serviceUnavailable).toBe(true);
    expect(result.insufficientEvidence).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("unavailable");
  });

  // 12. Deduplicates multiple citations of the same source
  it("deduplicates citations pointing to the same document", async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        answer: "The gopuram was renovated in 1516 CE.",
        citationNumbers: [1, 1, 1], // Duplicate references
        insufficientEvidence: false,
      })
    );

    const result = await generateChatAnswer({
      question: "Who renovated the gopuram?",
      passages: samplePassages,
      history: [],
      llmCaller: mockLlm,
    });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].id).toBe("doc-1");
  });
});

describe("LLM Service Unit Tests", () => {
  it("rejects non-string or empty prompts", async () => {
    await expect(generateWithOllama("")).rejects.toThrow(
      "Prompt must be a non-empty string."
    );
  });

  it("handles empty responses from Ollama", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({ content: "   " }),
    };

    await expect(
      generateWithOllama("Hello", { model: mockModel })
    ).rejects.toThrow("The local AI model returned an empty response.");
  });

  it("classifies connection failures into LLM_UNAVAILABLE", async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error("fetch failed: ECONNREFUSED")),
    };

    try {
      await generateWithOllama("Hello", { model: mockModel });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.code).toBe("LLM_UNAVAILABLE");
      expect(err.status).toBe(503);
    }
  });

  it("classifies timeouts into LLM_TIMEOUT", async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error("Request timed out after 60000ms")),
    };

    try {
      await generateWithOllama("Hello", { model: mockModel });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.code).toBe("LLM_TIMEOUT");
      expect(err.status).toBe(504);
    }
  });
});
