import React, { useState, useEffect } from "react";
import placeService from "../services/place.service.js";

const heritagePlaces = [
  {
    id: 1,
    name: "Sri Venkateswara Temple",
    location: "Tirumala, Andhra Pradesh",
    category: "Temple",
    region: "tirumala",
    description:
      "A famous Hindu temple dedicated to Lord Venkateswara, located on the Tirumala hills.",
  },
  {
    id: 2,
    name: "Sri Padmavathi Ammavari Temple",
    location: "Tiruchanur, Tirupati",
    category: "Temple",
    region: "tirumala",
    description:
      "A significant temple dedicated to Goddess Padmavathi, associated with the Tirupati region.",
  },
  {
    id: 3,
    name: "Kapila Theertham",
    location: "Tirupati, Andhra Pradesh",
    category: "Sacred Site",
    region: "tirumala",
    description:
      "A sacred site known for its temple and waterfall near the foothills of Tirumala.",
  },
  {
    id: 4,
    name: "Chandragiri Fort",
    location: "Chandragiri, near Tirupati",
    category: "Historic Site",
    region: "tirumala",
    description:
      "A historic fort associated with the Vijayanagara period and the region's past.",
  },
  {
    id: 5,
    name: "Sri Govindaraja Swamy Temple",
    location: "Tirupati, Andhra Pradesh",
    category: "Temple",
    region: "tirumala",
    description:
      "An important historic temple in Tirupati, known for its traditional architecture.",
  },
  {
    id: 6,
    name: "Tirumala Hills",
    location: "Tirumala, Andhra Pradesh",
    category: "Natural Heritage",
    region: "tirumala",
    description:
      "A range of hills known for their natural surroundings, sacred paths, and heritage.",
  },
  {
    id: 7,
    name: "Virupaksha Temple",
    location: "Hampi, Karnataka",
    category: "Temple",
    region: "hampi",
    description: "A historic temple in the ancient city of Hampi.",
  },
  {
    id: 8,
    name: "Charminar",
    location: "Hyderabad, Telangana",
    category: "Historic Site",
    region: "hyderabad",
    description: "A famous historic monument in the heart of Hyderabad.",
  },
  {
    id: 9,
    name: "Konark Sun Temple",
    location: "Konark, Odisha",
    category: "Temple",
    region: "konark",
    description: "A renowned temple known for its stone chariot architecture.",
  },
  {
    id: 10,
    name: "Ajanta Caves",
    location: "Ajanta, Maharashtra",
    category: "Historic Site",
    region: "ajanta",
    description: "Ancient rock-cut caves known for Buddhist art and paintings.",
  },
  {
    id: 11,
    name: "Shore Temple",
    location: "Mahabalipuram, Tamil Nadu",
    category: "Temple",
    region: "mahabalipuram",
    description: "A historic stone temple overlooking the Bay of Bengal.",
  },
];

const categories = [
  "All",
  "Temple",
  "Sacred Site",
  "Historic Site",
  "Natural Heritage",
];

const PlacesPage = () => {
  const [placesList, setPlacesList] = useState(heritagePlaces);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");

  useEffect(() => {
    let isMounted = true;
    placeService
      .getPlaces()
      .then((res) => {
        if (!isMounted) return;
        const apiPlaces = res?.data || res;
        if (Array.isArray(apiPlaces) && apiPlaces.length > 0) {
          // Normalize API places to ensure name, location/zone, and category are formatted
          const formatted = apiPlaces.map((p) => ({
            id: p._id || p.id,
            name: p.name,
            location: p.zone || p.location || "Tirumala Heritage Region",
            category: p.category || "Heritage Site",
            region: (p.zone || p.location || "tirumala").toLowerCase(),
            description: p.description || p.historicalSignificance || "Historic heritage landmark.",
          }));
          setPlacesList(formatted);
        }
      })
      .catch(() => {
        // Fallback to static heritagePlaces continues
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPlaces = placesList.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(search.toLowerCase()) ||
      (place.location && place.location.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || place.category === selectedCategory;
    const matchesRegion =
      selectedRegion === "All" || (place.region && place.region.includes(selectedRegion.toLowerCase()));
    return matchesSearch && matchesCategory && matchesRegion;
  });

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
        <p style={{ color: "#54745b", fontWeight: "bold" }}>
          DISCOVER LOCAL HERITAGE
        </p>

        <h1 style={{ marginBottom: "10px" }}>Heritage Places</h1>

        <p style={{ color: "#526157", lineHeight: "1.6" }}>
          Explore temples, historic landmarks, and sacred sites around Tirumala
          and Tirupati.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "25px",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search places or locations..."
          aria-label="Search heritage places"
          style={{
            flex: "1",
            minWidth: "220px",
            padding: "12px",
            border: "1px solid #cbd5cc",
            borderRadius: "5px",
            fontSize: "15px",
          }}
        />

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          aria-label="Filter by category"
          style={{
            minWidth: "180px",
            padding: "12px",
            border: "1px solid #cbd5cc",
            borderRadius: "5px",
            backgroundColor: "white",
            fontSize: "15px",
          }}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "All" ? "All categories" : category}
            </option>
          ))}
        </select>
        <select
        value={selectedRegion}
        onChange={(event) => setSelectedRegion(event.target.value)}
        aria-label="Filter by region"
        style={{
            minWidth: "200px",
            padding: "12px",
            border: "1px solid #cbd5cc",
            borderRadius: "5px",
            backgroundColor: "white",
            fontSize: "15px",
        }}
        >
        <option value="All">All Regions</option>
        <option value="tirumala">Tirumala–Tirupati</option>
        <option value="hampi">Hampi</option>
        <option value="hyderabad">Hyderabad</option>
        <option value="konark">Konark</option>
        <option value="ajanta">Ajanta</option>
        <option value="mahabalipuram">Mahabalipuram</option>
        </select>
      </section>

      <p style={{ color: "#647067", marginBottom: "20px" }}>
        Showing {filteredPlaces.length} of {placesList.length} places
      </p>

      {filteredPlaces.length > 0 ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredPlaces.map((place) => (
            <article
              key={place.id}
              style={{
                border: "1px solid #dce4dc",
                borderRadius: "7px",
                padding: "22px",
                backgroundColor: "white",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "#edf3e9",
                  color: "#355e3b",
                  padding: "5px 9px",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
              >
                {place.category}
              </span>

              <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
                {place.name}
              </h2>

              <p style={{ color: "#647067", fontSize: "14px" }}>
                {place.location}
              </p>

              <p style={{ lineHeight: "1.6" }}>{place.description}</p>
            </article>
          ))}
        </section>
      ) : (
        <p>
          No places found. Try another search term or select a different
          category.
        </p>
      )}
    </main>
  );
};

export default PlacesPage;