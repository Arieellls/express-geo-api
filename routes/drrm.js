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

router.get("/tsunami-phivolcs", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let features = drrmCache.get("phivolcs-tsunami") || [];

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
    console.error("Error fetching phivolcs-tsunami data:", error);
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

const layer = [
  "flood-noah",
  "noah-storm-surge",
  "phivolcs-liquefaction",
  "phivolcs-tsunami",
];

router.get("/flood-exposure/critical-infra/summary", (req, res) => {
  try {
    const { layer: requestedLayer } = req.query;

    if (!requestedLayer || !layer.includes(requestedLayer)) {
      return res.status(400).json({ error: "Invalid layer requested" });
    }

    const floodFeatures = drrmCache.get(requestedLayer) || [];
    const criticalInfraFeatures = drrmCache.get("critical-infra") || [];

    const summary = {};
    const municipalitySummary = {};
    const exposedFacilityIds = new Set();

    const getMunicipality = (properties) => properties?.municity ?? "Unknown";

    const normalizeSusceptibility = (raw) => {
      if (!raw) return "Unknown";

      return raw.toString().trim().replace(/\s+/g, " ");
    };

    const susceptibilityLevelsSet = new Set();

    for (const flood of floodFeatures) {
      const level = normalizeSusceptibility(flood.properties?.susceptibility);
      susceptibilityLevelsSet.add(level);
    }

    const susceptibilityLevels = Array.from(susceptibilityLevelsSet).sort();

    const createCounter = () =>
      Object.fromEntries(susceptibilityLevels.map((level) => [level, 0]));

    for (const facility of criticalInfraFeatures) {
      const type = facility.properties?.type ?? "Unknown";
      const municipality = getMunicipality(facility.properties);

      if (!summary[type]) {
        summary[type] = createCounter();
      }

      if (!municipalitySummary[municipality]) {
        municipalitySummary[municipality] = {};
      }

      if (!municipalitySummary[municipality][type]) {
        municipalitySummary[municipality][type] = createCounter();
      }
    }

    for (const flood of floodFeatures) {
      if (!flood.geometry) continue;

      const susceptibility = normalizeSusceptibility(
        flood.properties?.susceptibility,
      );

      for (const facility of criticalInfraFeatures) {
        if (!facility.geometry) continue;

        let intersects = false;

        try {
          intersects =
            facility.geometry.type === "Point"
              ? turf.booleanPointInPolygon(facility, flood)
              : turf.booleanIntersects(facility, flood);
        } catch (err) {
          console.warn("Intersection check failed:", err.message);
          continue;
        }

        if (!intersects) continue;

        const id = facility.properties?.id ?? facility.properties?.name;

        const type = facility.properties?.type ?? "Unknown";
        const municipality = getMunicipality(facility.properties);

        exposedFacilityIds.add(id);

        summary[type][susceptibility] =
          (summary[type][susceptibility] ?? 0) + 1;

        municipalitySummary[municipality][type][susceptibility] =
          (municipalitySummary[municipality][type][susceptibility] ?? 0) + 1;
      }
    }

    res.json({
      type: "flood-exposure-critical-summary",
      totalFacilities: criticalInfraFeatures.length,
      exposedFacilities: exposedFacilityIds.size,
      susceptibilityLevels,
      summary,
      municipalitySummary,
    });
  } catch (error) {
    console.error("Error building flood exposure summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
