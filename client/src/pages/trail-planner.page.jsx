import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import placeService from "../services/place.service.js";
import trailService from "../services/trail.service.js";
import aiService from "../services/ai.service.js";
import PlaceCard from "../components/PlaceCard.jsx";
import TrailStop from "../components/TrailStop.jsx";

export const TrailPlannerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [availablePlaces, setAvailablePlaces] = useState([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);
  const [theme, setTheme] = useState("Sacred Heritage");
  const [maxMinutes, setMaxMinutes] = useState(180);
  const [userPrompt, setUserPrompt] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: "", text: "" });

  const [publishedTrails, setPublishedTrails] = useState([]);

  useEffect(() => {
    let isMounted = true;
    placeService
      .getPlaces()
      .then((res) => {
        if (!isMounted) return;
        const places = res?.data || res;
        if (Array.isArray(places)) {
          setAvailablePlaces(places);
        }
      })
      .catch(() => {});

    trailService
      .getPublishedTrails({ limit: 4 })
      .then((res) => {
        if (!isMounted) return;
        const trails = res?.data || res;
        if (Array.isArray(trails)) {
          setPublishedTrails(trails);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePlace = (place) => {
    const id = place._id || place.id;
    if (selectedPlaceIds.includes(id)) {
      setSelectedPlaceIds(selectedPlaceIds.filter((pId) => pId !== id));
    } else {
      setSelectedPlaceIds([...selectedPlaceIds, id]);
    }
  };

  const handleGenerateWithAgent = async () => {
    if (!user) {
      setFeedbackMessage({
        type: "error",
        text: "🔒 Please sign in to synthesize customized heritage itineraries with the AI Trail Agent.",
      });
      return;
    }

    setIsGenerating(true);
    setFeedbackMessage({ type: "", text: "" });

    try {
      const res = await aiService.generateTrail({
        theme,
        maxMinutes: parseInt(maxMinutes, 10),
        preferredPlaceIds: selectedPlaceIds,
        userPrompt,
      });

      const plan = res?.data || res;
      setGeneratedPlan(plan);
      setFeedbackMessage({
        type: "success",
        text: "✨ AI Trail Agent successfully synthesized your personalized heritage itinerary!",
      });
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: err?.message || "Failed to generate AI trail itinerary. Please verify connection and try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTrail = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!generatedPlan || !generatedPlan.stops || generatedPlan.stops.length === 0) {
      setFeedbackMessage({ type: "error", text: "Please generate or select stops for your trail first." });
      return;
    }

    setIsSaving(true);
    try {
      await trailService.createTrail({
        title: generatedPlan.title,
        theme: generatedPlan.theme,
        stops: generatedPlan.stops,
        estimatedMinutes: generatedPlan.estimatedMinutes,
      });

      setFeedbackMessage({
        type: "success",
        text: "🎉 Trail saved to your private collection! View it in 'Saved Trails'.",
      });
      setTimeout(() => navigate("/saved-trails"), 1200);
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: err?.message || "Failed to save trail. Please verify login status.",
      });
    } finally {
      setIsSaving(false);
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
          AI-POWERED ITINERARY PLANNER
        </p>
        <h1 style={{ marginBottom: "10px" }}>Heritage Trail Planner & Generator</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Plan an authentic heritage route around Tirumala and Tirupati. Select landmarks or let our intelligent
          Trail Agent optimize timing, geographic sequence, and cultural significance for your visit.
        </p>
      </header>

      {feedbackMessage.text && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "6px",
            marginBottom: "20px",
            backgroundColor:
              feedbackMessage.type === "success"
                ? "#def7ec"
                : feedbackMessage.type === "info"
                ? "#e1effe"
                : "#fde8e8",
            color:
              feedbackMessage.type === "success"
                ? "#03543f"
                : feedbackMessage.type === "info"
                ? "#1e429f"
                : "#9b1c1c",
            border: "1px solid currentColor",
            fontWeight: "500",
          }}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Preferences Form */}
      <section
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <h2 style={{ fontSize: "18px", marginTop: "0", marginBottom: "16px" }}>
          Trail Customization Parameters
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #d1d5db" }}
            >
              <option value="Sacred Heritage">Sacred Heritage & Main Sanctum</option>
              <option value="Dynastic Patronage">Vijayanagara & Royal Patronage</option>
              <option value="Pilgrim Paths">Ancient Hill Footpaths & Steps</option>
              <option value="Sacred Waters">Sacred Tanks & Waterfalls</option>
              <option value="Historic Forts">Chandragiri Fort & Architecture</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
              Time Budget (Minutes)
            </label>
            <input
              type="number"
              min="30"
              max="600"
              step="30"
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
              Special Interests or Requests
            </label>
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Photography, temple architecture, sacred dip"
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {!user && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              color: "#1e40af",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span>
              🔒 <strong>Sign-in Required:</strong> Log in with your visitor account to have the AI Trail Agent synthesize and save custom itineraries.
            </span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "4px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Sign In →
            </button>
          </div>
        )}

        <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleGenerateWithAgent}
            disabled={isGenerating}
            style={{
              backgroundColor: "#355e3b",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontSize: "15px",
            }}
          >
            {isGenerating ? "🤖 AI Agent Synthesizing Route..." : "✨ Synthesize Trail with AI Agent"}
          </button>

          {selectedPlaceIds.length > 0 && (
            <span style={{ fontSize: "13px", color: "#4b5563" }}>
              📌 {selectedPlaceIds.length} prioritized landmarks selected
            </span>
          )}
        </div>
      </section>

      {/* Generated Itinerary Section */}
      {generatedPlan && (
        <section
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "36px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                ✨ AI Agent Synthesized Route
              </span>
              <h2 style={{ margin: "8px 0 4px 0", color: "#14532d" }}>{generatedPlan.title}</h2>
              <p style={{ margin: "0", color: "#166534", fontSize: "14px" }}>
                ⏱ Estimated Total Duration: ~{generatedPlan.estimatedMinutes} minutes
                {generatedPlan.feasibility && (
                  <span>
                    {" "}(🚶 {generatedPlan.feasibility.totalWalkingMinutes}m walking + 🏛 {generatedPlan.feasibility.totalVisitMinutes}m visiting)
                  </span>
                )}
                {" "}| 📍 {generatedPlan.stops?.length || 0} stops
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveTrail}
              disabled={isSaving}
              style={{
                backgroundColor: "#15803d",
                color: "#ffffff",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              {isSaving ? "Saving..." : user ? "💾 Save to My Trails" : "🔒 Login to Save Trail"}
            </button>
          </div>

          {generatedPlan.reasoning && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                backgroundColor: "#ffffff",
                borderLeft: "4px solid #16a34a",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#15803d",
              }}
            >
              <strong>💡 AI Agent Rationale:</strong> {generatedPlan.reasoning}
            </div>
          )}

          {generatedPlan.substitutions && generatedPlan.substitutions.length > 0 && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px 14px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#b45309",
              }}
            >
              <strong>⚠️ Visiting Hours Adjustment:</strong>{" "}
              {generatedPlan.substitutions.map((s) => s.explanation).join(" ")}
            </div>
          )}

          {generatedPlan.narrative && (
            <p style={{ marginTop: "14px", color: "#1f2937", lineHeight: "1.6", fontStyle: "italic", backgroundColor: "#ffffff", padding: "14px", borderRadius: "6px", border: "1px solid #dcfce7" }}>
              "{generatedPlan.narrative}"
            </p>
          )}

          <h3 style={{ marginTop: "20px", marginBottom: "12px", color: "#14532d" }}>Itinerary Sequence</h3>
          <div>
            {(generatedPlan.stopDetails || []).map((stop, idx) => (
              <TrailStop key={stop.id || idx} stop={stop} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* Landmark Selection Grid */}
      <section style={{ marginBottom: "36px" }}>
        <h2>Choose Heritage Places to Include</h2>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          Click to add or remove places from your custom trail:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {availablePlaces.slice(0, 8).map((place) => (
            <PlaceCard
              key={place._id || place.id}
              place={place}
              isSelected={selectedPlaceIds.includes(place._id || place.id)}
              onSelect={handleTogglePlace}
            />
          ))}
        </div>
      </section>

      {/* Community Published Trails */}
      {publishedTrails.length > 0 && (
        <section>
          <h2>Community & Curator Approved Trails</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "16px" }}>
            {publishedTrails.map((trail) => (
              <article
                key={trail.id || trail._id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#ffffff",
                }}
              >
                <span style={{ backgroundColor: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                  {trail.theme || "Heritage Trail"}
                </span>
                <h3 style={{ margin: "10px 0 6px 0" }}>{trail.title}</h3>
                <p style={{ color: "#6b7280", fontSize: "13px" }}>
                  ⏱ ~{trail.estimatedMinutes || 90} mins | {trail.stops?.length || 0} stops
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default TrailPlannerPage;
