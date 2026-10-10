import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await signup({ name, email, password });
      if (res.success) {
        setSuccessMsg(res.data?.message || "Registration successful! Please check your email to verify your account.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "3rem auto", padding: "2rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Create Visitor Account</h2>

      {errorMsg && (
        <div style={{ background: "#fed7d7", color: "#9b2c2c", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ background: "#c6f6d5", color: "#22543d", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {successMsg}
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e0", boxSizing: "border-box" }}
              placeholder="Your Name"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e0", boxSizing: "border-box" }}
              placeholder="visitor@example.com"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Password (min 8 chars, 1 letter & 1 number)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e0", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#38a169",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
      )}

      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
        Already have an account? <Link to="/login" style={{ color: "#3182ce", textDecoration: "none", fontWeight: "bold" }}>Log In</Link>
      </div>
    </div>
  );
};

export default SignupPage;
