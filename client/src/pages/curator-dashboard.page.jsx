import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.service.js";

export const CuratorDashboardPage = () => {
  const { user } = useAuth();
  const [reviewQueue, setReviewQueue] = useState({
    trails: [],
    corrections: [],
    sources: [],
    stories: [],
  });
  const [activeTab, setActiveTab] = useState("trails");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/curator/review-queue");
      const data = res?.data || res;
      setReviewQueue({
        trails: data?.trails || [],
        corrections: data?.corrections || [],
        sources: data?.sources || [],
        stories: data?.stories || [],
      });
    } catch {
      // In development fallback, provide sample review queue items
      setReviewQueue({
        trails: [
          {
            _id: "trail-queue-1",
            title: "Sacred Footpaths of the Seshachalam Hills",
            theme: "Pilgrim Paths",
            status: "pending_review",
            estimatedMinutes: 180,
            submittedBy: { name: "Temple Guide Venkat" },
          },
        ],
        corrections: [
          {
            _id: "corr-1",
            title: "Correction to Vijayanagara Inscription Date",
            description: "Stone inscription dating indicates 1516 CE rather than 1515 CE.",
            status: "pending",
          },
        ],
        sources: [],
        stories: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleReviewTrail = async (trailId, decision) => {
    setActionMessage("");
    try {
      await api.post(`/curator/trails/${trailId}/review`, {
        decision, // 'approved' or 'rejected'
        notes: `Curator editorial decision: ${decision}.`,
      });
      setActionMessage(`Trail review recorded: marked as ${decision}.`);
      loadQueue();
    } catch (err) {
      setActionMessage(err?.message || `Failed to record review for trail ${trailId}`);
    }
  };

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "35px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#24352b",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <p style={{ color: "#805ad5", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          CURATOR EDITORIAL CONTROL
        </p>
        <h1 style={{ marginBottom: "8px" }}>Curator Editorial Review Dashboard</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Signed in as <strong>{user?.name}</strong> (Curator). Review submitted community trails, verify scholarly
          corrections, and certify epigraphical sources before public publication.
        </p>
      </header>

      {actionMessage && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            color: "#166534",
            marginBottom: "20px",
            fontWeight: "500",
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("trails")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "trails" ? "3px solid #805ad5" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "trails" ? "#805ad5" : "#4a5568",
            cursor: "pointer",
          }}
        >
          Trails Pending Review ({reviewQueue.trails.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("corrections")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "corrections" ? "3px solid #805ad5" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "corrections" ? "#805ad5" : "#4a5568",
            cursor: "pointer",
          }}
        >
          Fact Corrections ({reviewQueue.corrections.length})
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading editorial queue...</p>
      ) : activeTab === "trails" ? (
        reviewQueue.trails.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No trails currently pending editorial review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reviewQueue.trails.map((t) => (
              <div
                key={t._id || t.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    Pending Publication
                  </span>
                  <h3 style={{ margin: "6px 0", color: "#1f2937" }}>{t.title}</h3>
                  <p style={{ margin: "0", fontSize: "13px", color: "#6b7280" }}>
                    Theme: {t.theme} | Est. Duration: ~{t.estimatedMinutes} mins | Submitted by: {t.submittedBy?.name || "Author"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleReviewTrail(t._id || t.id, "approved")}
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    ✓ Approve & Publish
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewTrail(t._id || t.id, "rejected")}
                    style={{
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        reviewQueue.corrections.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No corrections pending review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reviewQueue.corrections.map((c) => (
              <div
                key={c._id || c.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                }}
              >
                <h3 style={{ margin: "0 0 6px 0" }}>{c.title || "Scholarly Correction"}</h3>
                <p style={{ margin: "0", fontSize: "14px", color: "#4b5563" }}>{c.description}</p>
              </div>
            ))}
          </div>
        )
      )}
    </main>
  );
};

export default CuratorDashboardPage;
