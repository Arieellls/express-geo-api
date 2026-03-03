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

router.get("/flood-mgb", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let features = drrmCache.get("flood-mgb") || [];

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
    console.error("Error fetching flood-mgb data:", error);
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

    console.log("zoom:", zoom);
    console.log("bbox:", bbox);
    console.log("total features in cache:", features.length);

    const bboxPolygon = turf.bboxPolygon(bbox);

    features = features.filter((feature) => {
      if (!feature.geometry) return false;
      return turf.booleanIntersects(feature, bboxPolygon);
    });

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

function countCriticalInfraByType(features) {
  return features.reduce((acc, feature) => {
    const type = feature?.properties?.type;
    if (!type) return acc;

    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
}

router.get("/critical-infra/count", (req, res) => {
  try {
    const features = drrmCache.get("critical-infra") || [];

    const byType = countCriticalInfraByType(features);

    res.json({
      total: features.length,
      byType,
    });
  } catch (error) {
    console.error("Error fetching global critical-infra counts:", error);
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

    // console.log("zoom:", zoom);
    // console.log("bbox:", bbox);
    // console.log("total features in cache:", features.length);

    // const bboxPolygon = turf.bboxPolygon(bbox);

    // features = features.filter((feature) => {
    //   if (!feature.geometry) return false;
    //   return turf.booleanIntersects(feature, bboxPolygon);
    // });

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

const landslideIndex = new RBush();
let landslideIndexed = false;

function indexLandslideFeatures(features) {
  const items = features
    .filter((f) => f.geometry)
    .map((f) => {
      const [minX, minY, maxX, maxY] = turf.bbox(f);
      return { minX, minY, maxX, maxY, feature: f };
    });
  landslideIndex.load(items);
}

router.get("/earthquake-induced-landslide", (req, res) => {
  if (!landslideIndexed) {
    const features =
      drrmCache.get("earthquake-induced-landslide-phivolcs") || [];
    indexLandslideFeatures(features);
    landslideIndexed = true;
  }

  try {
    const { zoom, minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({ error: "Missing bbox parameters" });
    }

    const zoomLevel = Number(zoom);

    // if (zoomLevel < 10) {
    //   return res.json({
    //     type: "FeatureCollection",
    //     features: [],
    //     meta: { zoom: zoomLevel, reason: "zoom too low" },
    //   });
    // }

    const bbox = {
      minX: Number(minLng),
      minY: Number(minLat),
      maxX: Number(maxLng),
      maxY: Number(maxLat),
    };

    const results = landslideIndex.search(bbox);
    let features = results.map((item) => item.feature);

    console.log("zoom:", zoomLevel);
    console.log("bbox:", bbox);
    console.log("features after bbox filter:", features.length);

    const MAX_FEATURES = 1000;
    if (features.length > MAX_FEATURES) {
      features.sort((a, b) => {
        const aCoord =
          a.geometry.coordinates[0][0] ?? a.geometry.coordinates[0];
        const bCoord =
          b.geometry.coordinates[0][0] ?? b.geometry.coordinates[0];
        const [ax, ay] = Array.isArray(aCoord[0]) ? aCoord[0] : aCoord;
        const [bx, by] = Array.isArray(bCoord[0]) ? bCoord[0] : bCoord;
        return ax + ay - (bx + by);
      });
      const step = Math.floor(features.length / MAX_FEATURES);
      features = features
        .filter((_, i) => i % step === 0)
        .slice(0, MAX_FEATURES);
    }

    res.json({
      type: "FeatureCollection",
      features,
      meta: { bbox, zoom: zoomLevel, total: results.length },
    });
  } catch (error) {
    console.error("Error fetching earthquake-induced-landslide data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const landslideNOAHIndex = new RBush();
let landslideNOAHIndexed = false;

function indexLandslideNOAHFeatures(features) {
  const items = features
    .filter((f) => f.geometry)
    .map((f) => {
      const [minX, minY, maxX, maxY] = turf.bbox(f);
      return { minX, minY, maxX, maxY, feature: f };
    });
  landslideNOAHIndex.load(items);
}

router.get("/landslide-noah", (req, res) => {
  if (!landslideNOAHIndexed) {
    const features = drrmCache.get("landslide-noah") || [];
    indexLandslideNOAHFeatures(features);
    landslideNOAHIndexed = true;
  }

  try {
    const { zoom, minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({ error: "Missing bbox parameters" });
    }

    const zoomLevel = Number(zoom);

    const bbox = {
      minX: Number(minLng),
      minY: Number(minLat),
      maxX: Number(maxLng),
      maxY: Number(maxLat),
    };

    const results = landslideNOAHIndex.search(bbox);
    let features = results.map((item) => item.feature);

    console.log("zoom:", zoomLevel);
    console.log("bbox:", bbox);
    console.log("features after bbox filter:", features.length);

    const MAX_FEATURES = 100;
    if (features.length > MAX_FEATURES) {
      features.sort((a, b) => {
        const aCoord =
          a.geometry.coordinates[0][0] ?? a.geometry.coordinates[0];
        const bCoord =
          b.geometry.coordinates[0][0] ?? b.geometry.coordinates[0];
        const [ax, ay] = Array.isArray(aCoord[0]) ? aCoord[0] : aCoord;
        const [bx, by] = Array.isArray(bCoord[0]) ? bCoord[0] : bCoord;
        return ax + ay - (bx + by);
      });
      const step = Math.floor(features.length / MAX_FEATURES);
      features = features
        .filter((_, i) => i % step === 0)
        .slice(0, MAX_FEATURES);
    }

    res.json({
      type: "FeatureCollection",
      features,
      meta: { bbox, zoom: zoomLevel, total: results.length },
    });
  } catch (error) {
    console.error("Error fetching landslide-noah data:", error);
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
      features.sort((a, b) => {
        const [ax, ay] = a.geometry.coordinates[0][0];
        const [bx, by] = b.geometry.coordinates[0][0];
        // interleave x/y to avoid column-ordering bias
        return ax + ay - (bx + by);
      });
      // Stride-sample across the sorted list for even spread
      const step = Math.floor(features.length / MAX_FEATURES);
      features = features
        .filter((_, i) => i % step === 0)
        .slice(0, MAX_FEATURES);
    }

    res.json({
      type: "FeatureCollection",
      features,
      meta: { bbox, total: results.length },
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
  "flood-mgb",
];

router.get("/exposure/critical-infra/summary", (req, res) => {
  try {
    const { layer: requestedLayer } = req.query;

    if (!requestedLayer || !layer.includes(requestedLayer)) {
      return res.status(400).json({ error: "Invalid layer requested" });
    }

    const layerFeatures = drrmCache.get(requestedLayer) || [];
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

    for (const flood of layerFeatures) {
      const level = normalizeSusceptibility(
        flood.properties?.susceptibility ?? flood.properties?.FloodSusc,
      );
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

    for (const layer of layerFeatures) {
      if (!layer.geometry) continue;

      const susceptibility = normalizeSusceptibility(
        layer.properties?.susceptibility ?? layer.properties?.FloodSusc,
      );

      for (const facility of criticalInfraFeatures) {
        if (!facility.geometry) continue;

        let intersects = false;

        try {
          intersects =
            facility.geometry.type === "Point"
              ? turf.booleanPointInPolygon(facility, layer)
              : turf.booleanIntersects(facility, layer);
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

router.get("/exposure/building-footprints/summary", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let floodFeatures = drrmCache.get("flood-noah") || [];
    let buildingFeatures = drrmCache.get("building-footprints") || [];

    const totalBuildings = buildingFeatures.length;

    if (province) {
      floodFeatures = floodFeatures.filter(
        (f) => f.properties?.province?.toLowerCase() === province.toLowerCase(),
      );
    }
    if (municity) {
      floodFeatures = floodFeatures.filter(
        (f) => f.properties?.municity?.toLowerCase() === municity.toLowerCase(),
      );
    }
    if (barangay) {
      floodFeatures = floodFeatures.filter(
        (f) => f.properties?.barangay?.toLowerCase() === barangay.toLowerCase(),
      );
    }

    if (floodFeatures.length === 0 || buildingFeatures.length === 0) {
      return res.json({
        type: "building-footprint-exposure-summary",
        totalBuildings,
        sampledBuildings: 0,
        exposedBuildings: 0,
        susceptibilityLevels: [],
        summary: {},
        municipalitySummary: {},
      });
    }

    const allLevels = [
      ...new Set(
        floodFeatures
          .map(
            (f) =>
              f.properties?.susceptibility ??
              f.properties?.hazard ??
              f.properties?.FloodSusc ??
              null,
          )
          .filter(Boolean),
      ),
    ].sort();

    const floodIndex = new RBush();
    const floodItems = floodFeatures
      .filter((f) => f.geometry)
      .map((f) => {
        const [minX, minY, maxX, maxY] = turf.bbox(f);
        return { minX, minY, maxX, maxY, feature: f };
      });
    floodIndex.load(floodItems);

    let sampledBuildings = 0;
    const exposedBuildings = [];

    for (const building of buildingFeatures) {
      if (!building.geometry) continue;
      // if (sampledBuildings >= SAMPLE_LIMIT) break;

      sampledBuildings++;

      const centroid = turf.centroid(building);
      const [minX, minY, maxX, maxY] = turf.bbox(centroid);

      const candidates = floodIndex.search({
        minX: minX - 0.0001,
        minY: minY - 0.0001,
        maxX: maxX + 0.0001,
        maxY: maxY + 0.0001,
      });

      if (candidates.length === 0) continue;

      const intersected = candidates.find((c) =>
        turf.booleanPointInPolygon(centroid, c.feature),
      );

      if (intersected) {
        const level =
          intersected.feature.properties?.susceptibility ??
          intersected.feature.properties?.FloodSusc ??
          intersected.feature.properties?.hazard ??
          "Unknown";

        const municipality =
          building.properties?.municity ??
          intersected.feature.properties?.municity ??
          "Unknown";

        exposedBuildings.push({ level, municipality });
      }
    }

    const summary = Object.fromEntries(allLevels.map((l) => [l, 0]));
    const municipalitySummary = {};

    for (const { level, municipality } of exposedBuildings) {
      summary[level] = (summary[level] ?? 0) + 1;

      if (!municipalitySummary[municipality]) {
        municipalitySummary[municipality] = Object.fromEntries(
          allLevels.map((l) => [l, 0]),
        );
      }
      municipalitySummary[municipality][level] =
        (municipalitySummary[municipality][level] ?? 0) + 1;
    }

    res.json({
      type: "building-footprint-exposure-summary",
      totalBuildings,
      sampledBuildings,
      exposedBuildings: exposedBuildings.length,
      susceptibilityLevels: allLevels,
      summary,
      municipalitySummary,
    });
  } catch (error) {
    console.error(
      "Error computing building footprint exposure summary:",
      error,
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
