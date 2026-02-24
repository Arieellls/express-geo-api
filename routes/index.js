import boundariesRouter from "./boundaries.js";
import mobilityRouter from "./mobility.js";
import transportationRouter from "./transportation.js";
import poisRouter from "./pois.js";
import drrmRouter from "./drrm.js";

export function registerRoutes(app) {
  app.use("/api/insights/boundaries", boundariesRouter);
  app.use("/api/insights/mobility", mobilityRouter);
  app.use("/api/insights/transportation", transportationRouter);
  app.use("/api/insights/pois", poisRouter);
  app.use("/api/insights/drrm", drrmRouter);
}
