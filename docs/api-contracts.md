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

## 5. Error Code Reference

| Error Code | HTTP Status | Description |
|---|---|---|
| `DATABASE_UNAVAILABLE` | 503 | MongoDB is disconnected or unreachable during health check. |
| `VALIDATION_ERROR` | 400 | Query parameters failed Zod schema validation (e.g. non-numeric limit or page < 1). |
| `INVALID_ID` | 400 | The provided `:id` parameter is not a 24-character hex MongoDB ObjectId. |
| `STORY_NOT_FOUND` | 404 | The requested story does not exist or its status is not `approved`. |
| `SOURCE_NOT_FOUND` | 404 | The requested source does not exist or its status is not `approved`. |
| `ROUTE_NOT_FOUND` | 404 | The requested route does not exist on this server. |
| `INTERNAL_SERVER_ERROR` | 500 | An unhandled operational or database exception occurred. |
