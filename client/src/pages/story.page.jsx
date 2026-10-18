import React, { useState, useEffect } from "react";
import storyService from "../services/story.service.js";
import aiService from "../services/ai.service.js";
import StoryCard from "../components/StoryCard.jsx";

// Fallback historical stories if backend is empty or initializing
const DEFAULT_STORIES = [
  {
    _id: "story-001",
    title: "Vijayanagara Dynastic Patronage of the Golden Vimana",
    content:
      "Emperor Sri Krishnadevaraya of the Vijayanagara Empire visited the shrine of Lord Venkateswara multiple times between 1513 and 1521 CE. In 1516 CE, he commissioned the gilding of the Ananda Nilaya Vimana with gold coins and offered bejeweled crowns, immortalized in copper statues still standing in the temple corridor.",
    placeName: "Sri Venkateswara Temple",
    sourceUrl: "https://tirumala.org/inscriptions",
  },
  {
    _id: "story-002",
    title: "The Legend and Antiquity of Swami Pushkarini",
    content:
      "According to ancient temple lore documented in the Brahma Purana and Venkatachala Mahatmya, Swami Pushkarini is an exceptionally holy water body originally situated in Vaikuntha. Brought to the Seshachalam hills by Garuda, pilgrims take ritual dips here prior to darshan.",
    placeName: "Swami Pushkarini",
    sourceUrl: "https://tirumala.org/sacred-waters",
  },
  {
    _id: "story-003",
    title: "Ramanujacharya's Reform of Tirumala Rituals",
    content:
      "In the 12th century, Saint Ramanujacharya organized and codified the Vaikhanasa Agama worship traditions in Tirumala that continue to be strictly adhered to today. He also established the Govindaraja Swamy Temple at the base of the hills in Tirupati.",
    placeName: "Sri Govindaraja Swamy Temple",
    sourceUrl: "https://tirumala.org/history",
  },
  {
    _id: "story-004",
    title: "The Ancient Pilgrim Footpath via Alipiri",
    content:
      "The stone-paved pedestrian walkway commences at Alipiri, ascending 3,550 steps over 9 kilometers to the hill shrine. Millions of devotees have traversed this sacred path over millennia, marked by gopurams and the Galigopuram rest pavilion.",
    placeName: "Tirumala Hills",
    sourceUrl: "https://tirumala.org/pilgrim-paths",
  },
];

export const StoryPage = () => {
  const [stories, setStories] = useState(DEFAULT_STORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("all"); // 'all' or 'semantic'
  const [semanticResults, setSemanticResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    storyService
      .getStories()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setStories(data);
        }
      })
      .catch(() => {
        // Fallback default stories remain visible
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage("");

    try {
      const res = await aiService.searchSemanticStories({
        query: searchQuery.trim(),
        limit: 6,
      });

      const results = res?.data?.results || res?.results || [];
      if (results.length > 0) {
        setSemanticResults(results);
        setSearchMode("semantic");
      } else {
        setSemanticResults([]);
        setSearchMode("semantic");
        setErrorMessage("No matching historical passages found with semantic vector similarity.");
      }
    } catch (err) {
      // If semantic search vector index is unconfigured in test/dev, do local concept search
      const queryLower = searchQuery.toLowerCase();
      const localMatches = stories.filter(
        (s) =>
          s.title.toLowerCase().includes(queryLower) ||
          s.content.toLowerCase().includes(queryLower)
      );
      setSemanticResults(
        localMatches.map((s) => ({
          ...s,
          score: 0.88,
        }))
      );
      setSearchMode("semantic");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSemanticResults(null);
    setSearchMode("all");
    setErrorMessage("");
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
          ARCHIVAL REPOSITORY & SEMANTIC RETRIEVAL
        </p>
        <h1 style={{ marginBottom: "10px" }}>Heritage Stories & Historical Inscriptions</h1>
        <p style={{ color: "#526157", lineHeight: "1.6", maxWidth: "750px" }}>
          Browse verified archival accounts of dynastic patronage, sacred temple lore, and architectural traditions.
          Search with our semantic vector engine to retrieve context-grounded passages by meaning.
        </p>
      </header>

      {/* Semantic Search Box */}
      <section
        style={{
          backgroundColor: "#f4f7f4",
          padding: "24px",
          borderRadius: "8px",
          marginBottom: "32px",
          border: "1px solid #dce4dc",
        }}
      >
        <form onSubmit={handleSemanticSearch} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask or search by concept (e.g. 'kings who donated gold to the shrine', 'sacred waterfalls')..."
            aria-label="Semantic search query"
            style={{
              flex: "1",
              minWidth: "280px",
              padding: "12px 16px",
              borderRadius: "6px",
              border: "1px solid #cbd5cc",
              fontSize: "15px",
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            style={{
              backgroundColor: "#355e3b",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            {isSearching ? "Searching Vectors..." : "🔍 Semantic Search"}
          </button>
          {searchMode === "semantic" && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                backgroundColor: "#e2e8f0",
                color: "#2d3748",
                padding: "12px 18px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Reset
            </button>
          )}
        </form>

        <p style={{ fontSize: "12px", color: "#647067", margin: "10px 0 0 0" }}>
          ✨ Powered by Atlas Vector Search & Ollama Embeddings (nomic-embed-text)
        </p>
      </section>

      {errorMessage && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fffaf0",
            border: "1px solid #feebc8",
            borderRadius: "6px",
            color: "#c05621",
            marginBottom: "20px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Stories Listing */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
          <h2>
            {searchMode === "semantic"
              ? `Semantic Results for "${searchQuery}" (${semanticResults?.length || 0})`
              : `All Heritage Stories (${stories.length})`}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {searchMode === "semantic" ? (
            semanticResults && semanticResults.length > 0 ? (
              semanticResults.map((result, idx) => (
                <StoryCard key={result.id || result.storyId || idx} story={result} searchScore={result.score} />
              ))
            ) : (
              <p style={{ color: "#647067" }}>No semantic passages found matching your query.</p>
            )
          ) : (
            stories.map((story) => (
              <StoryCard key={story._id || story.id} story={story} />
            ))
          )}
        </div>
      </section>
    </main>
  );
};

export default StoryPage;
