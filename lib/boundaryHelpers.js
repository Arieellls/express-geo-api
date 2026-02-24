import { boundariesCache } from "./cache.js";

export function getAdminTypeFromFilename(filename) {
  if (filename.includes("_Municipal")) return "Municipality";
  if (filename.includes("_City")) return "City";
  if (filename.includes("_Province")) return "Province";
  if (filename.includes("_Barangay")) return "Barangay";
  return null;
}

export function getNameFromFilename(filename) {
  const parts = filename.replace("BOUNDARIES_", "").split("_");
  if (parts.length > 0) {
    const name = parts[0];
    if (name === "IloiloCity") return "Iloilo";
    if (name === "SanMiguel") return "San Miguel";
    if (name === "SantaBarbara") return "Santa Barbara";
    return name;
  }
  return null;
}

export function getProvinceFromFeature(feature) {
  return feature.properties?.province?.toLowerCase() || null;
}

export function getAvailableAdminTypes() {
  const adminTypes = new Set();
  for (const filename of boundariesCache.keys()) {
    const adminType = getAdminTypeFromFilename(filename);
    if (adminType) adminTypes.add(adminType);
  }
  return Array.from(adminTypes).sort();
}

export function getAvailableNames(adminType) {
  const names = new Set();
  for (const filename of boundariesCache.keys()) {
    const fileAdminType = getAdminTypeFromFilename(filename);
    if (fileAdminType === adminType) {
      const name = getNameFromFilename(filename);
      if (name) names.add(name);
    }
  }
  return Array.from(names).sort();
}
