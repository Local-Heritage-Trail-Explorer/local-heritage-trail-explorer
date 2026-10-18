import api from "./api.service.js";

export const placeService = {
  getPlaces: async (params = {}) => {
    return await api.get("/places", { params });
  },

  getPlaceById: async (id) => {
    return await api.get(`/places/${id}`);
  },

  getPlaceStories: async (id) => {
    return await api.get(`/places/${id}/stories`);
  },
};

export default placeService;
