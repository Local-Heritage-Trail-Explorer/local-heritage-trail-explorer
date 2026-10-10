import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "#1a202c",
    color: "#fff",
    fontFamily: "sans-serif",
  };

  const linkStyle = {
    color: "#e2e8f0",
    textDecoration: "none",
    marginRight: "1.5rem",
    fontSize: "0.95rem",
  };

  const badgeStyle = {
    background: user?.role === "CURATOR" ? "#805ad5" : user?.role === "GUIDE" ? "#dd6b20" : "#319795",
    color: "#fff",
    padding: "0.2rem 0.6rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    marginLeft: "0.5rem",
  };

  return (
    <nav style={navStyle}>
      <div>
        <Link to="/" style={{ ...linkStyle, fontSize: "1.2rem", fontWeight: "bold", color: "#f6ad55" }}>
          Tirumala Heritage Explorer
        </Link>
        <Link to="/places" style={linkStyle}>Places</Link>
        <Link to="/stories" style={linkStyle}>Stories</Link>
        <Link to="/trail-planner" style={linkStyle}>Trails</Link>
        {user && <Link to="/saved-trails" style={linkStyle}>Saved Trails</Link>}
        {user?.role === "CURATOR" && <Link to="/curator" style={{ ...linkStyle, color: "#d6bcfa" }}>Curator Panel</Link>}
        {user?.role === "GUIDE" && <Link to="/guide" style={{ ...linkStyle, color: "#fbd38d" }}>Guide Panel</Link>}
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ marginRight: "1rem", fontSize: "0.9rem" }}>
              {user.name} <span style={badgeStyle}>{user.role}</span>
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: "#e53e3e",
                color: "#fff",
                border: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link
              to="/signup"
              style={{
                ...linkStyle,
                background: "#3182ce",
                color: "#fff",
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                marginRight: 0,
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
