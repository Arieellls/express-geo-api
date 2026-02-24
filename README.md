# Express Mock Server for GeoJSON Boundaries

This Express.js server serves GeoJSON boundary data from local files, matching the API structure expected by your server actions.

## Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Running the Server

Start the server:

```bash
npm start
```

Or use nodemon for development (auto-restart on file changes):

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default (or the port specified in the `PORT` environment variable).

## API Endpoints

### GET `/api/insights/boundaries/`

Returns GeoJSON FeatureCollection data filtered by query parameters.

**Query Parameters:**
- `admin_type` (required): Filter by administrative type. Options: `Municipality`, `City`, `Province`, `Barangay`
- `name` (optional): Filter by name (useful for Province queries like `name=Iloilo` or `name=Guimaras`)
- `format` (optional): Currently only `json` is supported
- `results` (optional): If set to `true`, wraps the response in a `results` object

**Examples:**

```bash
# Get all municipalities
GET /api/insights/boundaries/?format=json&results=true&admin_type=Municipality

# Get all cities
GET /api/insights/boundaries/?format=json&results=true&admin_type=City

# Get all provinces
GET /api/insights/boundaries/?format=json&results=true&admin_type=Province

# Get Iloilo province
GET /api/insights/boundaries/?format=json&results=true&admin_type=Province&name=Iloilo

# Get Guimaras province
GET /api/insights/boundaries/?format=json&results=true&admin_type=Province&name=Guimaras

# Get all barangays
GET /api/insights/boundaries/?format=json&results=true&admin_type=Barangay
```

### GET `/health`

Health check endpoint that returns server status and number of loaded boundary files.

```json
{
  "status": "ok",
  "boundariesLoaded": 19
}
```

## Data Structure

The server loads all `.geojson` files from the `data/boundaries/` directory on startup. Each file should be a valid GeoJSON FeatureCollection.

The server automatically:
- Caches all boundary files in memory for fast access
- Filters by `admin_type` based on filename patterns (`_Municipal`, `_City`, `_Province`, `_Barangay`)
- Filters by `name` when specified (for province-level queries)

## Response Format

**Standard response:**
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

**With `results=true`:**
```json
{
  "results": {
    "type": "FeatureCollection",
    "features": [...]
  }
}
```

## Notes

- The server loads all boundary files at startup and caches them in memory
- Filtering logic matches the expected behavior from your server actions
- Client-side filtering (like excluding Guimaras municipalities) is handled in your server actions, not in this API

