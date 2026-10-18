import React from "react";

export const TrailStop = ({
  stop,
  index,
  isCompleted = false,
  onToggleComplete,
  isTracking = false,
}) => {
  if (!stop) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "16px",
        marginBottom: "12px",
        borderRadius: "8px",
        backgroundColor: isCompleted ? "#f0fdf4" : "#ffffff",
        border: isCompleted ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          backgroundColor: isCompleted ? "#16a34a" : "#355e3b",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "14px",
          marginRight: "14px",
          flexShrink: 0,
        }}
      >
        {isCompleted ? "✓" : index + 1}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1f2937" }}>
            {stop.name || `Stop #${index + 1}`}
          </h4>
          {stop.estimatedVisitMinutes && (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              ~{stop.estimatedVisitMinutes} mins
            </span>
          )}
        </div>

        {stop.zone && (
          <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#4b5563" }}>
            📍 {stop.zone}
          </p>
        )}

        {stop.historicalSignificance && (
          <p style={{ margin: "0", fontSize: "13px", color: "#374151", lineHeight: "1.4" }}>
            {stop.historicalSignificance}
          </p>
        )}
      </div>

      {onToggleComplete && (
        <button
          type="button"
          onClick={() => onToggleComplete(stop.id || stop._id)}
          disabled={isTracking}
          style={{
            marginLeft: "12px",
            padding: "6px 12px",
            borderRadius: "5px",
            border: isCompleted ? "1px solid #16a34a" : "1px solid #355e3b",
            backgroundColor: isCompleted ? "#16a34a" : "transparent",
            color: isCompleted ? "#ffffff" : "#355e3b",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {isCompleted ? "Completed" : "Mark Visited"}
        </button>
      )}
    </div>
  );
};

export default TrailStop;
