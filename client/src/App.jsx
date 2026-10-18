import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/home.page.jsx";
import PlacesPage from "./pages/places.page.jsx";
import StoryPage from "./pages/story.page.jsx";
import SourcePage from "./pages/source.page.jsx";
import HeritageChatPage from "./pages/heritage-chat.page.jsx";
import TrailPlannerPage from "./pages/trail-planner.page.jsx";
import SavedTrailsPage from "./pages/saved-trails.page.jsx";
import CuratorDashboardPage from "./pages/curator-dashboard.page.jsx";
import GuideDashboardPage from "./pages/guide-dashboard.page.jsx";
import LoginPage from "./pages/login.page.jsx";
import SignupPage from "./pages/signup.page.jsx";
import VerifyEmailPage from "./pages/verify-email.page.jsx";
import ForgotPasswordPage from "./pages/forgot-password.page.jsx";
import ResetPasswordPage from "./pages/reset-password.page.jsx";

export const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public Exploration & Informational Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/places" element={<PlacesPage />} />
              <Route path="/stories" element={<StoryPage />} />
              <Route path="/stories/:id" element={<StoryPage />} />
              <Route path="/sources" element={<SourcePage />} />
              <Route path="/chat" element={<HeritageChatPage />} />
              <Route path="/heritage-chat" element={<HeritageChatPage />} />
              <Route path="/trail-planner" element={<TrailPlannerPage />} />

              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Authenticated Visitor Routes */}
              <Route
                path="/saved-trails"
                element={
                  <ProtectedRoute allowedRoles={["VISITOR", "CURATOR", "GUIDE"]}>
                    <SavedTrailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Curator Routes */}
              <Route
                path="/curator"
                element={
                  <ProtectedRoute allowedRoles={["CURATOR"]}>
                    <CuratorDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Guide Routes */}
              <Route
                path="/guide"
                element={
                  <ProtectedRoute allowedRoles={["GUIDE"]}>
                    <GuideDashboardPage />
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
