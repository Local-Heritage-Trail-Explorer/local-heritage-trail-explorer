import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const HomePage = () => {
  const { user } = useAuth();

  const sections = [
    {
      title: "Heritage Places",
      description:
        "Explore historic temples, landmarks, and important places around Tirumala and Tirupati.",
      link: "/places",
      button: "Explore Places",
    },
    {
      title: "Heritage Stories",
      description:
        "Discover the history, traditions, and stories connected to local heritage.",
      link: "/stories",
      button: "Read Stories",
    },
    {
      title: "Trail Planner",
      description:
        "Explore the idea of planning a heritage trail around the places you want to visit.",
      link: "/trail-planner",
      button: "Plan a Trail",
    },
  ];

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
        color: "#24352b",
        lineHeight: "1.6",
      }}
    >
      <header
        style={{
          textAlign: "center",
          padding: "35px 15px",
          marginBottom: "30px",
          backgroundColor: "#f1f5ed",
          borderRadius: "8px",
        }}
      >
        <p
          style={{
            color: "#54745b",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          LOCAL HERITAGE TRAIL EXPLORER
        </p>

        <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: "10px 0" }}>
          Explore India's Local Heritage
        </h1>

        <p
          style={{
            maxWidth: "680px",
            margin: "0 auto 22px",
            color: "#526157",
            fontSize: "17px",
          }}
        >
          "Explore historic temples, landmarks, and important places across India."
        </p>

        <Link
          to="/places"
          style={{
            display: "inline-block",
            backgroundColor: "#355e3b",
            color: "white",
            padding: "11px 22px",
            borderRadius: "5px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Start Exploring
        </Link>
      </header>

      <section>
        <h2 style={{ textAlign: "center", marginBottom: "8px" }}>
          Explore the Project
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#647067",
            marginBottom: "25px",
          }}
        >
          Choose where you would like to begin.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "20px",
          }}
        >
          {sections.map((section) => (
            <article
              key={section.title}
              style={{
                padding: "22px",
                border: "1px solid #dce4dc",
                borderRadius: "7px",
                backgroundColor: "#ffffff",
              }}
            >
              <h3 style={{ marginTop: "0", color: "#355e3b" }}>
                {section.title}
              </h3>

              <p style={{ color: "#526157", minHeight: "75px" }}>
                {section.description}
              </p>

              <Link
                to={section.link}
                style={{
                  color: "#355e3b",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                {section.button} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {!user && (
        <section
          style={{
            marginTop: "35px",
            padding: "25px",
            backgroundColor: "#f7f7f2",
            border: "1px solid #e1e5d9",
            borderRadius: "7px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: "0" }}>Save Your Heritage Journeys</h2>

          <p style={{ color: "#526157" }}>
            Create a visitor account to get started with saving trails and
            tracking your heritage journeys.
          </p>

          <Link
            to="/signup"
            style={{
              display: "inline-block",
              backgroundColor: "#355e3b",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "5px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Sign Up as Visitor
          </Link>
        </section>
      )}
    </div>
  );
};

export default HomePage;