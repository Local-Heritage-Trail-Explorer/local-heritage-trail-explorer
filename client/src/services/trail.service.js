import api from "./api.service.js";

export const trailService = {
  getPublishedTrails: async (params = {}) => {
    return await api.get("/trails", { params });
  },

  getMyTrails: async (params = {}) => {
    return await api.get("/trails/my", { params });
  },

  getTrailById: async (id) => {
    return await api.get(`/trails/${id}`);
  },

  createTrail: async (data) => {
    return await api.post("/trails", data);
  },

  updateProgress: async (trailId, placeId) => {
    return await api.patch(`/trails/${trailId}/progress`, { placeId });
  },

  getProgress: async (trailId) => {
    return await api.get(`/trails/${trailId}/progress`);
  },

  getTrailFeedback: async (trailId, params = {}) => {
    return await api.get(`/trails/${trailId}/feedback`, { params });
  },

  submitFeedback: async (trailId, data) => {
    return await api.post(`/trails/${trailId}/feedback`, data);
  },

  requestPublication: async (trailId) => {
    return await api.post(`/trails/${trailId}/publish-request`, {});
  },
};

export default trailService;
