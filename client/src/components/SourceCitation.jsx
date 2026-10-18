import React from "react";

export const SourceCitation = ({ citation, index }) => {
  if (!citation) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: "#e2e8f0",
        color: "#2d3748",
        fontSize: "0.8rem",
        fontWeight: "500",
        padding: "0.2rem 0.5rem",
        borderRadius: "9999px",
        marginRight: "0.4rem",
        marginBottom: "0.4rem",
        border: "1px solid #cbd5e0",
      }}
      title={`Source Document: ${citation.title || citation.id} (Page ${citation.page || "N/A"})`}
    >
      <span style={{ marginRight: "0.25rem", color: "#4a5568", fontWeight: "bold" }}>
        [{index !== undefined ? index + 1 : "•"}]
      </span>
      <span>{citation.title || citation.id}</span>
      {citation.page && (
        <span style={{ marginLeft: "0.25rem", color: "#718096" }}>
          (p. {citation.page})
        </span>
      )}
    </span>
  );
};

export default SourceCitation;
