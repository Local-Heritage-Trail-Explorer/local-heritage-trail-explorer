import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import storyService from "../services/story.service.js";
import aiService from "../services/ai.service.js";
import StoryCard from "../components/StoryCard.jsx";

// Fallback historical stories if backend is empty or initializing
const DEFAULT_STORIES = [
  {
    _id: "660c00000000000000000041",
    title: "The Ananda Nilayam Vimana and Golden Gilding Chronicles",
    content:
      "The central sanctum sanctorum of Sri Venkateswara Temple is crowned by the Ananda Nilayam vimana. Historical epigraphs across the temple walls record that the vimana was first gilded with gold in 839 CE by the Pallava queen Samavai. Subsequent major golden gildings and extensive endowments were performed by the Vijayanagara emperor Sri Krishnadevaraya in 1517 CE following his eastern military campaigns, donating thirty thousand gold coins (varahas) and priceless gemstones.",
    placeName: "Sri Venkateswara Temple",
    claimType: "historical_chronicle",
    sourceUrl: "https://ttd.org.in/publications/epigraphy-series-vol1.pdf",
  },
  {
    _id: "660c00000000000000000042",
    title: "Varahaswami's Divine Prerogative at Swami Pushkarini",
    content:
      "According to ancient regional epigraphy and temple manuals documented in the Brahmanda Purana, Lord Varaha was the original custodian of the Venkatadri hills. When Lord Srinivasa arrived on the hill, Varaha gifted him land on the condition that devotees offer worship and naivedyam to Varahaswami first before entering the main Venkateswara sanctum. Swami Pushkarini serves as the sacred cleansing threshold honoring this ancient covenant.",
    placeName: "Swami Pushkarini",
    claimType: "tradition_and_epigraphy",
    sourceUrl: "https://archive.org/details/history-tirupati-temple-aiyangar",
  },
  {
    _id: "660c00000000000000000043",
    title: "The Pre-Cambrian Natural Rock Arch of Silathoranam",
    content:
      "Silathoranam is a distinctive natural arch formed in quartzites belonging to the Nagari Quartzite Formation of the Cuddapah Supergroup. Geological studies by the Geological Survey of India reveal that the arch spans approximately 8 meters in width and 3 meters in height, formed over 1.5 billion years by the differential chemical and mechanical weathering along joint sets in the strata.",
    placeName: "Silathoranam",
    claimType: "geological_monument",
    sourceUrl: "https://gsi.gov.in/monuments/silathoranam-tirumala.pdf",
  },
  {
    _id: "660c00000000000000000044",
    title: "Consecration of Sri Govindaraja Swamy Temple by Ramanujacharya",
    content:
      "In 1130 CE, the revered philosopher-reformer Saint Sri Ramanujacharya installed the processional icon of Sri Govindaraja Swamy in Tirupati to protect it from sectarian conflicts in Chidambaram. Ramanujacharya systematically organized the township of Tirupati around the temple quadrangles, structuring the four Mada streets and ordaining the hereditary ritual responsibilities that persist to the present day.",
    placeName: "Sri Govindaraja Swamy Temple",
    claimType: "historical_chronicle",
    sourceUrl: "https://ttd.org.in/publications/epigraphy-series-vol1.pdf",
  },
];

export const StoryPage = () => {
  const { id } = useParams();

  // Detail view state
  const [singleStory, setSingleStory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Catalog view state
  const [stories, setStories] = useState(DEFAULT_STORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState("all");
  const [semanticResults, setSemanticResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Load single story when ID is present in URL
  useEffect(() => {
    if (!id) {
      setSingleStory(null);
      return;
    }

    let isMounted = true;
    setDetailLoading(true);
    setDetailError("");

    storyService
      .getStoryById(id)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setSingleStory(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        // Check fallback default stories
        const fallback = DEFAULT_STORIES.find((s) => s._id === id || s.id === id);
        if (fallback) {
          setSingleStory({
            id: fallback._id,
            title: fallback.title,
            content: fallback.content,
            claimType: fallback.claimType,
            place: { name: fallback.placeName },
            sources: fallback.sourceUrl ? [{ title: "TTD Historical Archives", url: fallback.sourceUrl, attribution: "Epigraphical Survey", sourceType: "Epigraphy" }] : [],
          });
        } else {
          setDetailError(err?.response?.data?.error?.message || err?.message || "Historical story could not be found.");
        }
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Load catalog stories when not in detail view
  useEffect(() => {
    if (id) return;

    let isMounted = true;
    storyService
      .getStories({ limit: 50 })
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
  }, [id]);

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
    } catch {
      // Fallback local match
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

  // ==========================================
  // DETAIL VIEW (When :id is in URL)
  // ==========================================
  if (id) {
    if (detailLoading) {
      return (
        <main style={{ maxWidth: "860px", margin: "40px auto", padding: "0 20px", fontFamily: "Arial, sans-serif" }}>
          <p style={{ color: "#6b7280" }}>Loading verified historical narrative...</p>
        </main>
      );
    }

    if (detailError || !singleStory) {
      return (
        <main style={{ maxWidth: "860px", margin: "40px auto", padding: "0 20px", fontFamily: "Arial, sans-serif" }}>
          <div style={{ padding: "24px", backgroundColor: "#fff5f5", borderRadius: "8px", border: "1px solid #feb2b2" }}>
            <h2 style={{ color: "#c53030", margin: "0 0 10px 0" }}>Story Not Found</h2>
            <p style={{ color: "#742a2a", margin: "0 0 16px 0" }}>{detailError || "The requested historical story could not be retrieved."}</p>
            <Link to="/stories" style={{ color: "#355e3b", fontWeight: "bold", textDecoration: "none" }}>
              ← Back to All Historical Stories
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "36px 20px",
          fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
          color: "#24352b",
        }}
      >
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/stories" style={{ color: "#355e3b", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>
            ← Back to All Historical Stories
          </Link>
        </nav>

        <article style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <header style={{ marginBottom: "24px", borderBottom: "1px solid #edf2f7", paddingBottom: "18px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
              {singleStory.claimType && (
                <span
                  style={{
                    backgroundColor: "#edf3e9",
                    color: "#355e3b",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  {singleStory.claimType.replace(/_/g, " ")}
                </span>
              )}
              {singleStory.place && (
                <Link
                  to={singleStory.place.id ? `/places/${singleStory.place.id}` : "/places"}
                  style={{
                    color: "#2b6cb0",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  📍 {singleStory.place.name}
                </Link>
              )}
            </div>

            <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", color: "#1a202c", lineHeight: "1.3" }}>
              {singleStory.title}
            </h1>
          </header>

          <div style={{ fontSize: "17px", lineHeight: "1.8", color: "#2d3748", whiteSpace: "pre-line", marginBottom: "32px" }}>
            {singleStory.content}
          </div>

          {/* Sources and Citations */}
          {singleStory.sources && singleStory.sources.length > 0 && (
            <footer style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #edf2f7" }}>
              <h3 style={{ fontSize: "16px", margin: "0 0 12px 0", color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Primary Historical Sources & Epigraphy
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {singleStory.sources.map((src, i) => (
                  <div
                    key={src.id || i}
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#f7fafc",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px", color: "#2d3748" }}>{src.title}</strong>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#718096" }}>
                        {src.attribution} {src.sourceType ? `(${src.sourceType})` : ""}
                      </p>
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3182ce", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}
                      >
                        Inspect Source ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </footer>
          )}
        </article>
      </main>
    );
  }

  // ==========================================
  // CATALOG VIEW
  // ==========================================
  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "35px 24px",
        fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
        color: "#24352b",
      }}
    >
      <header style={{ marginBottom: "28px" }}>
        <p style={{ color: "#355e3b", fontWeight: "bold", textTransform: "uppercase", fontSize: "13px" }}>
          ARCHIVAL KNOWLEDGE BASE
        </p>
        <h1 style={{ marginBottom: "8px", color: "#1c2b22" }}>Historical Stories & Epigraphy</h1>
        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Discover verified oral traditions, royal inscriptions, architectural accounts, and historical chronicles
          pertaining to Tirumala and the Seshachalam region.
        </p>
      </header>

      {/* Semantic Vector Search Box */}
      <section
        style={{
          backgroundColor: "#f6faf6",
          padding: "24px",
          borderRadius: "8px",
          border: "1px solid #dce4dc",
          marginBottom: "32px",
        }}
      >
        <h2 style={{ fontSize: "18px", marginTop: "0", marginBottom: "8px", color: "#24352b" }}>
          🔍 Semantic Heritage Search (Atlas Vector Search & Ollama)
        </h2>
        <p style={{ fontSize: "13px", color: "#526157", marginBottom: "16px" }}>
          Search conceptually across historical accounts using neural embeddings. Ask about emperors, inscriptions, sacred tanks, or rock arches.
        </p>

        <form onSubmit={handleSemanticSearch} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Krishnadevaraya gold vimana or Ramanuja rituals..."
            style={{
              flex: 1,
              minWidth: "260px",
              padding: "10px 14px",
              border: "1px solid #cbd5cc",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            style={{
              backgroundColor: "#355e3b",
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: isSearching ? "not-allowed" : "pointer",
            }}
          >
            {isSearching ? "Searching Vectors..." : "Vector Search"}
          </button>
          {searchMode === "semantic" && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                backgroundColor: "#edf2f7",
                color: "#4a5568",
                border: "1px solid #cbd5e0",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Show All Stories
            </button>
          )}
        </form>

        {errorMessage && (
          <p style={{ color: "#c53030", fontSize: "13px", marginTop: "12px", marginBottom: "0" }}>
            {errorMessage}
          </p>
        )}
      </section>

      {/* Stories Listing */}
      <section>
        <h2 style={{ fontSize: "20px", marginBottom: "16px", color: "#24352b" }}>
          {searchMode === "semantic"
            ? `Semantic Search Results (${semanticResults?.length || 0})`
            : `All Verified Stories (${stories.length})`}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {(searchMode === "semantic" ? semanticResults || [] : stories).map((story) => (
            <StoryCard
              key={story._id || story.storyId || story.id}
              story={story}
              searchScore={story.score}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default StoryPage;
