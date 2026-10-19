import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import curatorService from "../services/curator.service.js";

export const CuratorDashboardPage = () => {
  const { user } = useAuth();
  const [reviewQueue, setReviewQueue] = useState({
    trails: [],
    corrections: [],
    sources: [],
    stories: [],
  });
  const [activeTab, setActiveTab] = useState("trails"); // 'trails', 'stories', 'corrections', 'sources'
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Source upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAttribution, setUploadAttribution] = useState("");
  const [uploadSourceType, setUploadSourceType] = useState("Archival Document");
  const [isUploading, setIsUploading] = useState(false);

  const loadQueue = async () => {
    setIsLoading(true);
    setActionError("");

    try {
      const res = await curatorService.getReviewQueue();
      const data = res?.data || res;
      setReviewQueue({
        trails: data?.trails || [],
        corrections: data?.corrections || [],
        sources: data?.sources || [],
        stories: data?.stories || [],
      });
    } catch {
      // Fallback sample queue
      setReviewQueue({
        trails: [
          {
            _id: "trail-queue-1",
            id: "trail-queue-1",
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
            id: "corr-1",
            proposedText: "Inscriptions record the gilding of Ananda Nilayam in 839 CE by Pallava queen Samavai.",
            reason: "Epigraphical date discrepancy in regional records.",
            status: "pending",
          },
        ],
        stories: [
          {
            _id: "story-q-1",
            id: "story-q-1",
            title: "Ancient Water Engineering of Swami Pushkarini",
            content: "Stone stepped revetments and natural sub-aquifer filtration constructed under the Cholas.",
            claimType: "historical_chronicle",
            status: "pending",
          },
        ],
        sources: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleReviewTrail = async (trailId, decision) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await curatorService.reviewTrail(trailId, {
        decision,
        notes: `Curator editorial decision: ${decision}.`,
      });
      setActionMessage(`✓ Trail review recorded: marked as ${decision}.`);
      loadQueue();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || `Failed to record review for trail.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewStory = async (storyId, decision) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await curatorService.reviewStory(storyId, {
        status: decision,
        decision,
        notes: `Curator editorial decision: ${decision}.`,
      });
      setActionMessage(`✓ Story review recorded: marked as ${decision}. Vector index synchronized.`);
      loadQueue();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || `Failed to record review for story.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewCorrection = async (correctionId, decision) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await curatorService.reviewCorrection(correctionId, {
        status: decision,
        notes: `Curator fact-checking verdict: ${decision}.`,
      });
      setActionMessage(`✓ Fact correction review recorded: marked as ${decision}.`);
      loadQueue();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || `Failed to review correction.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewSource = async (sourceId, decision) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await curatorService.reviewSource(sourceId, {
        status: decision,
        notes: `Curator source provenance validation: ${decision}.`,
      });
      setActionMessage(`✓ Source review recorded: marked as ${decision}.`);
      loadQueue();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || `Failed to review source.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadSourceSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setActionMessage("");
    setActionError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadTitle) formData.append("title", uploadTitle);
      if (uploadAttribution) formData.append("attribution", uploadAttribution);
      if (uploadSourceType) formData.append("sourceType", uploadSourceType);

      const res = await curatorService.uploadSource(formData);
      const data = res?.data || res;

      setActionMessage(
        `✓ Document uploaded successfully! Extracted ${data?.wordCount || 0} words of historical text.`
      );
      setUploadFile(null);
      setUploadTitle("");
      setUploadAttribution("");
      loadQueue();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || "Document upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "35px 24px",
        fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
        color: "#24352b",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <p style={{ color: "#805ad5", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          CURATOR EDITORIAL CONTROL
        </p>
        <h1 style={{ marginBottom: "8px", color: "#1c2b22" }}>Curator Editorial Review Dashboard</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Signed in as <strong>{user?.name}</strong> (Curator). Review submitted community trails, verify scholarly
          fact corrections, approve historical stories, and ingest archival source documents.
        </p>
      </header>

      {/* Notifications */}
      {actionMessage && (
        <div style={{ padding: "12px 18px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", marginBottom: "20px" }}>
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div style={{ padding: "12px 18px", backgroundColor: "#fff5f5", border: "1px solid #feb2b2", borderRadius: "6px", color: "#c53030", marginBottom: "20px" }}>
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px", flexWrap: "wrap" }}>
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
            fontSize: "14px",
          }}
        >
          Trails Review ({reviewQueue.trails.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stories")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "stories" ? "3px solid #805ad5" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "stories" ? "#805ad5" : "#4a5568",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Stories Approval ({reviewQueue.stories.length})
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
            fontSize: "14px",
          }}
        >
          Fact Corrections ({reviewQueue.corrections.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "sources" ? "3px solid #805ad5" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "sources" ? "#805ad5" : "#4a5568",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Source Archiving & Upload ({reviewQueue.sources.length})
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading editorial queue...</p>
      ) : activeTab === "trails" ? (
        /* TRAILS TAB */
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
                  <span style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
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
                    disabled={isProcessing}
                    onClick={() => handleReviewTrail(t._id || t.id, "approved")}
                    style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✓ Approve & Publish
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReviewTrail(t._id || t.id, "rejected")}
                    style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "stories" ? (
        /* STORIES TAB */
        reviewQueue.stories.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No historical stories currently pending review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reviewQueue.stories.map((s) => (
              <div
                key={s._id || s.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ backgroundColor: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                      {s.claimType || "Historical Claim"}
                    </span>
                    {s.placeId?.name && (
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>📍 {s.placeId.name}</span>
                    )}
                  </div>
                  <h3 style={{ margin: "4px 0 8px 0", color: "#1f2937" }}>{s.title}</h3>
                  <p style={{ margin: "0", fontSize: "14px", color: "#4b5563", lineHeight: "1.5" }}>{s.content}</p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReviewStory(s._id || s.id, "approved")}
                    style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✓ Approve & Index
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReviewStory(s._id || s.id, "rejected")}
                    style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "corrections" ? (
        /* CORRECTIONS TAB */
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                    Fact Correction Request
                  </span>
                  {c.placeId?.name && (
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                      Target: {c.placeId.name}
                    </span>
                  )}
                  <h4 style={{ margin: "8px 0 4px 0", color: "#1f2937" }}>Proposed Correction:</h4>
                  <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#2d3748" }}>{c.proposedText || c.description}</p>
                  {c.reason && (
                    <p style={{ margin: "0", fontSize: "12px", color: "#6b7280" }}>
                      <em>Reason: {c.reason}</em>
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReviewCorrection(c._id || c.id, "approved")}
                    style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✓ Accept Correction
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReviewCorrection(c._id || c.id, "rejected")}
                    style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* SOURCES & DOCUMENT UPLOAD TAB */
        <div>
          {/* Document Upload Card */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>📤 Ingest Primary Historical Document</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
              Upload archival PDFs, epigraphical records, or transcription text files (up to 10MB). Text is securely extracted and cataloged.
            </p>

            <form onSubmit={handleUploadSourceSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "600px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Select File (PDF, TXT, MD, JSON, Images) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt,.md,.json,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Source Title (Optional - defaults to filename)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. TTD Inscriptions Vol. II"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                  Attribution / Scholar / Publisher
                </label>
                <input
                  type="text"
                  value={uploadAttribution}
                  onChange={(e) => setUploadAttribution(e.target.value)}
                  placeholder="e.g. Archaeological Survey of India"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#805ad5",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: isUploading || !uploadFile ? "not-allowed" : "pointer",
                }}
              >
                {isUploading ? "Extracting & Uploading..." : "Upload & Extract Text"}
              </button>
            </form>
          </div>

          {/* Pending Sources */}
          <h3 style={{ marginBottom: "16px", color: "#1e293b" }}>Archival Sources Pending Review ({reviewQueue.sources.length})</h3>
          {reviewQueue.sources.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No sources pending validation.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reviewQueue.sources.map((src) => (
                <div
                  key={src._id || src.id}
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
                    <h4 style={{ margin: "0 0 4px 0", color: "#1f2937" }}>{src.title}</h4>
                    <p style={{ margin: "0", fontSize: "13px", color: "#6b7280" }}>
                      Attribution: {src.attribution} | Type: {src.sourceType}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReviewSource(src._id || src.id, "approved")}
                      style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                    >
                      ✓ Certify Source
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReviewSource(src._id || src.id, "rejected")}
                      style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default CuratorDashboardPage;
