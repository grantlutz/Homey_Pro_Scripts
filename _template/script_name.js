// script_name.js  —  HomeyScript
//
// One or two sentences: what this script does and when to use it.
//
// Flow card : HomeyScript › "Run a script" | "Run a script with an argument" |
//             "Run a script and return Yes/No · text · number"
// Argument  : what args[0] should contain, or "none"
// Returns   : each possible return value and what it means
// Setup     : any one-time setup, or "none"
// Docs      : https://github.com/grantlutz/Homey_Pro_Scripts/tree/main/<topic>/<script-name>
// Version   : 1.0.0

// ── Settings ─────────────────────────────────────────────────────────────────
// User-editable values. One constant per setting, each with a comment.

const EXAMPLE_SETTING = 'value';  // what it controls and valid values

// ── Storage keys ─────────────────────────────────────────────────────────────
// Every global.get/set key this script uses. List them in the README too.

const KEY_EXAMPLE = 'example_key';  // what is stored here

// ── Helpers ──────────────────────────────────────────────────────────────────

// ── Main ─────────────────────────────────────────────────────────────────────

const arg = (typeof args !== 'undefined' && args[0]) ? String(args[0]).trim() : '';

// Validate input and throw a clear error if something is wrong.
// Do the one job.
// log() every decision, including when nothing is done and why.

log(`script_name: did something with '${arg}'`);
return 'done';
