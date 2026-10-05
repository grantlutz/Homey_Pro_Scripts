# Homey Pro Scripts

A collection of [HomeyScript](https://homey.app/en-us/app/com.athom.homeyscript/HomeyScript/) scripts for the **Homey Pro** smart home hub. Every script lives in its own folder, grouped by topic, alongside a README that explains what it does, every setting and stored value it uses, and how to call it from a Homey Flow.

Scripts are deliberately small and single-purpose. **Timing, schedules and decisions about *when* to act live in Homey Flows**; a script does the one job a built-in Flow card can't (call an external API, remember state, transform data) and exits.

---

## Script index

| Topic | Script | What it does |
|---|---|---|
| Climate | [`ecobee-aux-heat-on`](climate/ecobee-aux-heat-on/) | Saves the ecobee's current HVAC mode, then switches to `auxHeatOnly` (emergency heat / propane furnace only). Use at the start of a utility peak period. |
| Climate | [`ecobee-aux-heat-off`](climate/ecobee-aux-heat-off/) | Restores the mode saved by `ecobee-aux-heat-on`. Use at the end of the peak period. |

See the [climate README](climate/) for how the ecobee scripts work together.

> Add a row here every time a new script is committed.

---

## Repository layout

```
Homey_Pro_Scripts/
├── README.md                     ← you are here
├── _template/                    ← copy this folder to start a new script
│   ├── README.md
│   └── script_name.js
└── <topic>/                      ← one folder per topic (climate, energy, lighting, …)
    ├── README.md                 ← optional: how the scripts in this topic fit together
    └── <script-name>/            ← one folder per script
        ├── README.md             ← full documentation for this script
        └── <script_name>.js      ← the HomeyScript source, exactly as it runs on Homey
```

### Topics

| Folder | Covers |
|---|---|
| `climate/` | Thermostats, heating and cooling, fans, humidity |
| `energy/` | Utility rates, peak pricing, EV charging, solar, power monitoring |
| `lighting/` | Lights, scenes and dimming logic |
| `presence/` | Occupancy, away mode and presence simulation |
| `security/` | Locks, cameras, sensors and alarms |
| `network/` | UniFi and other network integrations |
| `notifications/` | Push, speech and message helpers |
| `utilities/` | Shared helpers and maintenance scripts (backups, diagnostics) |

A topic folder is created when its first script is added. If a script fits more than one topic, put it where you'd look for it first.

---

## Using a script on your Homey Pro

### 1. Install HomeyScript

Install the **HomeyScript** app on your Homey Pro from the Homey App Store.

### 2. Create the script on Homey

1. Open the Homey web app at <https://my.homey.app> and choose **HomeyScript** in the sidebar.
2. Click **New script** and name it exactly as shown under **Name on Homey** in the script's README (the `.js` file name without the extension).
3. Paste in the contents of the `.js` file from this repository.
4. Click **Save**. Click **Test** to run it once and watch the console output.

### 3. Do any one-time setup

Some scripts need credentials or a setup script run first; this is listed under **Requirements** and **One-time setup** in each README. Credentials are kept in HomeyScript's persistent storage on the Homey, **never in this repository**.

### 4. Call it from a Flow

Add a HomeyScript card to a Flow's **Then** column:

| Flow card | Use it when |
|---|---|
| **Run a script** | The script takes no input and you don't need its result. |
| **Run a script with an argument** | The script reads an argument (`args[0]`). |
| **Run a script and return Yes/No · text · number** | You want the script's `return` value as a Flow tag or to branch on. |

Each README says which card to use and what arguments and return values to expect.

---

## HomeyScript quick reference

Globals available inside every HomeyScript:

| Global | Purpose |
|---|---|
| `args` | Array of arguments from the Flow card. `args[0]` is the argument text. |
| `Homey` | The Homey Web API client (devices, zones, flows, logic variables, …). |
| `global.get(key)` / `global.set(key, value)` | Persistent key/value storage shared by **all** scripts and kept across restarts. Used here for API keys, tokens and saved state. |
| `log(...)` | Write to the script console (visible when testing in the web app). |
| `fetch(url, options)` | HTTP requests to external APIs. |
| `tag(name, value)` | Create or update a Flow tag. |
| `say(text)` | Make Homey speak. |
| `wait(ms)` | Pause the script. |
| `return value` | Hand a value back to the Flow (for the "…and return" cards). |
| `throw new Error(...)` | Fail the script; the Flow card reports the error message. |

---

## Conventions

### Naming

- **Topic folders:** lower-case, one word where possible (`climate`, `energy`).
- **Script folders:** lower-case kebab-case (`ecobee-aux-heat-on`).
- **Script files:** the script's name on Homey in snake_case plus `.js` (`ecobee_aux_heat_on.js`). Keeping them identical makes it obvious which file is which.

### Code

- Start every script with a header comment: file name, purpose, Flow card to use, return values, one-time setup and a link to its README.
- Put user-editable settings in **UPPER_CASE constants at the top** of the file, each with a comment.
- Name every `global` storage key in a constant, and document it in the README's **Stored values** table.
- Validate inputs and `throw` a clear error rather than failing silently — Homey shows the message on the Flow card.
- `log()` every decision, including when the script chooses to do nothing and why.
- Leave timing and scheduling to Flows. One job, then exit.

### Secrets

**Never commit API keys, tokens, passwords or home IP addresses.**

- Store credentials with `global.set()` (normally from a one-time setup script) and read them with `global.get()`.
- If a value must live in the code, commit it as a placeholder such as `'YOUR_API_KEY_HERE'`.
- Review the diff before committing anything copied straight off the Homey.

---

## Adding a new script

1. Copy [`_template/`](_template/) to `<topic>/<script-name>/`.
2. Rename `script_name.js` to the script's name on Homey and add the code.
3. Fill in **every** section of the README — especially **Settings** and **Stored values**. If a section doesn't apply, write "None" rather than deleting it.
4. Check that no secrets are in the code.
5. Add a row to the [Script index](#script-index).
6. Commit with a message like `Add climate/ecobee-aux-heat-on`.

---

## Disclaimer

These scripts are written for one home's equipment and are shared as-is. Read a script's README and code before running it, especially anything that controls heating, locks or other safety-relevant equipment.
