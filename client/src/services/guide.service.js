import api from "./api.service.js";

export const guideService = {
  getTrails: async (params = {}) => {
    return await api.get("/guide/trails", { params });
  },

  getReports: async (params = {}) => {
    return await api.get("/guide/feedback", { params });
  },

  moderateReport: async (id, data) => {
    return await api.patch(`/guide/feedback/${id}`, data);
  },

  publishTrail: async (trailId) => {
    return await api.post(`/guide/trails/${trailId}/publish`, {});
  },
};

export default guideService;
