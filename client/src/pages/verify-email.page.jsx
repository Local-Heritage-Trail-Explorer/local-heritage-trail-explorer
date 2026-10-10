import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email token...");

  const { verifyEmail } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing from URL.");
      return;
    }

    verifyEmail({ token })
      .then((res) => {
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully! You can now log in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Failed to verify email token.");
      });
  }, [token]);

  return (
    <div style={{ maxWidth: "450px", margin: "4rem auto", padding: "2rem", border: "1px solid #e2e8f0", borderRadius: "8px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Email Verification</h2>
      {status === "verifying" && <p style={{ color: "#4a5568" }}>{message}</p>}
      {status === "success" && (
        <div>
          <div style={{ color: "#2f855a", fontWeight: "bold", marginBottom: "1rem" }}>{message}</div>
          <Link to="/login" style={{ background: "#3182ce", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "4px", textDecoration: "none", display: "inline-block" }}>
            Go to Login
          </Link>
        </div>
      )}
      {status === "error" && (
        <div>
          <div style={{ color: "#c53030", fontWeight: "bold", marginBottom: "1rem" }}>{message}</div>
          <Link to="/signup" style={{ color: "#3182ce", textDecoration: "none" }}>Back to Signup</Link>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailPage;
