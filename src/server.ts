import "dotenv/config";
import { app } from "./app";
import { env, reportConfigurationWarnings } from "./config/env";
import { disconnectDatabase } from "./db/prisma";

reportConfigurationWarnings();

const server = app.listen(env.port, () => {
  console.log(`DevMate AI backend listening on port ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down.`);
  server.close(() => {
    void disconnectDatabase().finally(() => process.exit(0));
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
