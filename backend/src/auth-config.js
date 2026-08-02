const GOOGLE_ISSUER = "https://accounts.google.com";
const DEFAULT_PUBLIC_ORIGIN = "http://127.0.0.1:5173";
const CALLBACK_PATH = "/api/v1/auth/callback/google";

export const ROLE_WORKSPACES = Object.freeze({
  client_admin: "client",
  client_viewer: "client",
  billing: "client",
  technical: "client",
  soc_l1: "internal",
  soc_l2: "internal",
  soc_l3: "internal",
  account_manager: "internal",
  qts_admin: "internal",
});

function readTrimmed(environment, name) {
  const value = environment[name];
  return typeof value === "string" ? value.trim() : "";
}

function parsePublicOrigin(value, nodeEnvironment) {
  let url;

  try {
    url = new URL(value || DEFAULT_PUBLIC_ORIGIN);
  } catch {
    throw new Error("QTS_PUBLIC_ORIGIN must be a valid absolute URL.");
  }

  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("QTS_PUBLIC_ORIGIN must contain only scheme, host, and optional port.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("QTS_PUBLIC_ORIGIN must use HTTP or HTTPS.");
  }
  if (nodeEnvironment === "production" && url.protocol !== "https:") {
    throw new Error("QTS_PUBLIC_ORIGIN must use HTTPS in production.");
  }

  return url.origin;
}

function parseBoolean(value, defaultValue, name) {
  if (value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false.`);
}

function parseDuration(environment, name, defaultSeconds, minimum, maximum) {
  const raw = readTrimmed(environment, name);
  if (!raw) return defaultSeconds * 1000;

  const seconds = Number(raw);
  if (!Number.isInteger(seconds) || seconds < minimum || seconds > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum} seconds.`);
  }
  return seconds * 1000;
}

function requireString(record, name, index) {
  const value = record[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}].${name} is required.`);
  }
  return value.trim();
}

function parseMemberships(raw, issuer) {
  let records;

  try {
    records = JSON.parse(raw);
  } catch {
    throw new Error("QTS_AUTH_MEMBERSHIPS_JSON must be valid JSON.");
  }

  if (!Array.isArray(records)) {
    throw new Error("QTS_AUTH_MEMBERSHIPS_JSON must be a JSON array.");
  }

  const stableIdentities = new Set();
  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}] must be an object.`);
    }

    const allowedKeys = new Set(["issuer", "subject", "tenantId", "role"]);
    const unknownKey = Object.keys(record).find((key) => !allowedKeys.has(key));
    if (unknownKey) {
      throw new Error(
        `QTS_AUTH_MEMBERSHIPS_JSON[${index}].${unknownKey} is not allowed; identity must use issuer and subject.`,
      );
    }

    const memberIssuer = requireString(record, "issuer", index);
    const subject = requireString(record, "subject", index);
    const tenantId = requireString(record, "tenantId", index);
    const role = requireString(record, "role", index);

    if (memberIssuer !== issuer) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}].issuer must match GOOGLE_OIDC_ISSUER.`);
    }
    if (subject.length > 255) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}].subject is too long.`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(tenantId)) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}].tenantId is invalid.`);
    }
    const workspace = ROLE_WORKSPACES[role];
    if (!workspace) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON[${index}].role is not supported.`);
    }

    const stableIdentity = `${memberIssuer}\u0000${subject}`;
    if (stableIdentities.has(stableIdentity)) {
      throw new Error(`QTS_AUTH_MEMBERSHIPS_JSON contains a duplicate issuer + subject pair.`);
    }
    stableIdentities.add(stableIdentity);

    return Object.freeze({
      issuer: memberIssuer,
      subject,
      tenantId,
      role,
      workspace,
    });
  });
}

export function readAuthConfig(environment = process.env) {
  const nodeEnvironment = readTrimmed(environment, "NODE_ENV") || "development";
  const clientId = readTrimmed(environment, "GOOGLE_CLIENT_ID");
  const clientSecret = readTrimmed(environment, "GOOGLE_CLIENT_SECRET");
  const membershipsJson = readTrimmed(environment, "QTS_AUTH_MEMBERSHIPS_JSON");
  const hostedDomain = readTrimmed(environment, "GOOGLE_WORKSPACE_DOMAIN").toLowerCase();
  const configuredValues = [clientId, clientSecret, membershipsJson, hostedDomain].filter(Boolean);

  if (configuredValues.length === 0) {
    return Object.freeze({
      enabled: false,
      provider: "google",
      publicOrigin: parsePublicOrigin(
        readTrimmed(environment, "QTS_PUBLIC_ORIGIN"),
        nodeEnvironment,
      ),
      cookieSecure: false,
      transactionCookieName: "qts_oidc_tx",
      sessionCookieName: "qts_session",
    });
  }

  const required = [
    ["GOOGLE_CLIENT_ID", clientId],
    ["GOOGLE_CLIENT_SECRET", clientSecret],
    ["QTS_AUTH_MEMBERSHIPS_JSON", membershipsJson],
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required authentication configuration: ${missing.join(", ")}.`);
  }

  const issuer = readTrimmed(environment, "GOOGLE_OIDC_ISSUER") || GOOGLE_ISSUER;
  if (issuer !== GOOGLE_ISSUER) {
    throw new Error(`GOOGLE_OIDC_ISSUER must be ${GOOGLE_ISSUER}.`);
  }

  const publicOrigin = parsePublicOrigin(
    readTrimmed(environment, "QTS_PUBLIC_ORIGIN"),
    nodeEnvironment,
  );
  const cookieSecure = parseBoolean(
    readTrimmed(environment, "QTS_AUTH_COOKIE_SECURE"),
    publicOrigin.startsWith("https://"),
    "QTS_AUTH_COOKIE_SECURE",
  );
  if (nodeEnvironment === "production" && !cookieSecure) {
    throw new Error("QTS_AUTH_COOKIE_SECURE must be true in production.");
  }

  return Object.freeze({
    enabled: true,
    provider: "google",
    issuer,
    clientId,
    clientSecret,
    publicOrigin,
    redirectUri: new URL(CALLBACK_PATH, publicOrigin).href,
    hostedDomain: hostedDomain || undefined,
    cookieSecure,
    transactionCookieName: cookieSecure ? "__Secure-qts_oidc_tx" : "qts_oidc_tx",
    sessionCookieName: cookieSecure ? "__Host-qts_session" : "qts_session",
    transactionTtlMs: parseDuration(
      environment,
      "QTS_AUTH_TRANSACTION_TTL_SECONDS",
      600,
      120,
      900,
    ),
    sessionTtlMs: parseDuration(
      environment,
      "QTS_SESSION_TTL_SECONDS",
      28_800,
      900,
      86_400,
    ),
    memberships: Object.freeze(parseMemberships(membershipsJson, issuer)),
  });
}
