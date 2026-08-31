/**
 * VOS OIDC Fastpath（VOS 1.1+）— 静默认证。
 *
 * VOS 平台向同域 iframe 注入 `window.vos_platform.api.v1000.oauth2`，
 * 前端通过标准 PKCE（authorization_code + S256）换取应用级 access token，
 * 全程在页面内完成，不做任何 OAuth 跳转（manifest.yml 的 oauth2.client
 * 声明注册该 public client）。令牌缓存在内存中，过期时用 refresh_token
 * 静默续期；平台未注入（独立部署）时所有接口返回 null，应用保持本地模式。
 *
 * 对齐 agent-room / WeKnora / agentic-search 的 `acquireVOSFastpathToken`。
 */

import { sha256 } from "js-sha256";

export interface VOSFastpathTokenSet {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

interface VOSPlatformOAuth2 {
  authorize(params: {
    client_id: string;
    response_type: "code";
    scope: string;
    state: string;
    code_challenge: string;
    code_challenge_method: "S256";
    nonce?: string;
  }): Promise<{ code: string; state: string; redirect_uri?: string }>;
  token(params: {
    grant_type: "authorization_code" | "refresh_token";
    code?: string;
    code_verifier?: string;
    refresh_token?: string;
    client_id: string;
    client_secret?: string;
  }): Promise<VOSFastpathTokenSet>;
}

interface VOSPlatform {
  version?: string;
  mode?: string;
  api?: {
    v1000?: {
      oauth2?: VOSPlatformOAuth2;
    };
  };
}

declare global {
  interface Window {
    vos_platform?: VOSPlatform;
    // Legacy VOS builds expose the session token without OIDC injection.
    __VOS_APP_CONTEXT__?: { accessToken?: string; token?: string };
    __VOS_ACCESS_TOKEN__?: string;
  }
}

const CLIENT_ID = "com.ictrek.v-office";
const SCOPE = "openid profile email";
const DETECT_TIMEOUT_MS = 3000;
// Refresh slightly before the real expiry to avoid in-flight 401s.
const EXPIRY_MARGIN_MS = 60_000;

function base64urlEncode(bytes: Uint8Array): string {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

function computeCodeChallenge(verifier: string): string {
  // sha256.array returns number[]; copy byte-wise to satisfy strict TS.
  const hash = sha256.array(verifier);
  const bytes = new Uint8Array(hash.length);
  for (let i = 0; i < hash.length; i++) {
    bytes[i] = hash[i] ?? 0;
  }
  return base64urlEncode(bytes);
}

export function getVOSFastpathPlatform(): VOSPlatform | null {
  if (typeof window === "undefined") return null;
  const platform = window.vos_platform;
  if (!platform?.api?.v1000?.oauth2?.authorize || !platform.api.v1000.oauth2.token) {
    return null;
  }
  return platform;
}

let platformPromise: Promise<VOSPlatform | null> | null = null;
// A failed probe is cached only briefly: OnlyOffice initialization blocks
// the main thread for long stretches on the editor page, so a wall-clock
// probe can expire while the injection callback is still queued.
const NEGATIVE_PROBE_TTL_MS = 30_000;
let negativeProbedAt = 0;

export async function waitForVOSFastpathPlatform(
  timeoutMs = DETECT_TIMEOUT_MS,
): Promise<VOSPlatform | null> {
  const existing = getVOSFastpathPlatform();
  if (existing) return existing;
  if (typeof window === "undefined" || window.parent === window) return null;
  if (Date.now() - negativeProbedAt < NEGATIVE_PROBE_TTL_MS) return null;
  // Probe with a fresh interval each time; a positive result is cached for
  // the session, a negative one only for NEGATIVE_PROBE_TTL_MS.
  const probe = new Promise<VOSPlatform | null>((resolve) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const platform = getVOSFastpathPlatform();
      if (platform) {
        window.clearInterval(timer);
        resolve(platform);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 50);
  });
  platformPromise = probe;
  const result = await probe;
  if (!result) {
    negativeProbedAt = Date.now();
    platformPromise = null;
  }
  return result;
}

/**
 * True when running as a VOS deployment. A VOS image is built with
 * NEXT_PUBLIC_BASE_PATH baked in, so the build flag alone is a reliable
 * signal even if the portal does not inject window.vos_platform (pre-1.1);
 * root-path standalone builds keep the injection probe.
 */
export async function isVOSMode(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_BASE_PATH) return true;
  return (await waitForVOSFastpathPlatform()) !== null;
}

function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`VOS auth timeout (${ms}ms)`)), ms),
    ),
  ]);
}

async function authorizeAndExchange(
  oauth2: VOSPlatformOAuth2,
): Promise<VOSFastpathTokenSet | null> {
  const verifier = randomBase64url();
  const state = randomBase64url();
  const nonce = randomBase64url();
  const challenge = computeCodeChallenge(verifier);

  const authResp = await withTimeout(oauth2.authorize({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    nonce,
  }), 30_000);

  if (authResp.state !== state) {
    throw new Error("VOS OIDC state mismatch");
  }

  const tokenResp = await withTimeout(oauth2.token({
    grant_type: "authorization_code",
    code: authResp.code,
    code_verifier: verifier,
    client_id: CLIENT_ID,
  }), 30_000);

  return tokenResp?.access_token ? tokenResp : null;
}

let cachedToken: VOSFastpathTokenSet | null = null;
let cachedExpiresAt = 0;

function tokenUsable(set: VOSFastpathTokenSet): boolean {
  return Boolean(set.access_token) && Date.now() < cachedExpiresAt - EXPIRY_MARGIN_MS;
}

/**
 * Legacy VOS builds expose the current session token without OIDC:
 * window.__VOS_APP_CONTEXT__.accessToken/.token, window.__VOS_ACCESS_TOKEN__,
 * or a same-origin localStorage store whose key ends with "-core-access".
 */
export function legacyVOSAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const ctx = window.__VOS_APP_CONTEXT__;
  const injected = [ctx?.accessToken, ctx?.token, window.__VOS_ACCESS_TOKEN__];
  for (const candidate of injected) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.endsWith("-core-access")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const trimmed = raw.trim();
      if (trimmed.startsWith("ey")) return trimmed;
      const parsed = JSON.parse(trimmed);
      const payload =
        typeof parsed === "string"
          ? parsed
          : (parsed?.value ?? parsed?.data ?? parsed);
      if (typeof payload === "string" && payload.startsWith("ey")) {
        return payload;
      }
      const token = payload?.access_token ?? payload?.accessToken;
      if (typeof token === "string" && token.trim()) return token.trim();
    }
  } catch {
    // Tolerate unreadable/encrypted stores; fastpath remains the primary path.
  }
  return null;
}

/**
 * Returns a valid VOS access token, or null when not running under VOS (or
 * when the silent flow fails). Never navigates: the only flows are the
 * injected authorize()/token() calls plus refresh_token renewal, with the
 * legacy injected-token sources as fallback for older portals.
 */
export async function getVOSAccessToken(): Promise<string | null> {
  const platform = await waitForVOSFastpathPlatform();
  const oauth2 = platform?.api?.v1000?.oauth2;

  if (cachedToken && tokenUsable(cachedToken)) {
    return cachedToken.access_token;
  }

  if (oauth2 && cachedToken?.refresh_token) {
    try {
      const refreshed = await withTimeout(oauth2.token({
        grant_type: "refresh_token",
        refresh_token: cachedToken.refresh_token,
        client_id: CLIENT_ID,
      }));
      if (refreshed?.access_token) {
        cachedToken = refreshed;
        cachedExpiresAt = Date.now() + (refreshed.expires_in ?? 3600) * 1000;
        return refreshed.access_token;
      }
    } catch (error) {
      console.error("VOS token refresh failed; re-authorizing silently", error);
    }
  }

  if (oauth2) {
    try {
      const tokenSet = await authorizeAndExchange(oauth2);
      if (tokenSet) {
        cachedToken = tokenSet;
        cachedExpiresAt = Date.now() + (tokenSet.expires_in ?? 3600) * 1000;
        return tokenSet.access_token;
      }
    } catch (error) {
      console.error("VOS fastpath auth failed", error);
    }
  }

  return legacyVOSAccessToken();
}

export function clearVOSAuthCache(): void {
  cachedToken = null;
  cachedExpiresAt = 0;
}
