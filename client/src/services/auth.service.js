import api from "./api.service.js";

export const authService = {
  signup: async (data) => {
    return await api.post("/auth/signup", data);
  },
  verifyEmail: async (data) => {
    return await api.post("/auth/verify-email", data);
  },
  login: async (credentials) => {
    return await api.post("/auth/login", credentials);
  },
  logout: async () => {
    return await api.post("/auth/logout", {});
  },
  forgotPassword: async (data) => {
    return await api.post("/auth/forgot-password", data);
  },
  resetPassword: async (data) => {
    return await api.post("/auth/reset-password", data);
  },
  getMe: async () => {
    return await api.get("/auth/me");
  },
};

export default authService;
