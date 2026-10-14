# Tirumala Local Heritage Trail Explorer — API Contracts (Team 2: Backend APIs)

This document specifies the contract, request/response formats, validation rules, and error handling for the **P0 (Foundation)** and **P1 (Heritage Browsing)** backend APIs.

---

## 1. Getting Started

### Prerequisites
- Node.js (v20+ recommended, tested on v24.14.1)
- npm (v10+)
- MongoDB Atlas connection URI (for live database connectivity)

### Installation
From the repository root, change directory into `server/` and install dependencies:
```bash
cd server
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` in the `server/` directory:
```bash
cp .env.example .env
```
Ensure `.env` contains the required variables:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/heritage_trail?retryWrites=true&w=majority
NODE_ENV=development
```
*(Note: Never commit real credentials to source control.)*

### Running the Backend Server
Start the server in development mode with auto-reload:
```bash
npm run dev
```
Or start in standard production mode:
```bash
npm start
```

### Running Tests
Execute the automated test suite using Node's built-in test runner:
```bash
npm test
```
To run a specific test suite:
```bash
npm test tests/health.test.js
npm test tests/place.test.js
npm test tests/story.test.js
npm test tests/source.test.js
```

---

## 2. Global Conventions

### Standard Success Response
All successful responses return HTTP 200 (unless otherwise specified) with a consistent envelope:
```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "error": null
}
```

### Standard Error Response
All error responses return an appropriate HTTP status code (400, 404, 500, 503) with a structured error envelope:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of the error."
  }
}
```

### Authentication
All P0 and P1 endpoints are public browsing endpoints and **do not require authentication**.

### Approval Status Workflow
In line with the data schema defined by Team 3, records must have `status: "approved"` to be eligible for public display. Records marked as `"draft"`, `"pending"`, `"rejected"`, or any other state are strictly excluded from all public browsing responses.

---

## 3. P0 — Foundation API

### `GET /api/health`

- **Purpose:** Verifies that the Express server is running and checks whether the MongoDB connection is alive.
- **Authentication:** None (Public)
- **Parameters:** None

#### Response: Database Connected (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  },
  "error": null
}
```

#### Response: Database Disconnected (HTTP 503 Service Unavailable)
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "database": "disconnected"
  },
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database connection is unavailable."
  }
}
```

---

## 4. P1 — Heritage Browsing APIs

### A. `GET /api/places`

- **Purpose:** Returns approved Tirumala heritage places for public browsing.
- **Authentication:** None (Public)
- **Query Parameters:**
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `theme` | string | *optional* | Filter places by theme (e.g. `art`, `architecture`, `geology`, `nature`). |
  | `page` | integer | `1` | Page number for pagination (minimum: 1). |
  | `limit` | integer | `10` | Maximum records per page (minimum: 1, maximum: 100). |

#### Response: HTTP 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "670845a7b2c5d1e4f3a8b9c0",
      "name": "Sri Venkateswara Museum",
      "description": "A museum featuring heritage-related exhibits and temple artifacts.",
      "zone": "Tirumala Up-Hill",
      "themes": [
        "art",
        "architecture"
      ],
      "openingHours": {
        "open": "09:00",
        "close": "18:00"
      },
      "hoursVerification": "verified",
      "estimatedVisitMinutes": 30,
      "status": "approved"
    }
  ],
  "error": null
}
```
*Note: If no places match the criteria, `data` returns an empty array `[]` with HTTP 200.*

#### Error Response: Invalid Query Parameters (HTTP 400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "page: Page must be at least 1"
  }
}
```

---

### B. `GET /api/stories/:id`

- **Purpose:** Returns an approved historical story, its associated place, and its approved citations/sources.
- **Authentication:** None (Public)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | string | Yes | 24-character hexadecimal MongoDB ObjectId of the story. |

#### Response: HTTP 200 OK
```json
{
  "success": true,
  "data": {
    "id": "670845a7b2c5d1e4f3a8b9c1",
    "title": "The Legend of Anjanadri",
    "content": "Anjanadri hill in the Seshachalam range is revered in tradition as the birthplace of Lord Hanuman...",
    "claimType": "tradition",
    "place": {
      "id": "670845a7b2c5d1e4f3a8b9c0",
      "name": "Anjanadri Hill"
    },
    "sources": [
      {
        "id": "670845a7b2c5d1e4f3a8b9c2",
        "title": "Tirumala Sthala Purana",
        "attribution": "TTD Publications",
        "sourceType": "book",
        "url": "https://example.com/sthala-purana"
      }
    ],
    "status": "approved"
  },
  "error": null
}
```

#### Error Response: Malformed ID (HTTP 400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_ID",
    "message": "id: Invalid ID format. Must be a 24-character hexadecimal string."
  }
}
```

#### Error Response: Not Found or Not Approved (HTTP 404 Not Found)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "STORY_NOT_FOUND",
    "message": "Story not found or not approved for public display."
  }
}
```

---

### C. `GET /api/sources/:id`

- **Purpose:** Returns approved source citation metadata for public reference.
- **Authentication:** None (Public)
- **Path Parameters:**
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | string | Yes | 24-character hexadecimal MongoDB ObjectId of the source. |

- **Security Note:** Private storage paths (`filePath`) and internal user IDs (`uploadedBy`) are strictly excluded from the response.

#### Response: HTTP 200 OK
```json
{
  "success": true,
  "data": {
    "id": "670845a7b2c5d1e4f3a8b9c2",
    "title": "Tirumala Sthala Purana",
    "attribution": "TTD Publications",
    "sourceType": "book",
    "url": "https://example.com/sthala-purana",
    "status": "approved"
  },
  "error": null
}
```

#### Error Response: Malformed ID (HTTP 400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_ID",
    "message": "id: Invalid ID format. Must be a 24-character hexadecimal string."
  }
}
```

#### Error Response: Not Found or Not Approved (HTTP 404 Not Found)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SOURCE_NOT_FOUND",
    "message": "Source not found or not approved for public display."
  }
}
```

---

---

## 5. P3 — Trail Management APIs

### `POST /api/trails`
- **Purpose:** Create and save a new private trail for the authenticated user.
- **Authentication:** Required (User Session)
- **CSRF Token:** Required (`x-csrf-token`)
- **Request Body:**
```json
{
  "title": "Sacred Hills Heritage Trail",
  "theme": "spiritual",
  "stops": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "estimatedMinutes": 75
}
```
- **Response (HTTP 201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439041",
    "ownerId": "507f1f77bcf86cd799439091",
    "title": "Sacred Hills Heritage Trail",
    "theme": "spiritual",
    "stops": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    "estimatedMinutes": 75,
    "status": "active",
    "visibility": "private"
  },
  "error": null
}
```

### `GET /api/trails/mine`
- **Purpose:** List trails created by and belonging to the authenticated user.
- **Authentication:** Required (User Session)
- **Query Parameters:** `page` (default 1), `limit` (default 10)
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439041",
      "ownerId": "507f1f77bcf86cd799439091",
      "title": "Sacred Hills Heritage Trail",
      "theme": "spiritual",
      "stops": ["507f1f77bcf86cd799439011"],
      "estimatedMinutes": 75,
      "status": "active",
      "visibility": "private"
    }
  ],
  "error": null
}
```

### `GET /api/trails/:id`
- **Purpose:** Retrieve trail details by ID. Private trails require authentication and ownership verification.
- **Authentication:** Required for private trails; Public trails viewable without auth.
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439041",
    "ownerId": "507f1f77bcf86cd799439091",
    "title": "Sacred Hills Heritage Trail",
    "theme": "spiritual",
    "stops": ["507f1f77bcf86cd799439011"],
    "stopDetails": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Sri Venkateswara Museum",
        "zone": "Tirumala Up-Hill",
        "estimatedVisitMinutes": 30
      }
    ],
    "visibility": "private"
  },
  "error": null
}
```

### `PATCH /api/trails/:id/progress`
- **Purpose:** Track visit progress on a trail stop for the trail owner.
- **Authentication:** Required (Trail Owner)
- **CSRF Token:** Required (`x-csrf-token`)
- **Request Body:**
```json
{
  "placeId": "507f1f77bcf86cd799439011"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "trailId": "507f1f77bcf86cd799439041",
    "userId": "507f1f77bcf86cd799439091",
    "completedPlaceIds": ["507f1f77bcf86cd799439011"],
    "visitTimestamps": [
      {
        "placeId": "507f1f77bcf86cd799439011",
        "visitedAt": "2026-10-14T23:00:00.000Z"
      }
    ],
    "totalStops": 2,
    "completedCount": 1,
    "isComplete": false
  },
  "error": null
}
```

---

## 6. P4 — Curator Management & Corrections APIs

All `/api/curator/*` endpoints require authentication with role `CURATOR`.

### Places
- `POST /api/curator/places`: Create a place record (`status: "draft" | "pending" | "approved"`).
- `GET /api/curator/places`: List all places (supports `?status=`, `page`, `limit`).
- `PATCH /api/curator/places/:id`: Update existing place details or publication status.

### Sources
- `POST /api/curator/sources`: Create source metadata (requires `title`, `attribution`, `sourceType`, and either `url` or `filePath`).
- `GET /api/curator/sources`: List sources across all statuses.
- `PATCH /api/curator/sources/:id`: Update source metadata.
- `PATCH /api/curator/sources/:id/review`: Review source (`{ "status": "approved" | "rejected", "notes": "..." }`), creates `EditorialReview`.

### Stories
- `POST /api/curator/stories`: Create story referencing verified `placeId` and `sourceIds`.
- `GET /api/curator/stories`: List stories (supports `?status=`, `?placeId=`, `page`, `limit`).
- `PATCH /api/curator/stories/:id`: Update story details.
- `PATCH /api/curator/stories/:id/review`: Review story (`{ "status": "approved" | "rejected", "notes": "..." }`), creates `EditorialReview`.

### Corrections
- `POST /api/corrections`: Submit a correction for a heritage place (Authenticated User, role `VISITOR` or `CURATOR`).
- `GET /api/curator/corrections`: List pending corrections for curator review.
- `GET /api/curator/corrections/:id`: Retrieve single correction details with place and submitter info.
- `PATCH /api/curator/corrections/:id/review`: Approve or reject correction (`{ "status": "approved" | "rejected" }`), sets `reviewedBy` and creates `EditorialReview`.

---

## 7. Error Code Reference

| Error Code | HTTP Status | Description |
|---|---|---|
| `DATABASE_UNAVAILABLE` | 503 | MongoDB is disconnected or unreachable during health check. |
| `VALIDATION_ERROR` | 400 | Request body or parameters failed Zod schema validation. |
| `INVALID_ID` | 400 | The provided `:id` parameter is not a 24-character hex MongoDB ObjectId. |
| `INVALID_PLACE_REFERENCE`| 400 | One or more referenced places do not exist. |
| `INVALID_SOURCE_REFERENCE`| 400 | One or more referenced sources do not exist. |
| `INVALID_STOP` | 400 | The specified stop does not belong to the trail. |
| `UNAUTHORIZED` | 401 | Authentication is required (missing or expired session). |
| `FORBIDDEN` | 403 | Authenticated user lacks permission (non-owner or non-curator). |
| `EBADCSRFTOKEN` | 403 | Missing or invalid CSRF token on mutating request. |
| `TRAIL_NOT_FOUND` | 404 | The requested trail does not exist. |
| `PLACE_NOT_FOUND` | 404 | The requested place does not exist. |
| `STORY_NOT_FOUND` | 404 | The requested story does not exist or is unapproved for public browsing. |
| `SOURCE_NOT_FOUND` | 404 | The requested source does not exist or is unapproved for public browsing. |
| `CORRECTION_NOT_FOUND` | 404 | The requested correction record does not exist. |
| `ROUTE_NOT_FOUND` | 404 | The requested route does not exist on this server. |
| `INTERNAL_SERVER_ERROR` | 500 | An unhandled operational or database exception occurred. |
