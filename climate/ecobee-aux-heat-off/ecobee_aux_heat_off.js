// ecobee_aux_heat_off.js  —  HomeyScript
//
// Peak END: put the ecobee back to the HVAC mode it was in before
// ecobee_aux_heat_on.js switched it to auxHeatOnly (emergency heat / propane).
// Only acts if the ecobee is still in auxHeatOnly, so a mode you changed by hand
// during the peak is never overridden.
//
// Flow card : HomeyScript › "Run a script"  (no argument needed)
//             or "Run a script and return text" to use the result in the Flow.
// Returns   : 'restored'          – put back the saved mode (heat or auto)
//             'restored-fallback' – nothing was saved; used FALLBACK_MODE
//             'left-on-aux'       – nothing was saved and FALLBACK_MODE is null
//             'skipped'           – ecobee wasn't in auxHeatOnly; left alone
// Setup     : run ecobee_auth_start.js, then ecobee_auth_finish.js, once.
// Docs      : https://github.com/grantlutz/Homey_Pro_Scripts/tree/main/climate/ecobee-aux-heat-off
// Version   : 1.0.0

// ── Settings ─────────────────────────────────────────────────────────────────

// Mode to use if the ecobee is in auxHeatOnly but no mode was saved
// (e.g. HomeyScript storage was cleared, or aux heat was turned on by hand).
// 'heat' or 'auto' — or null to leave the ecobee in auxHeatOnly in that case.
const FALLBACK_MODE = 'heat';

// Which thermostat to control. Must match the setting in ecobee_aux_heat_on.js.
// ''  = the first thermostat on the ecobee account (fine if you only have one).
// Otherwise the thermostat's name exactly as it appears in the ecobee app.
const THERMOSTAT_NAME = '';

// ── Storage keys (shared with ecobee_aux_heat_on.js and the auth scripts) ───

const KEY_API_KEY    = 'ecobee_api_key';          // string — ecobee developer app key
const KEY_TOKENS     = 'ecobee_tokens';           // { access_token, refresh_token }
const KEY_SAVED_MODE = 'ecobee_mode_before_aux';  // { mode, savedAt, thermostat } or null

// ── Constants ────────────────────────────────────────────────────────────────

const BASE = 'https://api.ecobee.com';
const AUX  = 'auxHeatOnly';
const RESTORABLE_MODES = ['auto', 'cool', 'heat', 'off'];  // anything except auxHeatOnly

// ── Helpers ──────────────────────────────────────────────────────────────────

// Persistent storage — works whether HomeyScript exposes global.get/set or bare get/set.
const store = {
  async get(k)    { return (typeof global !== 'undefined' && global.get) ? await global.get(k)    : await get(k); },
  async set(k, v) { return (typeof global !== 'undefined' && global.set) ? await global.set(k, v) : await set(k, v); },
};

// Get a fresh access token. ecobee access tokens expire after about an hour and
// the refresh token can change on every refresh, so the new pair is saved at once.
async function getAccessToken() {
  const apiKey = await store.get(KEY_API_KEY);
  const tokens = await store.get(KEY_TOKENS);
  if (!apiKey || !tokens || !tokens.refresh_token) {
    throw new Error('Not authorized — run ecobee_auth_start then ecobee_auth_finish first.');
  }

  const url = `${BASE}/token?grant_type=refresh_token`
            + `&refresh_token=${encodeURIComponent(tokens.refresh_token)}`
            + `&client_id=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`ecobee token refresh failed: ${res.status} ${await res.text()}`);

  const json = await res.json();
  await store.set(KEY_TOKENS, {
    access_token:  json.access_token,
    refresh_token: json.refresh_token || tokens.refresh_token,
  });
  return json.access_token;
}

// Return the thermostat to control (including its settings.hvacMode).
async function getThermostat(access) {
  const sel = { selection: { selectionType: 'registered', selectionMatch: '', includeSettings: true } };
  const res = await fetch(`${BASE}/1/thermostat?json=${encodeURIComponent(JSON.stringify(sel))}`,
    { headers: { Authorization: `Bearer ${access}` } });
  if (!res.ok) throw new Error(`ecobee get thermostat failed: ${res.status} ${await res.text()}`);

  const list = (await res.json()).thermostatList || [];
  if (!list.length) throw new Error('No thermostats found on this ecobee account.');
  if (!THERMOSTAT_NAME) return list[0];

  const match = list.find(t => t.name === THERMOSTAT_NAME);
  if (!match) {
    throw new Error(`No thermostat named '${THERMOSTAT_NAME}'. Found: ${list.map(t => t.name).join(', ')}`);
  }
  return match;
}

// Set the HVAC mode on one thermostat.
async function setMode(access, identifier, mode) {
  const body = {
    selection:  { selectionType: 'thermostats', selectionMatch: identifier },
    thermostat: { settings: { hvacMode: mode } },
  };
  const res = await fetch(`${BASE}/1/thermostat?format=json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8', Authorization: `Bearer ${access}` },
    body:    JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.status && json.status.code !== 0)) {
    throw new Error(`ecobee set mode failed: ${res.status} ${JSON.stringify(json)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (FALLBACK_MODE !== null && !RESTORABLE_MODES.includes(FALLBACK_MODE)) {
  throw new Error(`FALLBACK_MODE '${FALLBACK_MODE}' is not valid. Use ${RESTORABLE_MODES.join(' / ')} or null.`);
}

const access  = await getAccessToken();
const tstat   = await getThermostat(access);
const current = tstat.settings.hvacMode;
const saved   = await store.get(KEY_SAVED_MODE);

// Not on aux: someone changed the mode during the peak (or aux was never set).
// Respect that choice and clear the saved value so it can't be used later.
if (current !== AUX) {
  await store.set(KEY_SAVED_MODE, null);
  log(`ecobee '${tstat.name}': skipped — mode is '${current}', not ${AUX}. Saved mode cleared.`);
  return 'skipped';
}

// Use the saved mode only if it's valid and belongs to this thermostat.
const savedMode = (saved && RESTORABLE_MODES.includes(saved.mode)
                   && (!saved.thermostat || saved.thermostat === tstat.identifier))
                  ? saved.mode : null;

if (savedMode) {
  await setMode(access, tstat.identifier, savedMode);
  await store.set(KEY_SAVED_MODE, null);
  log(`ecobee '${tstat.name}': ${AUX} -> ${savedMode} (restored mode saved at ${saved.savedAt}).`);
  return 'restored';
}

if (FALLBACK_MODE === null) {
  log(`ecobee '${tstat.name}': no saved mode and FALLBACK_MODE is null; leaving it on ${AUX}.`);
  return 'left-on-aux';
}

await setMode(access, tstat.identifier, FALLBACK_MODE);
await store.set(KEY_SAVED_MODE, null);
log(`ecobee '${tstat.name}': ${AUX} -> ${FALLBACK_MODE} (no saved mode; used FALLBACK_MODE).`);
return 'restored-fallback';
