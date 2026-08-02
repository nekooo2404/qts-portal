import * as openidClient from "openid-client";

export function createGoogleOidcClient(config, library = openidClient) {
  let configurationPromise;

  function getConfiguration() {
    configurationPromise ??= library
      .discovery(
        new URL(config.issuer),
        config.clientId,
        config.clientSecret,
        undefined,
        { timeout: 10 },
      )
      .catch((error) => {
        configurationPromise = undefined;
        throw error;
      });
    return configurationPromise;
  }

  return Object.freeze({
    async createAuthorizationRequest({ redirectUri }) {
      const configuration = await getConfiguration();
      const codeVerifier = library.randomPKCECodeVerifier();
      const codeChallenge = await library.calculatePKCECodeChallenge(codeVerifier);
      const state = library.randomState();
      const nonce = library.randomNonce();
      const parameters = {
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      };
      if (config.hostedDomain) parameters.hd = config.hostedDomain;

      return {
        url: library.buildAuthorizationUrl(configuration, parameters),
        state,
        nonce,
        codeVerifier,
      };
    },

    async completeAuthorization({
      callbackUrl,
      codeVerifier,
      expectedState,
      expectedNonce,
    }) {
      const configuration = await getConfiguration();
      const tokens = await library.authorizationCodeGrant(
        configuration,
        callbackUrl,
        {
          pkceCodeVerifier: codeVerifier,
          expectedState,
          expectedNonce,
          idTokenExpected: true,
        },
      );
      const claims = tokens.claims();
      if (!claims) throw new Error("Google did not return a valid ID token.");
      return claims;
    },
  });
}
