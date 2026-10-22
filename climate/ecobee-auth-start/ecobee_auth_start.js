// ecobee_auth_start.js  —  HomeyScript
//
// One-time setup, step 1 of 2. Saves your ecobee developer API key and asks
// ecobee for an authorization PIN. Enter the PIN at ecobee.com › My Apps ›
// Add Application, then run ecobee_auth_finish.js within the time shown.
//
// Run       : open it in the HomeyScript editor and click Test, with the API key
//             as the argument, or paste the key into API_KEY below for one run
//             and then put the placeholder back. If the key is already saved,
//             no argument is needed.
// Returns   : the PIN to enter in the ecobee portal (text)
// Docs      : https://github.com/grantlutz/Homey_Pro_Scripts/tree/main/climate/ecobee-auth-start
// Version   : 1.0.0

// ── Settings ─────────────────────────────────────────────────────────────────

// Optional: paste your ecobee API key here for a one-off run. Never commit a real key.
const API_KEY = 'YOUR_API_KEY_HERE';

// ── Storage keys (shared with the auth-finish and aux heat scripts) ─────────

const KEY_API_KEY  = 'ecobee_api_key';        // string — ecobee developer app key
const KEY_PENDING  = 'ecobee_auth_pending';   // { code, expiresAt } while waiting for approval

const BASE = 'https://api.ecobee.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

const store = {
  async get(k)    { return (typeof global !== 'undefined' && global.get) ? await global.get(k)    : await get(k); },
  async set(k, v) { return (typeof global !== 'undefined' && global.set) ? await global.set(k, v) : await set(k, v); },
};

// ── Main ─────────────────────────────────────────────────────────────────────

const argKey   = (typeof args !== 'undefined' && args && args[0]) ? String(args[0]).trim() : '';
const constKey = (API_KEY && API_KEY !== 'YOUR_API_KEY_HERE') ? API_KEY.trim() : '';
const apiKey   = argKey || constKey || await store.get(KEY_API_KEY);
if (!apiKey) {
  throw new Error('No ecobee API key. Pass it as the argument or set API_KEY at the top of this script.');
}
await store.set(KEY_API_KEY, apiKey);

const url = `${BASE}/authorize?response_type=ecobeePin`
          + `&client_id=${encodeURIComponent(apiKey)}&scope=smartWrite`;
const res = await fetch(url);
if (!res.ok) throw new Error(`ecobee PIN request failed: ${res.status} ${await res.text()}`);

const json = await res.json();
if (!json.ecobeePin || !json.code) throw new Error(`Unexpected ecobee reply: ${JSON.stringify(json)}`);

const minutes = Number(json.expires_in) || 10;   // ecobee gives this in minutes
await store.set(KEY_PENDING, { code: json.code, expiresAt: Date.now() + minutes * 60 * 1000 });

log(`ecobee PIN: ${json.ecobeePin}`);
log(`Enter it at https://www.ecobee.com › My Apps › Add Application within ${minutes} minutes,`);
log('then run ecobee_auth_finish.');
return json.ecobeePin;
