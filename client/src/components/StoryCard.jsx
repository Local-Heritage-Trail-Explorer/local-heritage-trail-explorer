import React from "react";
import { Link } from "react-router-dom";

export const StoryCard = ({ story, searchScore }) => {
  if (!story) return null;

  return (
    <article
      style={{
        border: "1px solid #dce4dc",
        borderRadius: "8px",
        padding: "20px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          {story.placeName && (
            <span style={{ fontSize: "12px", color: "#355e3b", fontWeight: "bold" }}>
              📍 {story.placeName}
            </span>
          )}
          {searchScore !== undefined && searchScore !== null && (
            <span
              style={{
                backgroundColor: "#e6fffa",
                color: "#234e52",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "bold",
                border: "1px solid #b2f5ea",
              }}
            >
              Relevance: {Math.round(searchScore * 100)}%
            </span>
          )}
        </div>

        <h3 style={{ fontSize: "18px", margin: "6px 0", color: "#24352b" }}>
          {story.title}
        </h3>

        <p style={{ color: "#526157", fontSize: "14px", lineHeight: "1.6", margin: "10px 0" }}>
          {story.content ? (story.content.length > 220 ? `${story.content.slice(0, 220)}...` : story.content) : ""}
        </p>
      </div>

      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f0f4f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {story.sourceUrl ? (
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3182ce", fontSize: "12px", textDecoration: "none" }}
          >
            Original Source ↗
          </a>
        ) : (
          <span style={{ color: "#a0aec0", fontSize: "12px" }}>Archival Record</span>
        )}

        <Link
          to={`/stories/${story._id || story.storyId || story.id}`}
          style={{ color: "#355e3b", fontWeight: "bold", fontSize: "13px", textDecoration: "none" }}
        >
          Read Full Story →
        </Link>
      </div>
    </article>
  );
};

export default StoryCard;
