import dotenv from "dotenv";

dotenv.config();

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE, 10) || 500;
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP, 10) || 100;

/**
 * Splits plain text into overlapping chunks respecting sentence/word boundaries.
 *
 * @param {string} text - Raw input text
 * @param {object} options - Chunking options
 * @param {number} [options.chunkSize] - Target maximum characters per chunk
 * @param {number} [options.chunkOverlap] - Number of characters to overlap between adjacent chunks
 * @returns {Array<string>} - Array of non-empty text chunks
 */
export const splitTextIntoChunks = (
  text,
  {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = {}
) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  const cleanText = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();

  if (cleanText.length === 0) {
    return [];
  }

  // If text is already shorter than or equal to chunkSize, return as single chunk
  if (cleanText.length <= chunkSize) {
    return [cleanText];
  }

  // Ensure overlap is strictly less than chunk size to avoid infinite loops
  const effectiveOverlap = Math.max(0, Math.min(chunkOverlap, chunkSize - 50));
  const stepSize = chunkSize - effectiveOverlap;

  const chunks = [];
  let startIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      const remainingChunk = cleanText.slice(startIndex).trim();
      if (remainingChunk.length > 0) {
        chunks.push(remainingChunk);
      }
      break;
    }

    // Try to find natural boundary (period, question mark, newline, or whitespace) near endIndex
    const searchSlice = cleanText.slice(startIndex, endIndex + 50);
    const relativeSentenceEnd = searchSlice.lastIndexOf(". ");
    const relativeNewline = searchSlice.lastIndexOf("\n");
    const relativeSpace = searchSlice.lastIndexOf(" ");

    let boundaryOffset = -1;
    if (relativeSentenceEnd > chunkSize * 0.7 && relativeSentenceEnd < chunkSize + 40) {
      boundaryOffset = relativeSentenceEnd + 1; // Include period
    } else if (relativeNewline > chunkSize * 0.7 && relativeNewline < chunkSize + 40) {
      boundaryOffset = relativeNewline;
    } else if (relativeSpace > chunkSize * 0.7 && relativeSpace <= chunkSize + 40) {
      boundaryOffset = relativeSpace;
    }

    let actualEnd = boundaryOffset > 0 ? startIndex + boundaryOffset : endIndex;
    const chunkContent = cleanText.slice(startIndex, actualEnd).trim();

    if (chunkContent.length > 0) {
      chunks.push(chunkContent);
    }

    // Advance start index by step size (or relative boundary)
    const advanced = boundaryOffset > 0 ? boundaryOffset - effectiveOverlap : stepSize;
    startIndex += Math.max(advanced, 50);
  }

  return chunks;
};

/**
 * Prepares and chunks a Story document from MongoDB, preserving full metadata.
 *
 * @param {object} story - Mongoose Story document or plain story object
 * @param {object} [options] - Chunking configuration options
 * @param {string} [options.sourceUrl] - Resolved source URL if available
 * @returns {Array<object>} - Array of chunk metadata objects ready for embedding
 */
export const chunkStory = (story, options = {}) => {
  if (!story) {
    throw new Error("Story document is required for chunking");
  }

  const storyId = story._id ? story._id.toString() : story.id;
  if (!storyId) {
    throw new Error("Story must have a valid identifier (_id)");
  }

  const title = (story.title || "").trim();
  const rawContent = (story.content || "").trim();

  if (!rawContent) {
    return [];
  }

  // Combine title with content context for better semantic embedding quality if desired,
  // while preserving chunk text
  const textChunks = splitTextIntoChunks(rawContent, options);

  return textChunks.map((chunkText, index) => {
    return {
      storyId: story._id || storyId,
      placeId: story.placeId || null,
      title: title || "Untitled Story",
      chunkIndex: index,
      content: chunkText,
      sourceIds: Array.isArray(story.sourceIds) ? story.sourceIds : [],
      sourceUrl: options.sourceUrl || null,
      approvalStatus: story.status || "approved",
    };
  });
};

export default {
  splitTextIntoChunks,
  chunkStory,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
};
