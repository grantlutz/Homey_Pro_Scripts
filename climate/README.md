# Climate

Scripts for thermostats, heating and cooling.

| Script | What it does |
|---|---|
| [`ecobee-aux-heat-on`](ecobee-aux-heat-on/) | Saves the ecobee's current mode and switches to `auxHeatOnly` (propane only). |
| [`ecobee-aux-heat-off`](ecobee-aux-heat-off/) | Restores the saved mode. |

---

## ecobee aux heat for peak periods

The home has a **dual-fuel** system: a heat pump plus a propane furnace configured as the ecobee's aux heat. Normally the ecobee chooses between them itself. During a utility peak period these two scripts keep the heat pump off and heat with propane, then hand control back to the ecobee afterwards.

### How the pair works together

```mermaid
sequenceDiagram
    participant PS as Flow: peak start
    participant ON as ecobee_aux_heat_on
    participant ST as HomeyScript storage
    participant EC as ecobee
    participant PE as Flow: peak end
    participant OFF as ecobee_aux_heat_off

    PS->>ON: Run a script
    ON->>EC: Current mode?
    EC-->>ON: heat (or auto)
    ON->>ST: ecobee_mode_before_aux = heat
    ON->>EC: Set auxHeatOnly
    Note over EC: Propane only during peak
    PE->>OFF: Run a script
    OFF->>EC: Current mode?
    EC-->>OFF: auxHeatOnly
    OFF->>ST: Read saved mode → heat
    OFF->>EC: Set heat
    OFF->>ST: Clear saved mode
```

### What happens in each situation

| Situation | On script (peak start) | Off script (peak end) |
|---|---|---|
| Normal day, ecobee in `heat` | Saves `heat`, switches to aux | Restores `heat` |
| Normal day, ecobee in `auto` | Saves `auto`, switches to aux | Restores `auto` |
| Summer, ecobee in `cool` | Skips — furnace never starts | Skips |
| Heating turned `off` | Skips | Skips |
| You change the mode by hand during the peak | — | Skips, keeps your change |
| Peak-start Flow fires twice | Second run does nothing; saved mode kept | Restores the original mode |
| Emergency heat turned on by hand, nothing saved | Does nothing | Uses `FALLBACK_MODE` (or leaves it if `null`) |

### Shared settings

Both scripts must agree on:

| Setting | Where | Notes |
|---|---|---|
| `THERMOSTAT_NAME` | Top of both scripts | Same value in both. |
| `KEY_SAVED_MODE` | Top of both scripts | `'ecobee_mode_before_aux'` — leave as is. |

### Credentials

Both scripts read the ecobee API key and tokens that the one-time auth scripts store (`ecobee_api_key`, `ecobee_tokens`). See [One-time setup](ecobee-aux-heat-on/#one-time-setup).

> The auth scripts (`ecobee_auth_start`, `ecobee_auth_finish`) still need to be added to this repo.
