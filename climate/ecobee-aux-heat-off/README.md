# ecobee Aux Heat — Off

> Puts the ecobee back to the HVAC mode it was in before [`ecobee_aux_heat_on`](../ecobee-aux-heat-on/) switched it to **`auxHeatOnly`**. Use at the end of a utility peak period.

| | |
|---|---|
| **Topic** | Climate |
| **Script file** | [`ecobee_aux_heat_off.js`](ecobee_aux_heat_off.js) |
| **Name on Homey** | `ecobee_aux_heat_off` |
| **Flow card** | HomeyScript › **Run a script** (or **Run a script and return text**) |
| **Arguments** | None |
| **Returns** | `restored` · `restored-fallback` · `left-on-aux` · `skipped` |
| **Partner script** | [`ecobee_aux_heat_on`](../ecobee-aux-heat-on/) |
| **Version** | 1.0.0 |
| **Last updated** | 2026-10-05 |

---

## What it does

When the peak period ends, this script returns the ecobee to normal heating:

1. Checks what mode the ecobee is in right now.
2. If it's in `auxHeatOnly`, it switches back to the mode **saved by the on script** — `heat` or `auto`, whichever you had chosen.
3. If it's **not** in `auxHeatOnly`, someone changed the mode during the peak. The script **leaves it alone** and clears the saved value.

So you never end up in `auto` when you'd set `heat` (or the other way round), and a change you made by hand during the peak always wins.

## How it works

For what each ecobee mode means, see [ecobee HVAC modes](../ecobee-aux-heat-on/#ecobee-hvac-modes) in the on script's README.

### Decision table

| Mode when the script runs | Saved mode | Action | Saved value afterwards | Returns |
|---|---|---|---|---|
| `auxHeatOnly` | `heat` or `auto` | Switch back to the saved mode | Cleared | `restored` |
| `auxHeatOnly` | None (or for a different thermostat) | Switch to `FALLBACK_MODE` | Cleared | `restored-fallback` |
| `auxHeatOnly` | None, and `FALLBACK_MODE` is `null` | Nothing — stays on aux | Unchanged | `left-on-aux` |
| Anything else (`heat`, `auto`, `cool`, `off`) | Any | Nothing — your manual change wins | Cleared | `skipped` |

**When is nothing saved while the ecobee is on aux?** Usually because emergency heat was turned on by hand (in the ecobee app or at the thermostat), or because HomeyScript storage was cleared. `FALLBACK_MODE` decides what happens then. Set it to `null` if you want manually-set emergency heat left alone.

### Step by step

1. **Check settings.** Stops with an error if `FALLBACK_MODE` isn't a valid mode or `null`.
2. **Get an access token.** Same as the on script: refreshes the ecobee access token and saves the new pair.
3. **Find the thermostat.** The first thermostat on the account, or the one named in `THERMOSTAT_NAME`.
4. **Read the saved mode** from `ecobee_mode_before_aux`. It's only used if it's a valid mode and was saved for this same thermostat.
5. **Decide** using the decision table, switch the mode if needed, and clear the saved value.
6. **Log and return** a short result for the Flow.

## Requirements

- Homey Pro with the **HomeyScript** app installed.
- The [One-time setup](../ecobee-aux-heat-on/#one-time-setup) completed (ecobee API key and tokens in HomeyScript storage).
- [`ecobee_aux_heat_on`](../ecobee-aux-heat-on/) installed and run at peak start — that's what saves the mode to restore.
- Internet access from the Homey (the script calls `api.ecobee.com`).

## One-time setup

Same as the on script — see [One-time setup](../ecobee-aux-heat-on/#one-time-setup). Nothing extra is needed for this script.

## Settings

Edit these constants at the top of the script.

| Constant | Type | Default | Description |
|---|---|---|---|
| `FALLBACK_MODE` | string or `null` | `'heat'` | Mode to use if the ecobee is on `auxHeatOnly` but no mode was saved. `'heat'` or `'auto'` (also accepts `'cool'` / `'off'`). Use `null` to leave the ecobee on aux in that case. |
| `THERMOSTAT_NAME` | string | `''` | Which thermostat to control. Empty means the first thermostat on the account. Otherwise use the name exactly as shown in the ecobee app. **Must match the on script.** |

Internal constants (normally left alone):

| Constant | Value | Description |
|---|---|---|
| `KEY_API_KEY` | `'ecobee_api_key'` | Storage key for the ecobee API key. |
| `KEY_TOKENS` | `'ecobee_tokens'` | Storage key for the access/refresh token pair. |
| `KEY_SAVED_MODE` | `'ecobee_mode_before_aux'` | Storage key for the saved mode. Must match the on script. |
| `BASE` | `'https://api.ecobee.com'` | ecobee API base URL. |
| `AUX` | `'auxHeatOnly'` | ecobee's name for emergency/aux-only mode. |
| `RESTORABLE_MODES` | `['auto', 'cool', 'heat', 'off']` | Modes the script is allowed to restore to. |

## Flow arguments

None. Any argument passed is ignored.

## Return value

| Value | Meaning |
|---|---|
| `restored` | The ecobee was on `auxHeatOnly` and has been switched back to the saved mode. |
| `restored-fallback` | The ecobee was on `auxHeatOnly` with no usable saved mode; switched to `FALLBACK_MODE`. |
| `left-on-aux` | The ecobee was on `auxHeatOnly` with no saved mode, and `FALLBACK_MODE` is `null`. Nothing changed. |
| `skipped` | The ecobee wasn't on `auxHeatOnly`. Nothing changed; saved value cleared. |

If something goes wrong (not authorized, ecobee unreachable, API error, invalid `FALLBACK_MODE`) the script **throws an error** instead of returning; the Flow card shows the message.

## Stored values

All in HomeyScript persistent storage (`global.get` / `global.set`), shared with the partner and auth scripts.

| Key | Read / written | Contents |
|---|---|---|
| `ecobee_api_key` | Read | ecobee developer API key (string). |
| `ecobee_tokens` | Read and written | `{ access_token, refresh_token }`. Rewritten on every run with the refreshed pair. |
| `ecobee_mode_before_aux` | Read, then cleared (`null`) | `{ mode, savedAt, thermostat }` as written by the on script. |

## Flow tags created

None. Use **Run a script and return text** to get the return value as a tag.

## Installing on Homey

1. In <https://my.homey.app>, open **HomeyScript** and click **New script**.
2. Name it **`ecobee_aux_heat_off`**.
3. Paste in [`ecobee_aux_heat_off.js`](ecobee_aux_heat_off.js) and click **Save**.
4. Set `FALLBACK_MODE` to the mode you'd want if nothing was saved.
5. Test it straight after testing the on script: on → off should take the ecobee to `auxHeatOnly` and back to where it started.

## Using it in Flows

**Peak end**

| WHEN | THEN |
|---|---|
| The peak period ends | HomeyScript › **Run a script** › `ecobee_aux_heat_off` |

**Optional: safety net**

The ecobee stays on aux until something changes it, so a missed peak-end Flow would leave the house on propane. A second run later in the evening catches that. It's harmless when everything worked — the ecobee won't be on aux, so the script returns `skipped`.

| WHEN | THEN |
|---|---|
| A time well after the peak ends (e.g. 2 hours later) | HomeyScript › **Run a script** › `ecobee_aux_heat_off` |

> If you sometimes turn on emergency heat by hand and want it left on, set `FALLBACK_MODE = null`. Otherwise the safety net would switch your manual emergency heat back to `FALLBACK_MODE`.

**Optional: get notified**

| WHEN | THEN |
|---|---|
| The peak period ends | HomeyScript › **Run a script and return text** › `ecobee_aux_heat_off` |
| | Push notification: `ecobee aux heat off: [Result]` |

## Example log output

```
ecobee 'Main Floor': auxHeatOnly -> heat (restored mode saved at 2026-10-05T00:00:03.120Z).
```
```
ecobee 'Main Floor': skipped — mode is 'auto', not auxHeatOnly. Saved mode cleared.
```
```
ecobee 'Main Floor': auxHeatOnly -> heat (no saved mode; used FALLBACK_MODE).
```

## Troubleshooting

| Message | Cause | Fix |
|---|---|---|
| `FALLBACK_MODE 'x' is not valid…` | Typo in `FALLBACK_MODE`. | Use `'heat'`, `'auto'`, `'cool'`, `'off'` or `null`. |
| `Not authorized — run ecobee_auth_start then ecobee_auth_finish first.` | API key or tokens missing from storage. | Complete the [One-time setup](../ecobee-aux-heat-on/#one-time-setup). |
| `ecobee token refresh failed: 400 …` / `401 …` | The refresh token is no longer valid. | Redo the One-time setup. |
| `No thermostat named 'X'. Found: …` | `THERMOSTAT_NAME` doesn't match. | Copy a name from the "Found" list. Use the same value in both scripts. |
| `ecobee set mode failed: …` | ecobee refused the change. | Check the thermostat is online; try again. |
| Returns `restored-fallback` when you expected `restored` | The on script didn't run, returned `skipped`/`already-aux`, or used a different `THERMOSTAT_NAME`. | Check the peak-start Flow and that both scripts have the same settings. |

## Limitations

- **One thermostat per run.** Controls the first thermostat, or the one named in `THERMOSTAT_NAME`.
- **One saved mode.** Only the most recent switch is remembered. That's fine for one peak period at a time.
- **The token refresh rewrites storage on every run** — see the on script's [Limitations](../ecobee-aux-heat-on/#limitations).
- **Shared code.** The token and API helper functions are duplicated in the on script. Fix both if one changes.

## Related scripts

- [`ecobee_aux_heat_on`](../ecobee-aux-heat-on/) — saves the mode and switches to aux heat at peak start.
- [Climate README](../) — how the pair fits together.

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-10-05 | First version. Split from the single `ecobee_emergency_heat.js` script; restores the saved mode instead of always `auto`, and leaves manual changes alone. |
