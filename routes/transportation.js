import express from "express";
import { transportationCache } from "../lib/cache.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const { province, municity, barangay } = req.query;

    let features = transportationCache.get("transportation") || [];

    if (province) {
      features = features.filter(
        (f) => f.properties?.province?.toLowerCase() === province.toLowerCase(),
      );
    }

    if (municity) {
      features = features.filter(
        (f) => f.properties?.municity?.toLowerCase() === municity.toLowerCase(),
      );
    }

    if (barangay) {
      features = features.filter(
        (f) => f.properties?.barangay?.toLowerCase() === barangay.toLowerCase(),
      );
    }

    res.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Error fetching transportation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
