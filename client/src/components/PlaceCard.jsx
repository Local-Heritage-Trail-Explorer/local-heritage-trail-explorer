import React from "react";
import { Link } from "react-router-dom";

export const PlaceCard = ({ place, onSelect, isSelected = false }) => {
  if (!place) return null;

  return (
    <article
      style={{
        border: isSelected ? "2px solid #355e3b" : "1px solid #dce4dc",
        borderRadius: "8px",
        padding: "20px",
        backgroundColor: isSelected ? "#f6faf6" : "#ffffff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.2s ease-in-out",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span
            style={{
              backgroundColor: "#edf3e9",
              color: "#355e3b",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {place.category || "Heritage Site"}
          </span>
          {place.estimatedVisitMinutes && (
            <span style={{ fontSize: "12px", color: "#647067" }}>
              ⏱ {place.estimatedVisitMinutes} mins
            </span>
          )}
        </div>

        <h3 style={{ fontSize: "18px", margin: "6px 0", color: "#24352b" }}>
          {place.name}
        </h3>

        <p style={{ color: "#647067", fontSize: "13px", margin: "4px 0 10px 0" }}>
          📍 {place.location || place.zone || "Tirumala Heritage Region"}
        </p>

        <p style={{ color: "#526157", fontSize: "14px", lineHeight: "1.5", margin: "0" }}>
          {place.description || place.historicalSignificance}
        </p>
      </div>

      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f4f0" }}>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(place)}
            style={{
              width: "100%",
              backgroundColor: isSelected ? "#e53e3e" : "#355e3b",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            {isSelected ? "Remove from Trail" : "+ Add to Trail"}
          </button>
        ) : (
          <Link
            to={`/places/${place._id || place.id}`}
            style={{
              color: "#355e3b",
              fontWeight: "bold",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            View Details →
          </Link>
        )}
      </div>
    </article>
  );
};

export default PlaceCard;
