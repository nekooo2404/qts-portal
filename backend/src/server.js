import { createServer } from "node:http";

import { createRequestHandler } from "./app.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8080;
const SHUTDOWN_TIMEOUT_MS = 10_000;

function parsePort(value) {
  if (value === undefined || value === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("QTS_API_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function readServerConfig(environment = process.env) {
  return {
    host: environment.QTS_API_HOST?.trim() || DEFAULT_HOST,
    port: parsePort(environment.QTS_API_PORT),
  };
}

export function createApiServer() {
  const server = createServer(createRequestHandler());
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.on("clientError", (_error, socket) => socket.destroy());
  return server;
}

const config = readServerConfig();
const server = createApiServer();
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.stdout.write(
    `${JSON.stringify({ event: "api_shutdown_started", signal })}\n`,
  );

  const shutdownTimer = setTimeout(() => {
    process.stderr.write(
      `${JSON.stringify({ event: "api_shutdown_timeout" })}\n`,
    );
    process.exitCode = 1;
    server.closeAllConnections();
  }, SHUTDOWN_TIMEOUT_MS);
  shutdownTimer.unref();

  server.close((error) => {
    clearTimeout(shutdownTimer);
    if (error) {
      process.stderr.write(
        `${JSON.stringify({ event: "api_shutdown_failed", message: error.message })}\n`,
      );
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`${JSON.stringify({ event: "api_shutdown_complete" })}\n`);
  });
}

server.on("error", (error) => {
  process.stderr.write(
    `${JSON.stringify({ event: "api_server_error", message: error.message })}\n`,
  );
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  process.stdout.write(
    `${JSON.stringify({
      event: "api_started",
      host: config.host,
      port: config.port,
    })}\n`,
  );
});

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
