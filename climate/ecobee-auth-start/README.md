# ecobee Auth — Start

> One-time setup, step 1 of 2. Saves your ecobee developer API key in HomeyScript storage and asks ecobee for an authorization PIN.

| | |
|---|---|
| **Topic** | Climate |
| **Script file** | [`ecobee_auth_start.js`](ecobee_auth_start.js) |
| **Name on Homey** | `ecobee_auth_start` |
| **Run** | Manually, from the HomeyScript editor (**Test**) |
| **Arguments** | The ecobee API key (optional if `API_KEY` is set or a key is already saved) |
| **Returns** | The PIN, as text |
| **Partner script** | [`ecobee_auth_finish`](../ecobee-auth-finish/) |
| **Version** | 1.0.0 |
| **Last updated** | 2026-10-22 |

## Steps

1. Run this script with your API key as the argument (or temporarily paste it into `API_KEY`; put the placeholder back afterwards).
2. Copy the PIN from the console.
3. At [ecobee.com](https://www.ecobee.com), sign in and open **My Apps › Add Application**, then enter the PIN and approve it.
4. Within the time shown, run [`ecobee_auth_finish`](../ecobee-auth-finish/).

## Settings

| Constant | Default | Description |
|---|---|---|
| `API_KEY` | `'YOUR_API_KEY_HERE'` | Optional place to paste the key for one run. **Never commit a real key.** |

## Stored values

| Key | Read / written | Contents |
|---|---|---|
| `ecobee_api_key` | Written | The ecobee developer API key. |
| `ecobee_auth_pending` | Written | `{ code, expiresAt }` used by `ecobee_auth_finish`. |

## Requirements

- An ecobee developer API key (from the ecobee developer portal). ecobee has limited new developer sign-ups, so an existing key may be needed.
- Requested scope is `smartWrite`, which is needed to change the HVAC mode.

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-10-22 | First version. |
