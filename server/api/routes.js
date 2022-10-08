import healthCheck from "./healthCheck";

export default function addRoutes(app) {
  app.use("/v1/healthCheck", healthCheck);
}

export { addRoutes };
