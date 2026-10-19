import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import trailService from "../services/trail.service.js";
import placeService from "../services/place.service.js";
import TrailStop from "../components/TrailStop.jsx";

export const SavedTrailsPage = () => {
  const { user } = useAuth();
  const [trails, setTrails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [placeMap, setPlaceMap] = useState(new Map());
  const [completedStops, setCompletedStops] = useState(new Set());
  const [actionMessage, setActionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Fetch user trails and places simultaneously
    Promise.all([
      trailService.getMyTrails(),
      placeService.getPlaces(),
    ])
      .then(([trailsRes, placesRes]) => {
        if (!isMounted) return;
        const myTrails = trailsRes?.data || trailsRes || [];
        setTrails(Array.isArray(myTrails) ? myTrails : []);

        const places = placesRes?.data || placesRes || [];
        if (Array.isArray(places)) {
          const map = new Map();
          places.forEach((p) => map.set((p._id || p.id).toString(), p));
          setPlaceMap(map);
        }

        if (Array.isArray(myTrails) && myTrails.length > 0) {
          setSelectedTrail(myTrails[0]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setActionMessage(err?.message || "Could not retrieve saved trails.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Isolate and load visit progress per selected trail
  useEffect(() => {
    if (!selectedTrail) {
      setCompletedStops(new Set());
      return;
    }
    const trailId = selectedTrail.id || selectedTrail._id;
    trailService
      .getProgress(trailId)
      .then((res) => {
        const data = res?.data || res;
        if (data?.completedPlaceIds) {
          setCompletedStops(new Set(data.completedPlaceIds.map((id) => id.toString())));
        } else {
          setCompletedStops(new Set());
        }
      })
      .catch(() => {
        setCompletedStops(new Set());
      });
  }, [selectedTrail]);

  const handleMarkProgress = async (placeId) => {
    if (!selectedTrail) return;
    setIsSubmitting(true);
    setActionMessage("");

    try {
      const res = await trailService.updateProgress(selectedTrail.id || selectedTrail._id, placeId);
      const data = res?.data || res;

      if (data?.completedPlaceIds) {
        setCompletedStops(new Set(data.completedPlaceIds.map((id) => id.toString())));
        setActionMessage("✅ Visit progress updated and recorded!");
      }
    } catch (err) {
      // In local mode if database is offline, toggle locally
      const updated = new Set(completedStops);
      if (updated.has(placeId.toString())) {
        updated.delete(placeId.toString());
      } else {
        updated.add(placeId.toString());
      }
      setCompletedStops(updated);
      setActionMessage("Marked stop progress locally.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPublication = async (trailId) => {
    setIsSubmitting(true);
    setActionMessage("");

    try {
      await trailService.requestPublication(trailId);
      setActionMessage("🚀 Publication request submitted for curator editorial review!");
      // Update local trail status
      setTrails(
        trails.map((t) =>
          (t.id || t._id) === trailId ? { ...t, status: "pending_review" } : t
        )
      );
      if (selectedTrail && (selectedTrail.id || selectedTrail._id) === trailId) {
        setSelectedTrail({ ...selectedTrail, status: "pending_review" });
      }
    } catch (err) {
      setActionMessage(err?.message || "Failed to submit trail for review.");
    } finally {
      setIsSubmitting(false);
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
        <p style={{ color: "#54745b", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          PERSONAL HERITAGE JOURNAL
        </p>
        <h1 style={{ marginBottom: "8px" }}>My Saved Trails & Journey Progress</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Welcome back, {user?.name || "Visitor"}. Track your completed pilgrimage stops, record personal notes,
          and submit private trails for public community publication.
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

      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading your saved trails...</p>
      ) : trails.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>No Saved Trails Yet</h3>
          <p style={{ color: "#6b7280", marginBottom: "20px" }}>
            Create custom trails or use our AI Trail Agent to generate personalized routes.
          </p>
          <Link
            to="/trail-planner"
            style={{
              backgroundColor: "#355e3b",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "5px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Plan Your First Trail →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "28px" }}>
          {/* Left: Trail List */}
          <div>
            <h3 style={{ marginTop: "0", marginBottom: "14px" }}>My Trails ({trails.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {trails.map((t) => {
                const isSelected = selectedTrail && (selectedTrail.id || selectedTrail._id) === (t.id || t._id);
                return (
                  <div
                    key={t.id || t._id}
                    onClick={() => setSelectedTrail(t)}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid #355e3b" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          color: t.status === "published" ? "#15803d" : t.status === "pending_review" ? "#b45309" : "#6b7280",
                        }}
                      >
                        {t.status === "pending_review" ? "Under Review" : t.status || "Draft"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        ⏱ ~{t.estimatedMinutes || 60}m
                      </span>
                    </div>

                    <h4 style={{ margin: "8px 0 4px 0", fontSize: "15px", color: "#1f2937" }}>
                      {t.title}
                    </h4>

                    <p style={{ margin: "0", fontSize: "12px", color: "#6b7280" }}>
                      {t.stops?.length || 0} heritage stops
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Trail Details & Progress */}
          {selectedTrail && (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px 0", color: "#1f2937" }}>{selectedTrail.title}</h2>
                  <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
                    Theme: <strong>{selectedTrail.theme || "Cultural Trail"}</strong> | Estimated Duration:{" "}
                    <strong>{selectedTrail.estimatedMinutes} minutes</strong>
                  </p>
                </div>

                {selectedTrail.status !== "published" && selectedTrail.status !== "pending_review" && (
                  <button
                    type="button"
                    onClick={() => handleRequestPublication(selectedTrail.id || selectedTrail._id)}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      fontSize: "13px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    Submit for Publication
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ margin: "20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                  <span>Visit Completion</span>
                  <span>
                    {completedStops.size} of {selectedTrail.stops?.length || 0} stops
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "#16a34a",
                      width: `${
                        selectedTrail.stops?.length
                          ? Math.min(100, Math.round((completedStops.size / selectedTrail.stops.length) * 100))
                          : 0
                      }%`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Stops List */}
              <h3 style={{ marginTop: "24px", marginBottom: "14px" }}>Trail Stops & Progress</h3>
              <div>
                {(selectedTrail.stops || []).map((stopId, idx) => {
                  const idStr = (stopId?._id || stopId?.id || stopId).toString();
                  const place = placeMap.get(idStr) || {
                    id: idStr,
                    name: `Heritage Landmark (${idStr.slice(-4)})`,
                    zone: "Tirumala Heritage Zone",
                    estimatedVisitMinutes: 30,
                  };

                  return (
                    <TrailStop
                      key={idStr || idx}
                      stop={place}
                      index={idx}
                      isCompleted={completedStops.has(idStr)}
                      onToggleComplete={handleMarkProgress}
                      isTracking={isSubmitting}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default SavedTrailsPage;
