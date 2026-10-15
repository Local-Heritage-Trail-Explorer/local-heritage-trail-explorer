const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || "llama3.2",
  timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 60000,
};

export { ollamaConfig };
export default ollamaConfig;
