require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Path to your GeoJSON file
const GEOJSON_FILE_PATH = path.join(
  __dirname,
  "data",
  "sample-polygon.geojson"
);

// Middleware to check API key for /api/geojson routes
app.use("/api/geojson", (req, res, next) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// Helper function to read GeoJSON file
const readGeoJSONFile = () => {
  try {
    const data = fs.readFileSync(GEOJSON_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading GeoJSON file:", error);
    return null;
  }
};

const writeGeoJSONFile = (data) => {
  try {
    fs.writeFileSync(GEOJSON_FILE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing GeoJSON file:", error);
    return false;
  }
};



app.get("/api/geojson", (req, res) => {
  const geoHeader = req.headers["geo-file"]; 

  const geoFiles = {
    "tourism-sample-poi": "data/sample-poi.geojson",
    "tourism-sample-polygon": "sample-polygon.geojson",
    "health-polygon": "data/sample-polygon.geojson",
    "health-boundaries": "data/health-boundaries.geojson",
    "health-facilities": "data/health-facilities.geojson",
    "tourism-spots": "data/tourism-spots.geojson",
  };

  const fileName = geoFiles[geoHeader];

  if (!fileName) {
    return res.status(400).json({ error: "Invalid geo-file header value" });
  }

  const filePath = path.join(__dirname, fileName);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read GeoJSON file" });
    }

    try {
      const geoData = JSON.parse(data);
      res.json(geoData);
    } catch (parseErr) {
      res.status(500).json({ error: "Invalid GeoJSON format" });
    }
  });
});

// GET specific feature by ID
app.get("/api/geojson/features/:id", (req, res) => {
  const geoData = readGeoJSONFile();

  if (!geoData) {
    return res.status(500).json({ error: "Failed to read GeoJSON file" });
  }

  const feature = geoData.features.find((f) => f.id == req.params.id);

  if (!feature) {
    return res.status(404).json({ error: "Feature not found" });
  }

  res.json(feature);
});

// GET features by property filter
app.get("/api/geojson/features", (req, res) => {
  const geoData = readGeoJSONFile();

  if (!geoData) {
    return res.status(500).json({ error: "Failed to read GeoJSON file" });
  }

  let filteredFeatures = geoData.features;

  // Filter by query parameters
  Object.keys(req.query).forEach((key) => {
    if (key !== "limit" && key !== "offset") {
      filteredFeatures = filteredFeatures.filter(
        (feature) =>
          feature.properties[key] &&
          feature.properties[key]
            .toString()
            .toLowerCase()
            .includes(req.query[key].toLowerCase())
      );
    }
  });

  // Pagination
  const limit = parseInt(req.query.limit) || filteredFeatures.length;
  const offset = parseInt(req.query.offset) || 0;

  const paginatedFeatures = filteredFeatures.slice(offset, offset + limit);

  res.json({
    type: "FeatureCollection",
    features: paginatedFeatures,
    totalCount: filteredFeatures.length,
  });
});

// Health check endpoint (open, no API key required)
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock GeoJSON server running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("  GET  /api/geojson - Get all GeoJSON data (requires API key)");
  console.log(
    "  GET  /api/geojson/features - Get features with optional filtering (requires API key)"
  );
  console.log(
    "  GET  /api/geojson/features/:id - Get specific feature by ID (requires API key)"
  );
  console.log(
    "  POST /api/geojson/features - Add new feature (requires API key)"
  );
  console.log("  GET  /health - Health check (open)");
});

module.exports = app;
