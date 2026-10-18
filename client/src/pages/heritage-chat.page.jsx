import React, { useState, useEffect, useRef } from "react";
import aiService from "../services/ai.service.js";
import SourceCitation from "../components/SourceCitation.jsx";

export const HeritageChatPage = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaskaram! I am your Tirumala Heritage Historical Assistant. Ask me any historical, architectural, or epigraphical question about the temples and sacred places of Tirumala and Tirupati. My answers are grounded strictly in peer-reviewed archival records.",
      citations: [],
      suggestedFollowUps: [
        "When was the temple gopuram renovated by Sri Krishnadevaraya?",
        "What is the significance of Swami Pushkarini?",
        "How many steps are on the ancient Alipiri footpath?",
      ],
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState({ online: false, model: "llama3.2" });
  const [errorMessage, setErrorMessage] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    aiService
      .getChatStatus()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setChatStatus({
          online: true,
          model: data?.model || "llama3.2",
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setChatStatus({ online: false, model: "Ollama (Offline/Retrying)" });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (questionToSend) => {
    const question = questionToSend || inputQuestion;
    if (!question || !question.trim() || isLoading) return;

    const userMessage = { role: "user", content: question.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputQuestion("");
    setIsLoading(true);
    setErrorMessage("");

    // Build multi-turn history excluding the newest message
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const res = await aiService.sendChatMessage({
        question: question.trim(),
        history,
      });

      const data = res?.data || res;

      const assistantMessage = {
        role: "assistant",
        content: data?.answer || "I could not find documented archival records for that specific question.",
        citations: data?.citations || [],
        insufficientEvidence: data?.insufficientEvidence || false,
        suggestedFollowUps: data?.suggestedFollowUps || [],
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      const errMsg = err?.message || err?.error?.message || "Failed to contact the historical assistant. Ensure Ollama is running.";
      setErrorMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        boxSizing: "border-box",
      }}
    >
      {/* Header and status banner */}
      <header style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", margin: "0 0 4px 0", color: "#24352b" }}>
              🏛️ Historical Heritage AI Assistant
            </h1>
            <p style={{ margin: "0", fontSize: "14px", color: "#4b5563" }}>
              Grounded Retrieval-Augmented Generation (RAG) powered by LangChain & Ollama.
            </p>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: "bold",
              backgroundColor: chatStatus.online ? "#def7ec" : "#fef3c7",
              color: chatStatus.online ? "#03543f" : "#92400e",
              border: chatStatus.online ? "1px solid #31c48d" : "1px solid #f59e0b",
            }}
          >
            {chatStatus.online ? `● ${chatStatus.model} Active` : `○ ${chatStatus.model}`}
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "80%",
                backgroundColor: isUser ? "#355e3b" : "#ffffff",
                color: isUser ? "#ffffff" : "#1f2937",
                padding: "14px 18px",
                borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: isUser ? "none" : "1px solid #e5e7eb",
                lineHeight: "1.5",
                fontSize: "15px",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

              {/* Citations if available */}
              {!isUser && msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#6b7280", marginBottom: "4px" }}>
                    VERIFIED ARCHIVAL SOURCES:
                  </div>
                  <div>
                    {msg.citations.map((c, cIdx) => (
                      <SourceCitation key={c.id || cIdx} citation={c} index={cIdx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested followups */}
              {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#6b7280", marginBottom: "6px" }}>
                    SUGGESTED EXPLORATIONS:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {msg.suggestedFollowUps.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSendMessage(promptText)}
                        style={{
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "14px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          color: "#374151",
                          textAlign: "left",
                        }}
                      >
                        💡 {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#ffffff",
              padding: "12px 18px",
              borderRadius: "16px 16px 16px 2px",
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            <span>📜 Synthesizing response from verified historical passages...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {errorMessage && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "13px",
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Input bar */}
      <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a historical question (e.g. 'When was the golden vimana gilded?')..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid #cbd5cc",
            fontSize: "15px",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputQuestion.trim()}
          style={{
            backgroundColor: "#355e3b",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "12px 24px",
            fontWeight: "bold",
            cursor: isLoading || !inputQuestion.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !inputQuestion.trim() ? 0.6 : 1,
            fontSize: "15px",
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
};

export default HeritageChatPage;
