import express from "express";
import * as turf from "@turf/turf";

import { drrmCache } from "../lib/cache.js";
import RBush from "rbush";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "DRRM Endpoints",
    endpoints: [
      { method: "GET", path: "/", description: "Test endpoint" },
      {
        method: "GET",
        path: "/flood-noah",
        description:
          "Get flood-noah data with optional filters (province, municity, barangay)",
      },
    ],
  });
});

router.get("/flood-noah", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let features = drrmCache.get("flood-noah") || [];

    if (province) {
      features = features.filter(
        (f) => f.properties?.province?.toLowerCase() === province.toLowerCase(),
      );
    }

    res.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Error fetching flood-noah data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/storm-surge-noah", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let features = drrmCache.get("noah-storm-surge") || [];

    if (province) {
      features = features.filter(
        (f) => f.properties?.province?.toLowerCase() === province.toLowerCase(),
      );
    }

    res.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Error fetching storm-surge-noah data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/critical-infra", (req, res) => {
  try {
    const { zoom, minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({ error: "Missing bbox parameters" });
    }

    const bbox = [
      Number(minLng),
      Number(minLat),
      Number(maxLng),
      Number(maxLat),
    ];

    let features = drrmCache.get("critical-infra") || [];

    // 👇 Add these logs
    console.log("zoom:", zoom);
    console.log("bbox:", bbox);
    console.log("total features in cache:", features.length);

    const bboxPolygon = turf.bboxPolygon(bbox);

    features = features.filter((feature) => {
      if (!feature.geometry) return false;
      return turf.booleanIntersects(feature, bboxPolygon);
    });

    // 👇 And this
    console.log("features after bbox filter:", features.length);

    res.json({
      type: "FeatureCollection",
      features,
      meta: { bbox, zoom },
    });
  } catch (error) {
    console.error("Error fetching critical-infra data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/phivolcs-liquefaction", (req, res) => {
  try {
    // const { zoom, minLng, minLat, maxLng, maxLat } = req.query;

    // if (!minLng || !minLat || !maxLng || !maxLat) {
    //   return res.status(400).json({ error: "Missing bbox parameters" });
    // }

    // const bbox = [
    //   Number(minLng),
    //   Number(minLat),
    //   Number(maxLng),
    //   Number(maxLat),
    // ];

    let features = drrmCache.get("phivolcs-liquefaction") || [];

    // // 👇 Add these logs
    // console.log("zoom:", zoom);
    // console.log("bbox:", bbox);
    // console.log("total features in cache:", features.length);

    // const bboxPolygon = turf.bboxPolygon(bbox);

    // features = features.filter((feature) => {
    //   if (!feature.geometry) return false;
    //   return turf.booleanIntersects(feature, bboxPolygon);
    // });

    // 👇 And this
    // console.log("features after bbox filter:", features.length);

    res.json({
      type: "FeatureCollection",
      features,
      // meta: { bbox, zoom },
    });
  } catch (error) {
    console.error("Error fetching phivolcs-liquefaction data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const buildingIndex = new RBush();
let buildingIndexed = false;

function indexBuildingFeatures(features) {
  const items = features
    .filter((f) => f.geometry)
    .map((f) => {
      const [minX, minY, maxX, maxY] = turf.bbox(f);
      return { minX, minY, maxX, maxY, feature: f };
    });
  buildingIndex.load(items);
}

router.get("/building-footprints", (req, res) => {
  if (!buildingIndexed) {
    const features = drrmCache.get("building-footprints") || [];
    indexBuildingFeatures(features);
    buildingIndexed = true;
  }

  try {
    const { zoom, minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({ error: "Missing bbox parameters" });
    }

    const zoomLevel = Number(zoom);

    // Server-side zoom gate — reject requests below z15
    if (zoomLevel < 10) {
      return res.json({
        type: "FeatureCollection",
        features: [],
        meta: { zoom: zoomLevel, reason: "zoom too low" },
      });
    }

    const bbox = {
      minX: Number(minLng),
      minY: Number(minLat),
      maxX: Number(maxLng),
      maxY: Number(maxLat),
    };

    const results = buildingIndex.search(bbox);
    let features = results.map((item) => item.feature);

    // At z15+ viewport is small, 2000 is plenty
    const MAX_FEATURES = 10000;
    if (features.length > MAX_FEATURES) {
      features = features.slice(0, MAX_FEATURES);
    }

    res.json({
      type: "FeatureCollection",
      features,
      meta: { bbox, zoom: zoomLevel, total: results.length },
    });
  } catch (error) {
    console.error("Error fetching building-footprints data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
