// ecobee_auth_finish.js  —  HomeyScript
//
// One-time setup, step 2 of 2. After you've entered the PIN from
// ecobee_auth_start.js in the ecobee portal, this swaps the approval for an
// access/refresh token pair and saves it for the aux heat scripts.
//
// Run       : open it in the HomeyScript editor and click Test (no argument).
// Returns   : 'authorized' (text)
// Docs      : https://github.com/grantlutz/Homey_Pro_Scripts/tree/main/climate/ecobee-auth-finish
// Version   : 1.0.0

// ── Storage keys (shared with the auth-start and aux heat scripts) ──────────

const KEY_API_KEY = 'ecobee_api_key';        // string — ecobee developer app key
const KEY_PENDING = 'ecobee_auth_pending';   // { code, expiresAt } written by ecobee_auth_start
const KEY_TOKENS  = 'ecobee_tokens';         // { access_token, refresh_token, expires_at }

const BASE = 'https://api.ecobee.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

const store = {
  async get(k)    { return (typeof global !== 'undefined' && global.get) ? await global.get(k)    : await get(k); },
  async set(k, v) { return (typeof global !== 'undefined' && global.set) ? await global.set(k, v) : await set(k, v); },
};

// ── Main ─────────────────────────────────────────────────────────────────────

const apiKey  = await store.get(KEY_API_KEY);
const pending = await store.get(KEY_PENDING);
if (!apiKey || !pending || !pending.code) {
  throw new Error('Nothing to finish — run ecobee_auth_start first.');
}
if (pending.expiresAt && Date.now() > pending.expiresAt) {
  await store.set(KEY_PENDING, null);
  throw new Error('The PIN has expired — run ecobee_auth_start again.');
}

const url = `${BASE}/token?grant_type=ecobeePin`
          + `&code=${encodeURIComponent(pending.code)}`
          + `&client_id=${encodeURIComponent(apiKey)}`;
const res  = await fetch(url, { method: 'POST' });
const json = await res.json().catch(() => ({}));

if (!res.ok || !json.access_token) {
  if (json.error === 'authorization_pending') {
    throw new Error('Not approved yet — enter the PIN under My Apps in the ecobee portal, then run this again.');
  }
  throw new Error(`ecobee token request failed: ${res.status} ${JSON.stringify(json)}`);
}

await store.set(KEY_TOKENS, {
  access_token:  json.access_token,
  refresh_token: json.refresh_token,
  expires_at:    Date.now() + (Number(json.expires_in) || 3600) * 1000,
});
await store.set(KEY_PENDING, null);

log('ecobee authorized. The aux heat scripts can now control the thermostat.');
return 'authorized';
