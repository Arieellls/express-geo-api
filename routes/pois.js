import express from "express";
import { poisCache } from "../lib/cache.js";

const router = express.Router();

function normalizeCategory(category) {
  return category
    ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
    : null;
}

router.get("/", (req, res) => {
  try {
    const rawCategory = req.query.category;
    const category = normalizeCategory(rawCategory);

    let features = [];

    if (category) {
      features = poisCache.get(category) || [];
    } else {
      for (const categoryFeatures of poisCache.values()) {
        features.push(...categoryFeatures);
      }
    }

    const transformedFeatures = features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        poi_type: feature.properties?.type ?? null,
      },
    }));

    res.json({
      results: {
        type: "FeatureCollection",
        features: transformedFeatures,
      },
    });
  } catch (error) {
    console.error("Error fetching POIs:", error);
    res.json({
      results: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }
});

export default router;
