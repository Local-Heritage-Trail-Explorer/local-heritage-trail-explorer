import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PlacesPage from "./pages/places.page.jsx";
import HomePage from "./pages/home.page.jsx";
import LoginPage from "./pages/login.page.jsx";
import SignupPage from "./pages/signup.page.jsx";
import VerifyEmailPage from "./pages/verify-email.page.jsx";
import ForgotPasswordPage from "./pages/forgot-password.page.jsx";
import ResetPasswordPage from "./pages/reset-password.page.jsx";


const PlaceholderPage = ({ title }) => (
  <div style={{ padding: "3rem", textAlign: "center", fontFamily: "sans-serif" }}>
    <h2>{title}</h2>
    <p>This section is available in the heritage trail explorer platform.</p>
  </div>
);

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/places" element={<PlacesPage />} />
              <Route path="/stories" element={<PlaceholderPage title="Heritage Stories" />} />
              <Route path="/trail-planner" element={<PlaceholderPage title="Trail Planner" />} />

              {/* Authenticated Visitor Routes */}
              <Route
                path="/saved-trails"
                element={
                  <ProtectedRoute allowedRoles={["VISITOR", "CURATOR", "GUIDE"]}>
                    <PlaceholderPage title="Saved Trails & Progress" />
                  </ProtectedRoute>
                }
              />

              {/* Protected Staff Routes */}
              <Route
                path="/curator"
                element={
                  <ProtectedRoute allowedRoles={["CURATOR"]}>
                    <PlaceholderPage title="Curator Management Dashboard" />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/guide"
                element={
                  <ProtectedRoute allowedRoles={["GUIDE"]}>
                    <PlaceholderPage title="Guide Trail Management Dashboard" />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
