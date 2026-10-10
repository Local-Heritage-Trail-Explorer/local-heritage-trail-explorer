import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await forgotPassword({ email });
      setMessage(res.data?.message || "If an account exists with that email, a password reset link has been sent.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "3rem auto", padding: "2rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Reset Your Password</h2>

      {message && (
        <div style={{ background: "#c6f6d5", color: "#22543d", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {message}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#fed7d7", color: "#9b2c2c", padding: "0.75rem", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Enter Registered Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e0", boxSizing: "border-box" }}
            placeholder="visitor@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "#3182ce",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Sending..." : "Send Password Reset Link"}
        </button>
      </form>

      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
        <Link to="/login" style={{ color: "#3182ce", textDecoration: "none" }}>Back to Login</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
