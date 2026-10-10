import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const HomePage = () => {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem", fontFamily: "sans-serif", lineHeight: "1.6" }}>
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ color: "#2c5282", fontSize: "2.5rem" }}>Explore Tirumala Heritage Trails</h1>
        <p style={{ fontSize: "1.2rem", color: "#4a5568" }}>
          Discover ancient temples, sacred paths, and rich historical stories of the sacred Tirumala hills.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f7fafc" }}>
          <h3>Public Places</h3>
          <p>Browse documented heritage locations around Tirumala and Tirupati.</p>
          <Link to="/places" style={{ color: "#3182ce", fontWeight: "bold" }}>Explore Places →</Link>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f7fafc" }}>
          <h3>Heritage Stories</h3>
          <p>Read verified historical stories linked to sacred places and sources.</p>
          <Link to="/stories" style={{ color: "#3182ce", fontWeight: "bold" }}>Read Stories →</Link>
        </div>

        <div style={{ padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f7fafc" }}>
          <h3>Trail Planner</h3>
          <p>Plan custom heritage walking trails based on visiting hours and themes.</p>
          <Link to="/trail-planner" style={{ color: "#3182ce", fontWeight: "bold" }}>Plan Trail →</Link>
        </div>
      </div>

      {!user && (
        <div style={{ marginTop: "3rem", padding: "1.5rem", background: "#ebf8ff", borderRadius: "8px", textAlign: "center" }}>
          <h3>Save Your Heritage Journeys</h3>
          <p>Create a free Visitor account to save custom trails, track progress, and contribute factual corrections.</p>
          <Link to="/signup" style={{ background: "#3182ce", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "4px", textDecoration: "none", fontWeight: "bold" }}>
            Sign Up as Visitor
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
