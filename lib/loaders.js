import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import {
  boundariesCache,
  poisCache,
  mobilityCache,
  transportationCache,
  drrmCache,
} from "./cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAllGeoJSONFiles(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length) {
    const currentDir = stack.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".geojson")) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

export async function loadBoundaries() {
  const dir = path.join(__dirname, "..", "data", "boundaries");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".geojson"));

  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), "utf-8");
    boundariesCache.set(file, JSON.parse(content));
  }

  console.log(`Loaded ${boundariesCache.size} boundary files`);
}

export async function loadMobility() {
  const dir = path.join(__dirname, "..", "data", "mobility");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".geojson"));

  const features = [];
  for (const file of files) {
    const geojson = JSON.parse(
      await fs.readFile(path.join(dir, file), "utf-8"),
    );
    if (geojson?.features) features.push(...geojson.features);
  }

  mobilityCache.set("mobility", features);
  console.log(`Loaded ${features.length} mobility features`);
}

export async function loadPOIs() {
  const poisDir = path.join(__dirname, "..", "data", "pois");

  for (const category of await fs.readdir(poisDir)) {
    const categoryPath = path.join(poisDir, category);
    if (!(await fs.stat(categoryPath)).isDirectory()) continue;

    const features = [];
    for (const file of (await fs.readdir(categoryPath)).filter((f) =>
      f.endsWith(".geojson"),
    )) {
      const geojson = JSON.parse(
        await fs.readFile(path.join(categoryPath, file), "utf-8"),
      );
      if (geojson?.features) features.push(...geojson.features);
    }

    poisCache.set(category, features);
  }

  console.log(`Loaded POIs for ${poisCache.size} categories`);
}

export async function loadTransportation() {
  const dir = path.join(__dirname, "..", "data", "transportation");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".geojson"));

  const features = [];
  for (const file of files) {
    const geojson = JSON.parse(
      await fs.readFile(path.join(dir, file), "utf-8"),
    );
    if (geojson?.features) features.push(...geojson.features);
  }

  transportationCache.set("transportation", features);
  console.log(`Loaded ${features.length} transportation features`);
}

export async function loadDRRM() {
  const dir = path.join(__dirname, "..", "data", "drrm");
  const files = await getAllGeoJSONFiles(dir);

  const grouped = {};

  for (const filePath of files) {
    const geojson = JSON.parse(await fs.readFile(filePath, "utf-8"));
    if (!geojson?.features) continue;

    const key = path.basename(filePath, ".geojson");
    grouped[key] = (grouped[key] || []).concat(geojson.features);
  }

  for (const [key, features] of Object.entries(grouped)) {
    drrmCache.set(key, features);
    console.log(`Loaded ${features.length} DRRM features for ${key}`);
  }
}
