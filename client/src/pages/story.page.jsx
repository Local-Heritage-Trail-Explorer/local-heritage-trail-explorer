
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.service.js";

const sampleStories = [
  {
    id: "sample-1",
    title: "The History of Tirumala",
    category: "History",
    place: "Tirumala",
    summary:
      "Explore the historical traditions and cultural heritage associated with the Tirumala hills.",
  },
  {
    id: "sample-2",
    title: "Temple Architecture and Craftsmanship",
    category: "Architecture",
    place: "Tirupati Region",
    summary:
      "Discover the architectural features, artistic traditions, and craftsmanship of the region.",
  },
  {
    id: "sample-3",
    title: "Sacred Water and Living Traditions",
    category: "Traditions",
    place: "Tirumala",
    summary:
      "Learn about the cultural significance of sacred water and traditions connected with local heritage.",
  },
];

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e1e8df",
  borderRadius: "14px",
  padding: "24px",
};

export default function StoryPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingSamples, setUsingSamples] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadStories = async () => {
      try {
        // The current API contract documents GET /stories/:id,
        // but does not define a story-list endpoint.
        // Use clearly labelled sample content until the backend
        // team confirms the approved story-list API.
        if (active) {
          setStories(sampleStories);
          setUsingSamples(true);
          setError("");
        }
      } catch {
        if (active) {
          setError("Stories could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: "1150px",
        margin: "0 auto",
        padding: "36px 24px 60px",
        color: "#24352b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          background: "#f1f5ed",
          borderRadius: "18px",
          padding: "36px 28px",
          marginBottom: "32px",
        }}
      >
        <p
          style={{
            color: "#54745b",
            fontWeight: 700,
            letterSpacing: "2px",
            fontSize: "12px",
          }}
        >
          DISCOVER LOCAL HISTORY
        </p>

        <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", margin: "12px 0" }}>
          Heritage Stories
        </h1>

        <p style={{ maxWidth: "650px", lineHeight: 1.8, color: "#526157" }}>
          Explore the history, architecture, traditions and cultural memories
          that bring heritage places to life.
        </p>

        <Link
          to="/places"
          style={{
            display: "inline-block",
            marginTop: "12px",
            background: "#355e3b",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "7px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Explore Heritage Places →
        </Link>
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "6px" }}>Stories to Explore</h2>
          <p style={{ margin: 0, color: "#647067" }}>
            Discover the people, places and traditions behind local heritage.
          </p>
        </div>

        <span
          style={{
            background: "#edf3e9",
            color: "#355e3b",
            padding: "7px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {stories.length} stories
        </span>
      </div>

      {loading ? (
        <p>Loading stories…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          {usingSamples && (
            <p
              style={{
                background: "#fff8e8",
                border: "1px solid #f0dfb6",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#725a25",
                fontSize: "14px",
              }}
            >
              Demonstration content: these sample stories are not verified
              historical articles. Live approved stories will be connected
              when the backend provides its list endpoint.
            </p>
          )}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {stories.map((story) => (
              <article key={story.id} style={cardStyle}>
                <span
                  style={{
                    display: "inline-block",
                    background: "#edf3e9",
                    color: "#355e3b",
                    borderRadius: "20px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {story.category}
                </span>

                <h3 style={{ marginTop: "18px", lineHeight: 1.4 }}>
                  {story.title}
                </h3>

                <p style={{ color: "#647067", fontSize: "14px" }}>
                  {story.place}
                </p>

                <p style={{ lineHeight: 1.7, color: "#526157" }}>
                  {story.summary}
                </p>

                <p style={{ fontSize: "13px", color: "#647067" }}>
                  Full story and source citations will be available when
                  approved story records are connected.
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
