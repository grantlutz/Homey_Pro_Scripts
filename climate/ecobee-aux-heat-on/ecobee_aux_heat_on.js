// ecobee_aux_heat_on.js  —  HomeyScript
//
// Peak START: remember the ecobee's current HVAC mode, then switch it to
// auxHeatOnly ("Emergency Heat" in the ecobee app). On a dual-fuel system this
// locks out the heat pump and runs only the aux stage (the propane furnace).
// Its partner, ecobee_aux_heat_off.js, puts the saved mode back at peak end.
//
// Flow card : HomeyScript › "Run a script"  (no argument needed)
//             or "Run a script and return text" to use the result in the Flow.
// Returns   : 'switched'    – mode was heat/auto; saved it and switched to auxHeatOnly
//             'already-aux' – ecobee was already in auxHeatOnly; nothing changed
//             'skipped'     – ecobee was in cool/off, or in auto on a warm day
//                             (cooling now, or outdoor temp at/above
//                             AUTO_SKIP_OUTDOOR_F); left alone on purpose
// Setup     : run ecobee_auth_start.js, then ecobee_auth_finish.js, once.
// Docs      : https://github.com/grantlutz/Homey_Pro_Scripts/tree/main/climate/ecobee-aux-heat-on
// Version   : 1.1.0

// ── Settings ─────────────────────────────────────────────────────────────────

// Only switch to aux heat when the ecobee is currently in one of these modes.
// 'cool' and 'off' are deliberately left out so the furnace never starts in
// summer or when heating has been turned off.
const SWITCH_FROM_MODES = ['heat', 'auto'];

// Extra check for 'auto' only. If 'cool' means "it's warm, don't heat", the same
// is true when auto is cooling or it's warm outside. In auto the script skips
// when the ecobee is cooling right now, or when the outdoor temperature from
// ecobee's weather is at or above this many °F. null = only the cooling check.
// 'heat' is never affected by this setting.
const AUTO_SKIP_OUTDOOR_F = 65;

// Which thermostat to control.
// ''  = the first thermostat on the ecobee account (fine if you only have one).
// Otherwise the thermostat's name exactly as it appears in the ecobee app.
const THERMOSTAT_NAME = '';

// ── Storage keys (shared with ecobee_aux_heat_off.js and the auth scripts) ──

const KEY_API_KEY    = 'ecobee_api_key';          // string — ecobee developer app key
const KEY_TOKENS     = 'ecobee_tokens';           // { access_token, refresh_token, expires_at }
const KEY_SAVED_MODE = 'ecobee_mode_before_aux';  // { mode, savedAt, thermostat } or null

// ── Constants ────────────────────────────────────────────────────────────────

const BASE = 'https://api.ecobee.com';
const AUX  = 'auxHeatOnly';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Persistent storage — works whether HomeyScript exposes global.get/set or bare get/set.
const store = {
  async get(k)    { return (typeof global !== 'undefined' && global.get) ? await global.get(k)    : await get(k); },
  async set(k, v) { return (typeof global !== 'undefined' && global.set) ? await global.set(k, v) : await set(k, v); },
};

// Get a usable access token. ecobee access tokens last about an hour. A token
// that is still good for at least 5 more minutes is reused, which avoids
// rotating the refresh token on every run (and the on/off scripts racing each
// other). Otherwise it refreshes and saves the new pair at once, because the
// refresh token can change on every refresh.
async function getAccessToken() {
  const apiKey = await store.get(KEY_API_KEY);
  const tokens = await store.get(KEY_TOKENS);
  if (!apiKey || !tokens || !tokens.refresh_token) {
    throw new Error('Not authorized — run ecobee_auth_start then ecobee_auth_finish first.');
  }
  if (tokens.access_token && tokens.expires_at && tokens.expires_at - Date.now() > 5 * 60 * 1000) {
    return tokens.access_token;
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
    expires_at:    Date.now() + (Number(json.expires_in) || 3600) * 1000,
  });
  return json.access_token;
}

// Return the thermostat to control (including its settings.hvacMode).
async function getThermostat(access) {
  const sel = { selection: {
    selectionType: 'registered', selectionMatch: '',
    includeSettings: true, includeEquipmentStatus: true, includeWeather: true,
  } };
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

const access  = await getAccessToken();
const tstat   = await getThermostat(access);
const current = tstat.settings.hvacMode;

// Already on aux: do nothing, and do NOT overwrite the saved mode — otherwise
// the off script would "restore" auxHeatOnly. Covers the Flow firing twice.
if (current === AUX) {
  log(`ecobee '${tstat.name}': already ${AUX}; nothing to do (saved mode left as is).`);
  return 'already-aux';
}

// Cool/off (or anything not in SWITCH_FROM_MODES): leave it alone.
if (!SWITCH_FROM_MODES.includes(current)) {
  log(`ecobee '${tstat.name}': skipped — mode is '${current}', only switches from ${SWITCH_FROM_MODES.join('/')}.`);
  return 'skipped';
}

// Auto on a warm day: treat it like cool and leave it alone.
if (current === 'auto') {
  const equip    = String(tstat.equipmentStatus || '');
  const cooling  = /cool/i.test(equip);
  const fc       = tstat.weather && tstat.weather.forecasts && tstat.weather.forecasts[0];
  const outdoorF = (fc && typeof fc.temperature === 'number' && fc.temperature > -5000)
                   ? fc.temperature / 10 : null;   // ecobee reports tenths of °F
  if (cooling) {
    log(`ecobee '${tstat.name}': skipped — mode is auto and it is cooling right now (${equip}).`);
    return 'skipped';
  }
  if (AUTO_SKIP_OUTDOOR_F !== null && outdoorF !== null && outdoorF >= AUTO_SKIP_OUTDOOR_F) {
    log(`ecobee '${tstat.name}': skipped — mode is auto and it is ${outdoorF}°F outside (limit ${AUTO_SKIP_OUTDOOR_F}°F).`);
    return 'skipped';
  }
}

// Save first, then switch. If the switch fails, the off script sees the ecobee
// is not on aux and simply clears the saved value.
await store.set(KEY_SAVED_MODE, {
  mode:       current,
  savedAt:    new Date().toISOString(),
  thermostat: tstat.identifier,
});
await setMode(access, tstat.identifier, AUX);

log(`ecobee '${tstat.name}': ${current} -> ${AUX} (saved '${current}' for restore).`);
return 'switched';
