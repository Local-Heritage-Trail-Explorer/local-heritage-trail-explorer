/**
 * Text extraction service for historical source documents (PDF, TXT, MD, JSON)
 */

/**
 * Normalizes extracted text: standardizes linebreaks, collapses excess whitespace
 */
function normalizeText(rawText = "") {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // remove control chars
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts text stream tokens from PDF binary buffer
 * Handles standard PDF operators (BT/ET, Tj, TJ, bracket strings)
 */
function extractTextFromPdfBuffer(buffer) {
  const content = buffer.toString("latin1");
  const textChunks = [];

  // 1. Look for text blocks enclosed in BT (Begin Text) and ET (End Text)
  const btRegex = /BT[\s\S]*?ET/g;
  let match;

  while ((match = btRegex.exec(content)) !== null) {
    const block = match[0];

    // Match strings in parentheses: (Text here) Tj or [(Text) ... ] TJ
    const stringRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
    let strMatch;
    while ((strMatch = stringRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
      textChunks.push(decoded);
    }

    // Match array strings in TJ: [ (First) 20 (Second) ] TJ
    const arrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = arrayRegex.exec(block)) !== null) {
      const arrayContent = arrMatch[1];
      const elemRegex = /\(([^)]*)\)/g;
      let elemMatch;
      while ((elemMatch = elemRegex.exec(arrayContent)) !== null) {
        const decoded = elemMatch[1]
          .replace(/\\([()\\])/g, "$1")
          .replace(/\\n/g, "\n");
        textChunks.push(decoded);
      }
    }
  }

  // 2. Fallback: if no BT/ET blocks matched (e.g. simplified PDF or text streams), scan readable ASCII sequences
  if (textChunks.length === 0) {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(content)) !== null) {
      const rawStream = streamMatch[1];
      // Extract alphanumeric sentences
      const readable = rawStream.match(/[A-Za-z0-9,.:;'"\-\s]{15,}/g);
      if (readable) {
        textChunks.push(...readable);
      }
    }
  }

  return normalizeText(textChunks.join(" "));
}

/**
 * Extracts plain text from buffer according to mime type and filename
 *
 * @param {Buffer} buffer - File data buffer
 * @param {string} [mimetype="text/plain"] - MIME type of uploaded file
 * @param {string} [filename=""] - Original filename
 * @returns {Promise<{ text: string, charCount: number, wordCount: number, format: string }>}
 */
export async function extractTextFromBuffer(buffer, mimetype = "text/plain", filename = "") {
  if (!buffer || buffer.length === 0) {
    return { text: "", charCount: 0, wordCount: 0, format: "empty" };
  }

  const lowerMime = (mimetype || "").toLowerCase();
  const lowerName = (filename || "").toLowerCase();

  let extracted = "";
  let format = "text";

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    format = "pdf";
    extracted = extractTextFromPdfBuffer(buffer);
  } else if (lowerMime.includes("json") || lowerName.endsWith(".json")) {
    format = "json";
    try {
      const parsed = JSON.parse(buffer.toString("utf-8"));
      extracted = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      extracted = buffer.toString("utf-8");
    }
    extracted = normalizeText(extracted);
  } else if (lowerMime.startsWith("image/")) {
    format = "image";
    extracted = `[Archival Visual Document: ${filename || "Image asset"}]`;
  } else {
    // Default UTF-8 text / markdown
    format = lowerName.endsWith(".md") ? "markdown" : "text";
    extracted = normalizeText(buffer.toString("utf-8"));
  }

  const words = extracted.split(/\s+/).filter(Boolean);

  return {
    text: extracted,
    charCount: extracted.length,
    wordCount: words.length,
    format,
  };
}

export default {
  extractTextFromBuffer,
};
