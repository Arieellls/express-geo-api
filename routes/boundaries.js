import express from "express";
import { boundariesCache } from "../lib/cache.js";
import {
  getAvailableAdminTypes,
  getAvailableNames,
  getNameFromFilename,
  getAdminTypeFromFilename,
} from "../lib/boundaryHelpers.js";

const router = express.Router();

router.get("/admin-types", (req, res) => {
  const adminTypes = getAvailableAdminTypes();
  res.json({
    admin_types: adminTypes.map((type) => ({
      admin_type: type,
      available_names: getAvailableNames(type),
    })),
    total_types: adminTypes.length,
  });
});

router.get("/", (req, res) => {
  const { admin_type, name } = req.query;
  const features = [];

  for (const [filename, geojson] of boundariesCache.entries()) {
    if (
      (admin_type && getAdminTypeFromFilename(filename) !== admin_type) ||
      (name &&
        getNameFromFilename(filename)?.toLowerCase() !== name.toLowerCase())
    )
      continue;

    if (geojson?.features) features.push(...geojson.features);
  }

  res.json({ type: "FeatureCollection", features });
});

export default router;
