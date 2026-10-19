
import api from "./api.service.js";

// Fetch an individual approved heritage story.
// The API contract defines GET /stories/:id.
export const getStoryById = async (id) => {
  if (!id) {
    throw new Error("A story ID is required.");
  }

  return api.get(`/stories/${encodeURIComponent(id)}`);
};
