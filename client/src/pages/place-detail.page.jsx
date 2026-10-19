import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import placeService from "../services/place.service.js";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.service.js";

export const PlaceDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [place, setPlace] = useState(null);
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Correction submission state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionProposedText, setCorrectionProposedText] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionSourceUrl, setCorrectionSourceUrl] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    Promise.all([
      placeService.getPlaceById(id),
      placeService.getPlaceStories(id).catch(() => ({ data: [] })),
    ])
      .then(([placeRes, storiesRes]) => {
        if (!isMounted) return;
        const placeData = placeRes?.data || placeRes;
        const storiesData = storiesRes?.data || storiesRes || [];

        setPlace(placeData);
        setStories(Array.isArray(storiesData) ? storiesData : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err?.response?.data?.error?.message || err?.message || "Failed to load heritage place details.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionProposedText.trim()) return;

    setIsSubmittingCorrection(true);
    setCorrectionStatus("");

    try {
      await api.post(`/places/${id}/corrections`, {
        proposedText: correctionProposedText.trim(),
        reason: correctionReason.trim() || undefined,
        sourceUrl: correctionSourceUrl.trim() || undefined,
      });

      setCorrectionStatus("success");
      setCorrectionProposedText("");
      setCorrectionReason("");
      setCorrectionSourceUrl("");
      setTimeout(() => setShowCorrectionModal(false), 2000);
    } catch (err) {
      setCorrectionStatus(err?.response?.data?.error?.message || "Failed to submit correction. Please ensure your email is verified.");
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  if (isLoading) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px", fontFamily: "Arial, sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Loading verified heritage place details...</p>
      </main>
    );
  }

  if (errorMessage || !place) {
    return (
      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px", fontFamily: "Arial, sans-serif" }}>
        <div style={{ padding: "24px", backgroundColor: "#fff5f5", borderRadius: "8px", border: "1px solid #feb2b2" }}>
          <h2 style={{ color: "#c53030", margin: "0 0 10px 0" }}>Place Not Found</h2>
          <p style={{ color: "#742a2a", margin: "0 0 16px 0" }}>{errorMessage || "The requested heritage place could not be found."}</p>
          <Link to="/places" style={{ color: "#355e3b", fontWeight: "bold", textDecoration: "none" }}>
            ← Back to All Heritage Places
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "36px 20px",
        fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
        color: "#24352b",
      }}
    >
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/places" style={{ color: "#355e3b", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>
          ← Back to All Places
        </Link>
      </nav>

      <header style={{ marginBottom: "28px", borderBottom: "1px solid #e2e8f0", pb: "20px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
          <span
            style={{
              backgroundColor: "#edf3e9",
              color: "#355e3b",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {place.zone || "Tirumala Heritage Region"}
          </span>
          {place.hoursVerification && (
            <span
              style={{
                backgroundColor: "#e6fffa",
                color: "#234e52",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "600",
                border: "1px solid #b2f5ea",
              }}
            >
              ✓ Hours Verified
            </span>
          )}
          {place.estimatedVisitMinutes && (
            <span style={{ fontSize: "13px", color: "#647067" }}>
              ⏱ Recommended Visit: ~{place.estimatedVisitMinutes} mins
            </span>
          )}
        </div>

        <h1 style={{ fontSize: "32px", margin: "0 0 10px 0", color: "#1c2b22" }}>{place.name}</h1>
        {place.themes && place.themes.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
            {place.themes.map((theme, i) => (
              <span
                key={i}
                style={{
                  backgroundColor: "#f7fafc",
                  color: "#4a5568",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                #{theme}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Description Section */}
      <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "28px", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "20px", marginTop: "0", color: "#2d3748" }}>Historical Significance & Description</h2>
        <p style={{ fontSize: "16px", lineHeight: "1.7", color: "#4a5568", margin: "0" }}>
          {place.description || place.historicalSignificance}
        </p>

        {/* Visiting Hours Card */}
        {place.openingHours && (
          <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", margin: "0 0 8px 0", color: "#2d3748" }}>Visiting Hours</h3>
            {place.openingHours.open && place.openingHours.close ? (
              <p style={{ margin: "0", fontSize: "14px", color: "#4a5568" }}>
                Daily Open: <strong>{place.openingHours.open}</strong> — <strong>{place.openingHours.close}</strong>
              </p>
            ) : typeof place.openingHours === "object" ? (
              <div style={{ fontSize: "14px", color: "#4a5568" }}>
                {Object.entries(place.openingHours).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", maxWidth: "250px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{key}:</span>
                    <span>{typeof val === "object" ? `${val.open || "06:00"} - ${val.close || "20:00"}` : String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: "0", fontSize: "14px", color: "#4a5568" }}>Standard hours apply.</p>
            )}
          </div>
        )}

        {/* Suggest Correction Action Card */}
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            border: "1px solid #bbf7d0",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <strong style={{ color: "#166534", fontSize: "15px", display: "block" }}>
              Notice outdated hours, incorrect facts, or missing details?
            </strong>
            <span style={{ fontSize: "13px", color: "#15803d" }}>
              Help preserve heritage accuracy by submitting a suggested correction for curator review.
            </span>
          </div>
          <button
            type="button"
            id="suggest-correction-btn"
            onClick={() => setShowCorrectionModal(true)}
            style={{
              backgroundColor: "#2e7d32",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "9px 18px",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            }}
          >
            ✎ Suggest a Fact Correction
          </button>
        </div>
      </section>

      {/* Related Stories Section */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px", color: "#1c2b22" }}>
          Approved Historical Stories ({stories.length})
        </h2>

        {stories.length === 0 ? (
          <p style={{ color: "#718096" }}>No approved stories currently registered for this place.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            {stories.map((s) => (
              <article
                key={s._id || s.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                  <h3 style={{ margin: "0", fontSize: "18px", color: "#2d3748" }}>{s.title}</h3>
                  {s.claimType && (
                    <span
                      style={{
                        backgroundColor: "#edf2f7",
                        color: "#4a5568",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {s.claimType}
                    </span>
                  )}
                </div>
                <p style={{ color: "#4a5568", fontSize: "14px", lineHeight: "1.6", margin: "10px 0" }}>
                  {s.content ? (s.content.length > 280 ? `${s.content.slice(0, 280)}...` : s.content) : ""}
                </p>
                <Link
                  to={`/stories/${s._id || s.id}`}
                  style={{ color: "#355e3b", fontWeight: "bold", fontSize: "13px", textDecoration: "none" }}
                >
                  Read Full Story & Sources →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Fact Correction Modal */}
      {showCorrectionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginTop: "0", color: "#1c2b22" }}>Suggest Fact Correction</h3>
            <p style={{ fontSize: "13px", color: "#647067", marginBottom: "16px" }}>
              Submit an edit or correction for <strong>{place.name}</strong>. All submissions are reviewed by curators before being accepted.
            </p>

            {correctionStatus === "success" ? (
              <div style={{ padding: "16px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "16px" }}>
                ✓ Correction submitted successfully! Thank you for contributing to Tirumala's verified heritage knowledge.
              </div>
            ) : (
              <form onSubmit={handleSubmitCorrection}>
                {correctionStatus && (
                  <div style={{ padding: "10px", backgroundColor: "#fff5f5", color: "#c53030", borderRadius: "4px", fontSize: "13px", marginBottom: "12px" }}>
                    {correctionStatus}
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                    Proposed Text / Factual Update *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={correctionProposedText}
                    onChange={(e) => setCorrectionProposedText(e.target.value)}
                    placeholder="Enter the corrected factual description or details..."
                    style={{ width: "100%", padding: "10px", border: "1px solid #cbd5cc", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                    Reason for Correction
                  </label>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Epigraphical dating discrepancy"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5cc", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                    Source Reference URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={correctionSourceUrl}
                    onChange={(e) => setCorrectionSourceUrl(e.target.value)}
                    placeholder="https://example.org/inscriptions-source"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5cc", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    style={{ padding: "8px 16px", border: "1px solid #cbd5cc", borderRadius: "4px", backgroundColor: "#fff", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCorrection}
                    style={{ padding: "8px 16px", border: "none", borderRadius: "4px", backgroundColor: "#355e3b", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                  >
                    {isSubmittingCorrection ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default PlaceDetailPage;
