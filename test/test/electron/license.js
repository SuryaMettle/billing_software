// ── License & Trial Logic ──
//
// Tamper-resistant 14-day trial tracking + offline license key validation,
// locked to this server PC's machine ID (see machineId.js).
//
// Trial start date is stored in THREE independent places so that deleting
// or editing any single one doesn't reset the trial:
//   1. A hidden JSON file inside the Electron userData folder
//   2. A Windows registry value (survives normal app uninstall/reinstall)
//   3. A row in the app's own SQLite database
//
// On every check, all available markers are read and the EARLIEST date
// among them is treated as the true trial start (so re-installing and
// hoping for a "fresh" later start date doesn't help — only the oldest
// found record counts). If markers disagree by being missing, the missing
// ones are silently re-created from the ones that do exist, rather than
// treated as "no record = fresh trial."
//
// Clock-rollback protection: every check also stores "the latest date this
// app has ever observed." If the current system date is earlier than that
// stored latest-seen date, the trial is treated as still running from the
// true start (system clock was wound back) rather than recalculated as if
// less time had passed.

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { app } from "electron";
import { getMachineId } from "./machineId.js";

const TRIAL_DAYS = 14;

// ⚠️ Keep this private — never commit the real value to a public repo.
// This is what makes license keys unforgeable without access to your
// key-generator script. Must exactly match the LICENSE_SECRET used in
// generateLicenseKey.js (kept separately, outside this project).
const LICENSE_SECRET = "4684d4d9c79fd096afc986ab1207aab3e7b21cdfbd1c5365aa77da5bc63d51ec";

const REG_KEY_PATH = "HKCU\\Software\\POSBillingApp";
const REG_VALUE_NAME = "TrialMarker";

function getHiddenFilePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, ".syscache_a8f3.json");
}

function readJsonFileMarker() {
  try {
    const filePath = getHiddenFilePath();
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return null;
  }
}

function writeJsonFileMarker(data) {
  try {
    const filePath = getHiddenFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data), { mode: 0o444 });
    try {
      // Best-effort: mark as hidden on Windows (ignore failure silently)
      execSync(`attrib +h "${filePath}"`, { windowsHide: true });
    } catch {}
  } catch (e) {
    console.error("license: failed to write file marker:", e.message);
  }
}

function readRegistryMarker() {
  try {
    const output = execSync(
      `reg query "${REG_KEY_PATH}" /v ${REG_VALUE_NAME}`,
      { encoding: "utf8", windowsHide: true }
    );
    const match = output.match(/REG_SZ\s+(.+)/);
    if (match && match[1]) return JSON.parse(match[1].trim());
  } catch {
    // Key doesn't exist yet — normal on first run
  }
  return null;
}

function writeRegistryMarker(data) {
  try {
    const value = JSON.stringify(data).replace(/"/g, '\\"');
    execSync(
      `reg add "${REG_KEY_PATH}" /v ${REG_VALUE_NAME} /t REG_SZ /d "${value}" /f`,
      { windowsHide: true }
    );
  } catch (e) {
    console.error("license: failed to write registry marker:", e.message);
  }
}

function readDbMarker(db) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS _license_marker (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )`);
    const row = db.prepare("SELECT data FROM _license_marker WHERE id = 1").get();
    if (row) return JSON.parse(row.data);
  } catch (e) {
    console.error("license: failed to read DB marker:", e.message);
  }
  return null;
}

function writeDbMarker(db, data) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS _license_marker (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )`);
    db.prepare(
      "INSERT INTO _license_marker (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
    ).run(JSON.stringify(data));
  } catch (e) {
    console.error("license: failed to write DB marker:", e.message);
  }
}

/**
 * Reads all available trial markers, reconciles them (earliest startDate
 * wins, latest-seen date is tracked for clock-rollback detection), backfills
 * any missing marker from the reconciled truth, and returns the reconciled
 * { startDate, lastSeenDate } as ISO date strings.
 *
 * @param {object} db - better-sqlite3 database instance
 */
export function getReconciledTrialState(db) {
  const fileMarker = readJsonFileMarker();
  const regMarker = readRegistryMarker();
  const dbMarker = db ? readDbMarker(db) : null;

  const markers = [fileMarker, regMarker, dbMarker].filter(Boolean);

  const now = new Date();
  let startDate;
  let lastSeenDate;

  if (markers.length === 0) {
    // True first run — no markers anywhere. Start the trial now.
    startDate = now.toISOString();
    lastSeenDate = now.toISOString();
  } else {
    // Earliest recorded start date wins (oldest record is the truth)
    startDate = markers
      .map((m) => m.startDate)
      .filter(Boolean)
      .sort()[0];
    // Latest-seen date across all markers, used for clock-rollback detection
    const lastSeenCandidates = markers.map((m) => m.lastSeenDate).filter(Boolean);
    lastSeenDate = lastSeenCandidates.sort().reverse()[0] || startDate;

    // Clock-rollback guard: if current system time is earlier than the
    // latest date we've ever recorded, keep using the recorded lastSeenDate
    // as "now" for elapsed-time purposes instead of trusting the rolled-back
    // clock — this is enforced by the caller (isTrialExpired) via this
    // returned lastSeenDate, not by mutating `now` here.
  }

  const reconciled = { startDate, lastSeenDate: now.toISOString() > lastSeenDate ? now.toISOString() : lastSeenDate };

  // Backfill any marker that was missing or out of date
  writeJsonFileMarker(reconciled);
  writeRegistryMarker(reconciled);
  if (db) writeDbMarker(db, reconciled);

  return reconciled;
}

/**
 * Returns { expired: boolean, daysRemaining: number, startDate: string }
 */
export function getTrialStatus(db) {
  const { startDate, lastSeenDate } = getReconciledTrialState(db);

  const start = new Date(startDate);
  const recordedNow = new Date(lastSeenDate);
  const systemNow = new Date();

  // Use whichever is LATER between the system clock and our recorded
  // last-seen date — this means winding the system clock backwards cannot
  // reduce elapsed time, since we always count from the most-advanced time
  // we've ever legitimately observed.
  const effectiveNow = systemNow > recordedNow ? systemNow : recordedNow;

  const elapsedMs = effectiveNow.getTime() - start.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));

  return {
    expired: elapsedDays >= TRIAL_DAYS,
    daysRemaining,
    startDate,
  };
}

// ── License key generation & validation ──
// Key format: derived via HMAC-SHA256(machineId, secret), truncated and
// formatted as a readable code. Must match exactly what the standalone
// key-generator script (kept private, not shipped with the app) produces.

function computeExpectedKey(machineId) {
  const hmac = crypto.createHmac("sha256", LICENSE_SECRET);
  hmac.update(machineId);
  const digest = hmac.digest("hex").toUpperCase();
  // Format as 5 groups of 5 characters for a typical "license key" look
  return digest.slice(0, 25).match(/.{1,5}/g).join("-");
}

/**
 * Validates a user-entered license key against this machine's expected key.
 */
export function validateLicenseKey(enteredKey) {
  if (!enteredKey || typeof enteredKey !== "string") return false;
  const machineId = getMachineId();
  const expected = computeExpectedKey(machineId);
  const normalize = (s) => s.trim().toUpperCase().replace(/\s+/g, "");
  return normalize(enteredKey) === normalize(expected);
}

function getLicenseFilePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "license.json");
}

export function saveLicenseKey(key) {
  const filePath = getLicenseFilePath();
  fs.writeFileSync(filePath, JSON.stringify({ key, activatedAt: new Date().toISOString() }));
}

export function getSavedLicenseKey() {
  try {
    const filePath = getLicenseFilePath();
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data.key || null;
  } catch {
    return null;
  }
}

/**
 * The single entry point the app should call to decide access.
 * Returns { licensed: boolean, expired: boolean, daysRemaining: number, machineId: string }
 */
export function checkAccess(db) {
  const machineId = getMachineId();
  const savedKey = getSavedLicenseKey();

  if (savedKey && validateLicenseKey(savedKey)) {
    return { licensed: true, expired: false, daysRemaining: null, machineId };
  }

  const trial = getTrialStatus(db);
  return {
    licensed: false,
    expired: trial.expired,
    daysRemaining: trial.daysRemaining,
    machineId,
  };
}