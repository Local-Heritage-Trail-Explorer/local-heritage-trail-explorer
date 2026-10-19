import { ApiError } from "./error.middleware.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

/**
 * Extracts extension from filename in lowercase with leading dot
 */
function getExtension(filename = "") {
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
}

/**
 * Parses multipart/form-data boundary from Content-Type header
 */
function getBoundary(contentType = "") {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? (match[1] || match[2]).trim() : null;
}

/**
 * Parses raw multipart buffer into fields and file objects
 */
function parseMultipartBuffer(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const closeDelimiter = Buffer.from(`--${boundary}--`);
  const parts = [];

  let start = 0;
  while (start < buffer.length) {
    const nextDelim = buffer.indexOf(delimiter, start);
    if (nextDelim === -1) break;

    // Check if this is the closing boundary
    if (buffer.slice(nextDelim, nextDelim + closeDelimiter.length).equals(closeDelimiter)) {
      break;
    }

    const partStart = nextDelim + delimiter.length + 2; // skip delimiter and \r\n
    const nextIndex = buffer.indexOf(delimiter, partStart);
    if (nextIndex === -1) break;

    const partEnd = nextIndex - 2; // trim \r\n before next delimiter
    if (partEnd > partStart) {
      parts.push(buffer.slice(partStart, partEnd));
    }
    start = nextIndex;
  }

  const fields = {};
  const files = [];

  for (const part of parts) {
    const headerEndIndex = part.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) continue;

    const rawHeaders = part.slice(0, headerEndIndex).toString("utf-8");
    const body = part.slice(headerEndIndex + 4);

    const dispositionMatch = rawHeaders.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const fileName = dispositionMatch[2];

    if (fileName !== undefined) {
      const typeMatch = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i);
      const mimetype = typeMatch ? typeMatch[1].trim().toLowerCase() : "application/octet-stream";

      files.push({
        fieldname: fieldName,
        originalname: fileName,
        mimetype,
        buffer: body,
        size: body.length,
      });
    } else {
      fields[fieldName] = body.toString("utf-8");
    }
  }

  return { fields, files };
}

/**
 * Middleware factory for single file uploads
 * Supports multipart/form-data with size limits, extension/mime whitelisting
 */
export function uploadSingle(fieldName = "file") {
  return async (req, res, next) => {
    const contentType = req.headers["content-type"] || "";

    // If not multipart, let downstream JSON / urlencoded body parser handle it
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return next();
    }

    const boundary = getBoundary(contentType);
    if (!boundary) {
      return next(new ApiError(400, "INVALID_MULTIPART_BOUNDARY", "Missing multipart form boundary in request."));
    }

    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE) {
        req.destroy();
        return next(new ApiError(413, "FILE_TOO_LARGE", `Uploaded file exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`));
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        const { fields, files } = parseMultipartBuffer(fullBuffer, boundary);

        req.body = { ...req.body, ...fields };

        const matchedFile = files.find((f) => f.fieldname === fieldName) || files[0] || null;

        if (matchedFile) {
          const ext = getExtension(matchedFile.originalname);
          if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(matchedFile.mimetype)) {
            return next(
              new ApiError(
                400,
                "UNSUPPORTED_MEDIA_TYPE",
                `Unsupported file format: '${ext || matchedFile.mimetype}'. Allowed formats: PDF, TXT, MD, JSON, PNG, JPEG.`
              )
            );
          }
          req.file = matchedFile;
        }

        req.files = files;
        next();
      } catch (err) {
        next(new ApiError(400, "MULTIPART_PARSE_ERROR", `Failed to parse uploaded form data: ${err.message}`));
      }
    });

    req.on("error", (err) => {
      next(err);
    });
  };
}

export default {
  uploadSingle,
};
