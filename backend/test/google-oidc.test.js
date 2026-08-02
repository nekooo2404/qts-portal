import assert from "node:assert/strict";
import { test } from "node:test";

import { createGoogleOidcClient } from "../src/google-oidc.js";

test("adapter OIDC dùng discovery, Authorization Code Flow, state, nonce và PKCE S256", async () => {
  const calls = [];
  const configuration = {
    serverMetadata() {
      return { issuer: "https://accounts.google.com" };
    },
  };
  const library = {
    async discovery(...arguments_) {
      calls.push(["discovery", ...arguments_]);
      return configuration;
    },
    randomPKCECodeVerifier() {
      return "verifier-001";
    },
    async calculatePKCECodeChallenge(verifier) {
      assert.equal(verifier, "verifier-001");
      return "challenge-001";
    },
    randomState() {
      return "state-001";
    },
    randomNonce() {
      return "nonce-001";
    },
    buildAuthorizationUrl(receivedConfiguration, parameters) {
      calls.push(["buildAuthorizationUrl", receivedConfiguration, parameters]);
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams(parameters).toString();
      return url;
    },
    async authorizationCodeGrant(receivedConfiguration, callbackUrl, checks) {
      calls.push([
        "authorizationCodeGrant",
        receivedConfiguration,
        callbackUrl,
        checks,
      ]);
      return {
        claims() {
          return {
            iss: "https://accounts.google.com",
            sub: "google-subject-001",
            aud: "google-client-id.apps.googleusercontent.com",
            exp: 1_800_000_000,
            nonce: "nonce-001",
            email: "security@qts.com.vn",
            email_verified: true,
          };
        },
      };
    },
  };
  const oidc = createGoogleOidcClient(
    {
      issuer: "https://accounts.google.com",
      clientId: "google-client-id.apps.googleusercontent.com",
      clientSecret: "google-client-secret",
      hostedDomain: "qts.com.vn",
    },
    library,
  );

  const authorization = await oidc.createAuthorizationRequest({
    redirectUri: "https://portal.qts.com.vn/api/v1/auth/callback/google",
  });

  assert.equal(authorization.state, "state-001");
  assert.equal(authorization.nonce, "nonce-001");
  assert.equal(authorization.codeVerifier, "verifier-001");
  assert.equal(authorization.url.searchParams.get("response_type"), "code");
  assert.equal(authorization.url.searchParams.get("scope"), "openid email profile");
  assert.equal(authorization.url.searchParams.get("code_challenge"), "challenge-001");
  assert.equal(authorization.url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(authorization.url.searchParams.get("hd"), "qts.com.vn");

  const claims = await oidc.completeAuthorization({
    callbackUrl: new URL(
      "https://portal.qts.com.vn/api/v1/auth/callback/google?code=code-001&state=state-001",
    ),
    codeVerifier: "verifier-001",
    expectedState: "state-001",
    expectedNonce: "nonce-001",
  });

  const grantCall = calls.find((call) => call[0] === "authorizationCodeGrant");
  assert.ok(grantCall);
  assert.deepEqual(grantCall[3], {
    pkceCodeVerifier: "verifier-001",
    expectedState: "state-001",
    expectedNonce: "nonce-001",
    idTokenExpected: true,
  });
  assert.equal(claims.sub, "google-subject-001");
  assert.equal(calls[0][1].href, "https://accounts.google.com/");
  assert.equal(calls[0][2], "google-client-id.apps.googleusercontent.com");
  assert.equal(calls[0][3], "google-client-secret");
});

test("adapter từ chối token response không có ID token claims", async () => {
  const library = {
    async discovery() {
      return {};
    },
    async authorizationCodeGrant() {
      return { claims: () => undefined };
    },
  };
  const oidc = createGoogleOidcClient(
    {
      issuer: "https://accounts.google.com",
      clientId: "client-id",
      clientSecret: "client-secret",
    },
    library,
  );

  await assert.rejects(
    () =>
      oidc.completeAuthorization({
        callbackUrl: new URL("https://portal.qts.com.vn/callback?code=code"),
        codeVerifier: "verifier",
        expectedState: "state",
        expectedNonce: "nonce",
      }),
    /ID token/,
  );
});

test("adapter thử discovery lại sau lỗi mạng tạm thời", async () => {
  let discoveryAttempts = 0;
  const library = {
    async discovery() {
      discoveryAttempts += 1;
      if (discoveryAttempts === 1) throw new Error("temporary network failure");
      return {};
    },
    randomPKCECodeVerifier: () => "verifier",
    calculatePKCECodeChallenge: async () => "challenge",
    randomState: () => "state",
    randomNonce: () => "nonce",
    buildAuthorizationUrl: () => new URL("https://accounts.google.com/o/oauth2/v2/auth"),
  };
  const oidc = createGoogleOidcClient(
    {
      issuer: "https://accounts.google.com",
      clientId: "client-id",
      clientSecret: "client-secret",
    },
    library,
  );

  await assert.rejects(() =>
    oidc.createAuthorizationRequest({ redirectUri: "https://portal.qts.com.vn/callback" }),
  );
  await oidc.createAuthorizationRequest({
    redirectUri: "https://portal.qts.com.vn/callback",
  });

  assert.equal(discoveryAttempts, 2);
});
