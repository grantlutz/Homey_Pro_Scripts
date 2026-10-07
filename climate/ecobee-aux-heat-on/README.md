# ecobee Aux Heat — On

> Saves the ecobee's current HVAC mode, then switches the thermostat to **`auxHeatOnly`** (emergency heat) so only the propane furnace runs. Use at the start of a utility peak period.

| | |
|---|---|
| **Topic** | Climate |
| **Script file** | [`ecobee_aux_heat_on.js`](ecobee_aux_heat_on.js) |
| **Name on Homey** | `ecobee_aux_heat_on` |
| **Flow card** | HomeyScript › **Run a script** (or **Run a script and return text**) |
| **Arguments** | None |
| **Returns** | `switched` · `already-aux` · `skipped` |
| **Partner script** | [`ecobee_aux_heat_off`](../ecobee-aux-heat-off/) |
| **Version** | 1.0.0 |
| **Last updated** | 2026-10-05 |

---

## What it does

On a dual-fuel system (heat pump + propane furnace) the ecobee normally decides for itself which equipment to run. During a utility peak period you may want to keep the heat pump off and heat with propane instead. This script:

1. Checks what mode the ecobee is in right now.
2. If it's `heat` or `auto`, **saves that mode** in HomeyScript storage and switches the ecobee to `auxHeatOnly`.
3. If it's already `auxHeatOnly`, or it's in `cool` or `off`, it **changes nothing**.

[`ecobee_aux_heat_off`](../ecobee-aux-heat-off/) later reads the saved mode and puts it back, so the ecobee returns to whichever mode you had chosen — `heat` or `auto` — rather than a hard-coded default.

## How it works

### ecobee HVAC modes

The ecobee has one **HVAC mode** setting. It is a persistent setting, not a temporary hold — it stays until something changes it. Your schedule and comfort settings (setpoints) keep working in every heating mode; only the equipment used changes.

| Mode | ecobee app label | Equipment on a dual-fuel system |
|---|---|---|
| `heat` | Heat | Heating only. The ecobee picks heat pump or furnace using its outdoor-temperature and staging settings. |
| `auto` | Auto | Heats or cools as needed. Same heat-pump/furnace choice as `heat`. |
| `auxHeatOnly` | Emergency Heat | Heat pump compressor locked out. **Only the aux stage runs** — the propane furnace, if the ecobee is configured with the furnace as aux heat. |
| `cool` | Cool | Cooling only. |
| `off` | Off | No heating or cooling. |

### Decision table

| Mode when the script runs | Action | Saved mode | Returns |
|---|---|---|---|
| `heat` | Switch to `auxHeatOnly` | `heat` | `switched` |
| `auto` | Switch to `auxHeatOnly` | `auto` | `switched` |
| `auxHeatOnly` | Nothing. The saved mode is **not** overwritten, so a second run can't make the off script "restore" aux. | unchanged | `already-aux` |
| `cool` or `off` | Nothing. The furnace should never start in summer or when heating is off. | unchanged | `skipped` |

### Step by step

1. **Get an access token.** Reads the API key and tokens from HomeyScript storage, asks ecobee for a fresh access token (they last about an hour), and immediately saves the new token pair because the refresh token can change on every refresh.
2. **Find the thermostat.** Lists the thermostats on the ecobee account and picks the first one, or the one named in `THERMOSTAT_NAME`.
3. **Decide.** Applies the decision table above.
4. **Save, then switch.** Writes the current mode to `ecobee_mode_before_aux`, then sends `hvacMode: auxHeatOnly` to ecobee. Saving first is deliberate: if the switch fails, the off script sees the ecobee isn't on aux and simply clears the saved value.
5. **Log and return** a short result for the Flow.

## Requirements

- Homey Pro with the **HomeyScript** app installed.
- An ecobee thermostat on a **dual-fuel** system with the propane furnace configured as **aux heat** in the ecobee's equipment settings. Without that, `auxHeatOnly` won't run the furnace.
- An **ecobee developer API key**, with this Homey authorized to the ecobee account (see One-time setup).
- Internet access from the Homey (the script calls `api.ecobee.com`).

## One-time setup

The ecobee API needs an API key and an authorized token pair, stored on the Homey before this script can run.

1. Run **`ecobee_auth_start`** — requests an authorization PIN from ecobee using your API key.
2. Enter the PIN in the ecobee web portal under **My Apps** to approve access.
3. Run **`ecobee_auth_finish`** — exchanges the approval for tokens and saves them.

> **Note:** the two auth scripts are not in this repository yet. Whatever performs the setup must leave these values in HomeyScript storage:
>
> | Key | Value |
> |---|---|
> | `ecobee_api_key` | Your ecobee API key, as a string |
> | `ecobee_tokens` | An object: `{ access_token: '…', refresh_token: '…' }` |

This only has to be redone if the tokens become invalid (for example, the app is removed in the ecobee portal or the Homey goes a long time without running either script).

## Settings

Edit these constants at the top of the script.

| Constant | Type | Default | Description |
|---|---|---|---|
| `SWITCH_FROM_MODES` | array of strings | `['heat', 'auto']` | The script only switches to aux heat when the ecobee is in one of these modes. `cool` and `off` are left out on purpose. |
| `THERMOSTAT_NAME` | string | `''` | Which thermostat to control. Empty means the first thermostat on the account. Otherwise use the name exactly as shown in the ecobee app. **Must match the off script.** |

Internal constants (normally left alone):

| Constant | Value | Description |
|---|---|---|
| `KEY_API_KEY` | `'ecobee_api_key'` | Storage key for the ecobee API key. |
| `KEY_TOKENS` | `'ecobee_tokens'` | Storage key for the access/refresh token pair. |
| `KEY_SAVED_MODE` | `'ecobee_mode_before_aux'` | Storage key for the saved mode. Must match the off script. |
| `BASE` | `'https://api.ecobee.com'` | ecobee API base URL. |
| `AUX` | `'auxHeatOnly'` | ecobee's name for emergency/aux-only mode. |

## Flow arguments

None. Any argument passed is ignored.

## Return value

| Value | Meaning |
|---|---|
| `switched` | The ecobee was in `heat` or `auto`; that mode was saved and the ecobee is now in `auxHeatOnly`. |
| `already-aux` | The ecobee was already in `auxHeatOnly`. Nothing changed. |
| `skipped` | The ecobee was in `cool` or `off` (or another mode not in `SWITCH_FROM_MODES`). Nothing changed. |

If something goes wrong (not authorized, ecobee unreachable, API error) the script **throws an error** instead of returning; the Flow card shows the message.

## Stored values

All in HomeyScript persistent storage (`global.get` / `global.set`), shared with the partner and auth scripts.

| Key | Read / written | Contents |
|---|---|---|
| `ecobee_api_key` | Read | ecobee developer API key (string). |
| `ecobee_tokens` | Read and written | `{ access_token, refresh_token }`. Rewritten on every run with the refreshed pair. |
| `ecobee_mode_before_aux` | Written (only when switching) | `{ mode: 'heat' \| 'auto', savedAt: '<ISO timestamp>', thermostat: '<ecobee identifier>' }`. Cleared by the off script. |

## Flow tags created

None. Use **Run a script and return text** to get the return value as a tag.

## Installing on Homey

1. In <https://my.homey.app>, open **HomeyScript** and click **New script**.
2. Name it **`ecobee_aux_heat_on`**.
3. Paste in [`ecobee_aux_heat_on.js`](ecobee_aux_heat_on.js) and click **Save**.
4. Complete the [One-time setup](#one-time-setup) if you haven't already.
5. Click **Test** to try it. **This will really switch your ecobee** if it's in `heat` or `auto` — run [`ecobee_aux_heat_off`](../ecobee-aux-heat-off/) afterwards to put it back.

## Using it in Flows

**Peak start**

| WHEN | THEN |
|---|---|
| The peak period starts (e.g. a time-of-day trigger on peak weekdays, or a utility event trigger) | HomeyScript › **Run a script** › `ecobee_aux_heat_on` |

Pair it with a peak-end Flow that runs [`ecobee_aux_heat_off`](../ecobee-aux-heat-off/#using-it-in-flows).

**Optional: get notified**

| WHEN | THEN |
|---|---|
| The peak period starts | HomeyScript › **Run a script and return text** › `ecobee_aux_heat_on` |
| | Push notification: `ecobee aux heat: [Result]` |

## Example log output

```
ecobee 'Main Floor': heat -> auxHeatOnly (saved 'heat' for restore).
```
```
ecobee 'Main Floor': already auxHeatOnly; nothing to do (saved mode left as is).
```
```
ecobee 'Main Floor': skipped — mode is 'cool', only switches from heat/auto.
```

## Troubleshooting

| Message | Cause | Fix |
|---|---|---|
| `Not authorized — run ecobee_auth_start then ecobee_auth_finish first.` | API key or tokens missing from storage. | Complete the [One-time setup](#one-time-setup). |
| `ecobee token refresh failed: 400 …` / `401 …` | The refresh token is no longer valid. | Redo the One-time setup. |
| `ecobee get thermostat failed: …` | ecobee API unreachable or rejected the request. | Check the Homey's internet connection and the ecobee status; try again. |
| `No thermostats found on this ecobee account.` | The authorized account has no thermostats. | Authorize with the account that owns the thermostat. |
| `No thermostat named 'X'. Found: …` | `THERMOSTAT_NAME` doesn't match. | Copy a name from the "Found" list into `THERMOSTAT_NAME`. |
| `ecobee set mode failed: …` | ecobee refused the change. | Check the thermostat is online and that aux heat is configured on it. |
| Returns `switched` but the heat pump still runs | The furnace isn't configured as the ecobee's aux heat. | Check the ecobee's equipment/installation settings. |

## Limitations

- **One thermostat per run.** Controls the first thermostat, or the one named in `THERMOSTAT_NAME`.
- **The mode stays on aux until changed.** If the peak-end Flow doesn't run (Homey offline, Flow disabled), the ecobee stays in `auxHeatOnly`. Consider the safety-net Flow described in the [off script](../ecobee-aux-heat-off/#using-it-in-flows).
- **The token refresh rewrites storage on every run.** If the Homey loses power between ecobee issuing a new refresh token and the script saving it, the One-time setup has to be redone.
- **Shared code.** HomeyScript scripts can't import from each other, so the token and API helper functions are duplicated in the off script. Fix both if one changes.

## Related scripts

- [`ecobee_aux_heat_off`](../ecobee-aux-heat-off/) — restores the saved mode at peak end.
- [Climate README](../) — how the pair fits together.

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-10-05 | First version. Split from the single `ecobee_emergency_heat.js` script; adds save-and-restore of the previous mode and skips `cool`/`off`. |
