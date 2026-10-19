import api from "./api.service.js";

export const aiService = {
  // 1. Semantic Search & Vector Retrieval (Member 7)
  searchSemanticStories: async ({ query, limit = 5, placeId, minScore = 0 }) => {
    return await api.post("/search/semantic", {
      query,
      limit,
      placeId,
      minScore,
    });
  },

  // 2. Historical RAG Chatbot (Member 8)
  getChatStatus: async () => {
    return await api.get("/chat/status");
  },

  getChatHistory: async () => {
    return await api.get("/chat/history");
  },

  sendChatMessage: async ({ question, history = [] }) => {
    return await api.post("/chat", {
      question,
      history,
    });
  },

  // 3. Trail Agent Itinerary Generation
  getTrailAgentStatus: async () => {
    return await api.get("/trail-agent/status");
  },

  generateTrail: async (params) => {
    return await api.post("/trail-agent/generate", params);
  },
};

export default aiService;
