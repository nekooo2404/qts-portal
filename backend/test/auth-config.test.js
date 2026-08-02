import assert from "node:assert/strict";
import { test } from "node:test";

import { readAuthConfig } from "../src/auth-config.js";

const VALID_ENVIRONMENT = Object.freeze({
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  GOOGLE_WORKSPACE_DOMAIN: "qts.com.vn",
  QTS_PUBLIC_ORIGIN: "https://portal.qts.com.vn",
  QTS_AUTH_MEMBERSHIPS_JSON: JSON.stringify([
    {
      issuer: "https://accounts.google.com",
      subject: "google-subject-001",
      tenantId: "qts-vietnam",
      role: "qts_admin",
    },
  ]),
});

test("OIDC bị khóa khi toàn bộ credential Google chưa được cấu hình", () => {
  const config = readAuthConfig({ NODE_ENV: "development" });

  assert.equal(config.enabled, false);
  assert.equal(config.provider, "google");
});

test("đọc cấu hình OIDC production và ánh xạ role theo iss + sub", () => {
  const config = readAuthConfig(VALID_ENVIRONMENT);

  assert.equal(config.enabled, true);
  assert.equal(config.issuer, "https://accounts.google.com");
  assert.equal(config.redirectUri, "https://portal.qts.com.vn/api/v1/auth/callback/google");
  assert.equal(config.cookieSecure, true);
  assert.equal(config.hostedDomain, "qts.com.vn");
  assert.deepEqual(config.memberships, [
    {
      issuer: "https://accounts.google.com",
      subject: "google-subject-001",
      tenantId: "qts-vietnam",
      role: "qts_admin",
      workspace: "internal",
    },
  ]);
});

test("cho phép allowlist rỗng để thu thập iss + sub mà không cấp session", () => {
  const config = readAuthConfig({
    ...VALID_ENVIRONMENT,
    QTS_AUTH_MEMBERSHIPS_JSON: "[]",
  });

  assert.equal(config.enabled, true);
  assert.deepEqual(config.memberships, []);
});

test("từ chối cấu hình Google bị thiếu secret thay vì khởi động nửa vời", () => {
  assert.throws(
    () =>
      readAuthConfig({
        GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
      }),
    /GOOGLE_CLIENT_SECRET/,
  );
});

test("từ chối production origin không dùng HTTPS", () => {
  assert.throws(
    () =>
      readAuthConfig({
        ...VALID_ENVIRONMENT,
        QTS_PUBLIC_ORIGIN: "http://portal.qts.com.vn",
      }),
    /HTTPS/,
  );
});

test("từ chối ánh xạ dùng email thay cho subject ổn định", () => {
  assert.throws(
    () =>
      readAuthConfig({
        ...VALID_ENVIRONMENT,
        QTS_AUTH_MEMBERSHIPS_JSON: JSON.stringify([
          {
            issuer: "https://accounts.google.com",
            email: "admin@qts.com.vn",
            tenantId: "qts-vietnam",
            role: "qts_admin",
          },
        ]),
      }),
    /subject/,
  );
});

test("từ chối role không thuộc RBAC chính thức", () => {
  assert.throws(
    () =>
      readAuthConfig({
        ...VALID_ENVIRONMENT,
        QTS_AUTH_MEMBERSHIPS_JSON: JSON.stringify([
          {
            issuer: "https://accounts.google.com",
            subject: "google-subject-001",
            tenantId: "qts-vietnam",
            role: "superuser",
          },
        ]),
      }),
    /role/,
  );
});
