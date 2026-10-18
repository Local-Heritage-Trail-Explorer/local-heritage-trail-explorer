import React, { useState, useEffect } from "react";
import storyService from "../services/story.service.js";

const DEFAULT_SOURCES = [
  {
    _id: "src-01",
    title: "Epigraphia Tirupati — Vol. IV: Vijayanagara Inscriptions",
    author: "Sadhu Subrahmanya Sastry",
    publicationYear: 1930,
    institution: "Tirumala Tirupati Devasthanams",
    description:
      "Comprehensive transcriptions and translations of copper plate and stone inscriptions in the Tirumala temple complex.",
    url: "https://tirumala.org/epigraphia",
  },
  {
    _id: "src-02",
    title: "Tirupati Devasthanam Epigraphical Series",
    author: "V. Vijayaraghavacharya",
    publicationYear: 1938,
    institution: "TTD Oriental Research Institute",
    description:
      "Historical analysis of royal grants, endowments, and temple governance under Chola, Pandya, and Vijayanagara monarchs.",
    url: "https://tirumala.org/epigraphical-series",
  },
  {
    _id: "src-03",
    title: "The Seshachalam Forest & Sacred Waterways",
    author: "Archaeological Survey of India",
    publicationYear: 1965,
    institution: "ASI Southern Circle",
    description:
      "Survey of waterfalls, sacred tanks (theerthams), and ancient stone step routes in the Tirumala hills.",
    url: "https://asi.nic.in/seshachalam-survey",
  },
];

export const SourcePage = () => {
  const [sources, setSources] = useState(DEFAULT_SOURCES);

  useEffect(() => {
    let isMounted = true;
    storyService
      .getSources()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setSources(data);
        }
      })
      .catch(() => {
        // Fallback default sources remain visible
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
        <p style={{ color: "#54745b", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          HISTORICAL EVIDENCE & ARCHIVAL RECORDS
        </p>
        <h1 style={{ marginBottom: "10px" }}>Primary Sources & References</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Explore peer-reviewed epigraphical volumes, temple inscriptions, and archaeological publications that ground our heritage stories.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        {sources.map((src) => (
          <article
            key={src._id || src.id}
            style={{
              border: "1px solid #dce4dc",
              borderRadius: "8px",
              padding: "22px",
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                backgroundColor: "#edf3e9",
                color: "#355e3b",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              Published: {src.publicationYear || "Historical Archive"}
            </span>

            <h3 style={{ fontSize: "18px", margin: "10px 0 6px 0", color: "#1f2937" }}>
              {src.title}
            </h3>

            <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 10px 0" }}>
              Author / Editor: {src.author || "TTD Archival Board"} ({src.institution || "TTD"})
            </p>

            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.5" }}>
              {src.description}
            </p>

            {src.url && (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "12px",
                  color: "#355e3b",
                  fontWeight: "bold",
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                Access Archival Document ↗
              </a>
            )}
          </article>
        ))}
      </div>
    </main>
  );
};

export default SourcePage;
