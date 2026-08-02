import { createServer } from "node:http";

import { createRequestHandler } from "./app.js";
import { readAuthConfig } from "./auth-config.js";
import { createAuthService } from "./auth-service.js";
import { createPostgresExpiringStore } from "./auth-store.js";
import {
  checkDatabaseReady,
  createDatabase,
  readDatabaseConfig,
} from "./database.js";
import { createGoogleOidcClient } from "./google-oidc.js";
import {
  createAuthAuditWriter,
  createMembershipRepository,
} from "./membership-repository.js";
import { runMigrations } from "./migrator.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8080;
const SHUTDOWN_TIMEOUT_MS = 10_000;

function writeOperationalEvent(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

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

function parseTrustedProxyHops(value) {
  if (value === undefined || value === "") return 0;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error("QTS_TRUST_PROXY_HOPS must be an integer between 0 and 10.");
  }
  return hops;
}

export function readServerConfig(environment = process.env) {
  return {
    host: environment.QTS_API_HOST?.trim() || DEFAULT_HOST,
    port: parsePort(environment.QTS_API_PORT),
    trustedProxyHops: parseTrustedProxyHops(environment.QTS_TRUST_PROXY_HOPS),
  };
}

export async function createApiServer({ environment = process.env } = {}) {
  const serverConfig = readServerConfig(environment);
  const authConfig = readAuthConfig(environment);
  const database = createDatabase(readDatabaseConfig(environment));
  await runMigrations(database);
  const membershipRepository = createMembershipRepository(database);
  await membershipRepository.bootstrap(authConfig.memberships ?? []);
  const oidcClient = authConfig.enabled
    ? createGoogleOidcClient(authConfig)
    : undefined;
  const authService = createAuthService({
    config: authConfig,
    oidcClient,
    audit: createAuthAuditWriter(database),
    membershipResolver: (input) => membershipRepository.resolve(input),
    transactionStore: createPostgresExpiringStore({
      database,
      storeName: "transaction",
    }),
    sessionStore: createPostgresExpiringStore({
      database,
      storeName: "session",
    }),
  });
  const server = createServer(
    createRequestHandler({
      authService,
      isReady: () => checkDatabaseReady(database),
      trustedProxyHops: serverConfig.trustedProxyHops,
    }),
  );
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.on("clientError", (_error, socket) => socket.destroy());
  server.database = database;
  return server;
}

const config = readServerConfig();
const server = await createApiServer();
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  writeOperationalEvent({ event: "api_shutdown_started", signal });

  const shutdownTimer = setTimeout(() => {
    process.stderr.write(
      `${JSON.stringify({ event: "api_shutdown_timeout" })}\n`,
    );
    process.exitCode = 1;
    server.closeAllConnections();
  }, SHUTDOWN_TIMEOUT_MS);
  shutdownTimer.unref();

  server.close(async (error) => {
    clearTimeout(shutdownTimer);
    if (error) {
      process.stderr.write(
        `${JSON.stringify({ event: "api_shutdown_failed", message: error.message })}\n`,
      );
      process.exitCode = 1;
      return;
    }

    await server.database.end();
    writeOperationalEvent({ event: "api_shutdown_complete" });
  });
}

server.on("error", (error) => {
  process.stderr.write(
    `${JSON.stringify({ event: "api_server_error", message: error.message })}\n`,
  );
  process.exitCode = 1;
});

server.listen(config.port, config.host, () => {
  writeOperationalEvent({
    event: "api_started",
    host: config.host,
    port: config.port,
  });
});

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
