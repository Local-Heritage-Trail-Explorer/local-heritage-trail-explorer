import api from "./api.service.js";

export const storyService = {
  getStories: async (params = {}) => {
    return await api.get("/stories", { params });
  },

  getStoryById: async (id) => {
    return await api.get(`/stories/${id}`);
  },

  getSources: async (params = {}) => {
    return await api.get("/sources", { params });
  },

  getSourceById: async (id) => {
    return await api.get(`/sources/${id}`);
  },
};

export default storyService;
