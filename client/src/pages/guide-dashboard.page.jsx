import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import guideService from "../services/guide.service.js";

export const GuideDashboardPage = () => {
  const { user } = useAuth();
  const [guideTrails, setGuideTrails] = useState([]);
  const [feedbackReports, setFeedbackReports] = useState([]);
  const [activeTab, setActiveTab] = useState("trails"); // 'trails' or 'reports'
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setActionError("");

    try {
      const [trailsRes, reportsRes] = await Promise.all([
        guideService.getTrails().catch(() => ({ data: [] })),
        guideService.getReports().catch(() => ({ data: [] })),
      ]);

      const trails = trailsRes?.data || trailsRes || [];
      const reports = reportsRes?.data || reportsRes || [];

      setGuideTrails(Array.isArray(trails) ? trails : []);
      setFeedbackReports(Array.isArray(reports) ? reports : []);
    } catch {
      // Fallback sample data if backend services initializing
      setGuideTrails([
        {
          id: "gt-1",
          _id: "gt-1",
          title: "Sacred Footpaths of the Seshachalam Hills",
          theme: "Pilgrim Paths",
          status: "approved",
          visibility: "private",
          estimatedMinutes: 180,
          stops: ["660c00000000000000000001", "660c00000000000000000002"],
        },
      ]);
      setFeedbackReports([
        {
          _id: "rep-1",
          id: "rep-1",
          trailId: "gt-1",
          status: "pending",
          description: "Mada street pavement work in progress near north gopuram. Minor walking detour required.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handlePublishTrail = async (trailId) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await guideService.publishTrail(trailId);
      setActionMessage("✓ Trail successfully published for public visitor exploration!");
      loadDashboardData();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || "Failed to publish trail.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModerateReport = async (reportId, status) => {
    setIsProcessing(true);
    setActionMessage("");
    setActionError("");

    try {
      await guideService.moderateReport(reportId, { status });
      setActionMessage(`✓ Report marked as '${status}'. Route condition updated.`);
      loadDashboardData();
    } catch (err) {
      setActionError(err?.response?.data?.error?.message || err?.message || "Failed to moderate report.");
    } finally {
      setIsProcessing(false);
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
        <p style={{ color: "#dd6b20", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          CERTIFIED HERITAGE GUIDE DASHBOARD
        </p>
        <h1 style={{ marginBottom: "8px", color: "#1c2b22" }}>Guide Trail Operations & Moderation</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Welcome, <strong>{user?.name}</strong> (Authorized Heritage Guide). Create authentic visitor routes,
          publish certified itineraries, and moderate real-time route conditions and visitor feedback.
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

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        <Link
          to="/trail-planner"
          style={{
            backgroundColor: "#dd6b20",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          + Create New Guide Route
        </Link>
        <Link
          to="/saved-trails"
          style={{
            backgroundColor: "#edf2f7",
            color: "#2d3748",
            padding: "10px 20px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          View My Saved Trails
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("trails")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "trails" ? "3px solid #dd6b20" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "trails" ? "#dd6b20" : "#4a5568",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          My Guided Trails ({guideTrails.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "reports" ? "3px solid #dd6b20" : "none",
            backgroundColor: "transparent",
            fontWeight: "bold",
            color: activeTab === "reports" ? "#dd6b20" : "#4a5568",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Route Condition & Visitor Reports ({feedbackReports.length})
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading dashboard records...</p>
      ) : activeTab === "trails" ? (
        /* TRAILS TAB */
        guideTrails.length === 0 ? (
          <div style={{ padding: "36px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <p style={{ color: "#6b7280" }}>You have not authored any guide trails yet.</p>
            <Link to="/trail-planner" style={{ color: "#dd6b20", fontWeight: "bold", textDecoration: "none" }}>
              Launch Trail Planner →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {guideTrails.map((trail) => {
              const trailId = trail.id || trail._id;
              const isPublished = trail.visibility === "public" || trail.status === "published";

              return (
                <div
                  key={trailId}
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
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                      <span
                        style={{
                          backgroundColor: isPublished ? "#dcfce7" : "#fef3c7",
                          color: isPublished ? "#166534" : "#92400e",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        {isPublished ? "Public" : trail.status || "Draft"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        ⏱ ~{trail.estimatedMinutes || 60} mins
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 4px 0", color: "#1f2937" }}>{trail.title}</h3>
                    <p style={{ margin: "0", fontSize: "13px", color: "#6b7280" }}>
                      Theme: {trail.theme || "Heritage"} | Stops: {trail.stops?.length || 0} locations
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    {!isPublished ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePublishTrail(trailId)}
                        style={{
                          backgroundColor: "#dd6b20",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "5px",
                          fontWeight: "bold",
                          cursor: isProcessing ? "not-allowed" : "pointer",
                          fontSize: "13px",
                        }}
                      >
                        {isProcessing ? "Publishing..." : "Publish Route to Public"}
                      </button>
                    ) : (
                      <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: "bold" }}>
                        ✓ Live for Visitors
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* REPORTS / FEEDBACK TAB */
        feedbackReports.length === 0 ? (
          <div style={{ padding: "36px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <p style={{ color: "#6b7280" }}>No route condition reports or feedback submitted yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {feedbackReports.map((report) => {
              const repId = report._id || report.id;
              const isResolved = report.status === "reviewed" || report.status === "resolved";

              return (
                <div
                  key={repId}
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
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                      <span
                        style={{
                          backgroundColor: isResolved ? "#dcfce7" : "#fee2e2",
                          color: isResolved ? "#166534" : "#991b1b",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      >
                        {report.status || "Pending Review"}
                      </span>
                      {report.createdAt && (
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          Reported: {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: "6px 0", fontSize: "14px", color: "#2d3748", lineHeight: "1.5" }}>
                      {report.description || report.feedback || "Visitor reported route condition or feedback."}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {!isResolved && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleModerateReport(repId, "reviewed")}
                        style={{
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "5px",
                          fontWeight: "600",
                          cursor: isProcessing ? "not-allowed" : "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✓ Mark Reviewed
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleModerateReport(repId, "dismissed")}
                      style={{
                        backgroundColor: "#edf2f7",
                        color: "#4a5568",
                        border: "1px solid #cbd5e0",
                        padding: "6px 14px",
                        borderRadius: "5px",
                        fontWeight: "600",
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </main>
  );
};

export default GuideDashboardPage;
