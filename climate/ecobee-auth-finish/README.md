# ecobee Auth — Finish

> One-time setup, step 2 of 2. Swaps the approved PIN for an access/refresh token pair and saves it for the aux heat scripts.

| | |
|---|---|
| **Topic** | Climate |
| **Script file** | [`ecobee_auth_finish.js`](ecobee_auth_finish.js) |
| **Name on Homey** | `ecobee_auth_finish` |
| **Run** | Manually, from the HomeyScript editor (**Test**) |
| **Arguments** | None |
| **Returns** | `authorized` |
| **Partner script** | [`ecobee_auth_start`](../ecobee-auth-start/) |
| **Version** | 1.0.0 |
| **Last updated** | 2026-10-22 |

## Stored values

| Key | Read / written | Contents |
|---|---|---|
| `ecobee_api_key` | Read | Saved by `ecobee_auth_start`. |
| `ecobee_auth_pending` | Read, then cleared | `{ code, expiresAt }`. |
| `ecobee_tokens` | Written | `{ access_token, refresh_token, expires_at }`, used by the aux heat scripts. |

## Troubleshooting

| Message | Fix |
|---|---|
| `Not approved yet…` | Enter the PIN under **My Apps** in the ecobee portal, then run this again. |
| `The PIN has expired…` | Run `ecobee_auth_start` again. |
| `Nothing to finish…` | Run `ecobee_auth_start` first. |

## When to redo setup

Only if the tokens stop working, for example the app was removed in the ecobee portal or the aux heat scripts report `ecobee token refresh failed`.

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-10-22 | First version. |
