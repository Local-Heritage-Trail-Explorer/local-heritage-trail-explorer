import api from "./api.service.js";

export const curatorService = {
  getReviewQueue: async () => {
    return await api.get("/curator/review-queue");
  },

  getStories: async (params = {}) => {
    return await api.get("/curator/stories", { params });
  },

  reviewStory: async (storyId, data) => {
    return await api.post(`/curator/stories/${storyId}/review`, data);
  },

  getCorrections: async (params = {}) => {
    return await api.get("/curator/corrections", { params });
  },

  reviewCorrection: async (correctionId, data) => {
    return await api.post(`/curator/corrections/${correctionId}/review`, data);
  },

  getSources: async (params = {}) => {
    return await api.get("/curator/sources", { params });
  },

  reviewSource: async (sourceId, data) => {
    return await api.patch(`/curator/sources/${sourceId}/review`, data);
  },

  uploadSource: async (formData) => {
    return await api.post("/curator/sources/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  reviewTrail: async (trailId, data) => {
    return await api.post(`/curator/trails/${trailId}/review`, data);
  },
};

export default curatorService;
