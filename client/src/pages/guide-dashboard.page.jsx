import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import trailService from "../services/trail.service.js";

export const GuideDashboardPage = () => {
  const { user } = useAuth();
  const [guideTrails, setGuideTrails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    trailService
      .getMyTrails()
      .then((res) => {
        if (!isMounted) return;
        const trails = res?.data || res;
        setGuideTrails(Array.isArray(trails) ? trails : []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        <p style={{ color: "#dd6b20", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          OFFICIAL GUIDE TRAIL WORKFLOW
        </p>
        <h1 style={{ marginBottom: "8px" }}>Heritage Guide Management Dashboard</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Welcome, <strong>{user?.name}</strong> (Authorized Heritage Guide). Create authentic visitor routes,
          lead pilgrim groups along certified trails, and submit expert itineraries for curator publication.
        </p>
      </header>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
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
          + Create New Guide Itinerary
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
          View All My Trails
        </Link>
      </div>

      <section>
        <h2>My Guided Trails ({guideTrails.length})</h2>
        {isLoading ? (
          <p style={{ color: "#6b7280" }}>Loading guide trails...</p>
        ) : guideTrails.length === 0 ? (
          <div
            style={{
              padding: "36px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280" }}>You haven't authored any guide trails yet.</p>
            <Link
              to="/trail-planner"
              style={{
                color: "#dd6b20",
                fontWeight: "bold",
                textDecoration: "none",
              }}
            >
              Start designing a guided trail →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {guideTrails.map((trail) => (
              <div
                key={trail.id || trail._id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                }}
              >
                <span
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  {trail.status || "Active"}
                </span>
                <h3 style={{ margin: "10px 0 6px 0" }}>{trail.title}</h3>
                <p style={{ color: "#6b7280", fontSize: "13px" }}>
                  Theme: {trail.theme} | ~{trail.estimatedMinutes} mins
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default GuideDashboardPage;
