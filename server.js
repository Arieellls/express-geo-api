import express from "express";
import cors from "cors";

import { boundariesCache } from "./lib/cache.js";
import {
  loadBoundaries,
  loadPOIs,
  loadMobility,
  loadTransportation,
  loadDRRM,
} from "./lib/loaders.js";

import { registerRoutes } from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
registerRoutes(app);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    boundariesLoaded: boundariesCache.size,
  });
});

async function startServer() {
  await loadBoundaries();
  await loadPOIs();
  await loadMobility();
  await loadTransportation();
  await loadDRRM();

  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Boundaries:      /api/insights/boundaries`);
    console.log(`POIs:            /api/insights/pois`);
    console.log(`Mobility:        /api/insights/mobility`);
    console.log(`Transportation: /api/insights/transportation`);
    console.log(`DRRM:            /api/insights/drrm/flood-noah`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.log(`💡 Fix options:`);
      console.log(`   netstat -ano | findstr :${PORT}`);
      console.log(`   taskkill /PID <PID> /F`);
      console.log(`   OR`);
      console.log(`   $env:PORT=3001; npm start`);
      process.exit(1);
    }

    console.error("Server error:", error);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
