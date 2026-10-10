import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Loading heritage context...</h2>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif", color: "#c53030" }}>
        <h2>Access Restricted</h2>
        <p>Your current account role ({user.role}) does not have permission to view this section.</p>
        <p>Restricted to: {allowedRoles.join(", ")}</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
