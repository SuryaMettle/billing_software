// ── Machine ID ──
// Derives a stable identifier for this specific Windows installation, used
// to lock license keys to the server PC. Based on the Windows "MachineGuid"
// registry value, which is generated once at OS install and does not change
// across reboots, app reinstalls, or user account changes — it only changes
// if Windows itself is reinstalled.
//
// We hash it (rather than exposing the raw GUID) so the machine ID shown to
// customers/used in license generation isn't a sensitive system identifier.

import crypto from "crypto";
import os from "os";
import { execSync } from "child_process";

let cachedMachineId = null;

function readWindowsMachineGuid() {
  try {
    // Reads HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid via the
    // built-in `reg query` command — no native dependencies required.
    const output = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: "utf8", windowsHide: true }
    );
    const match = output.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
    if (match && match[1]) return match[1].trim();
  } catch (e) {
    console.error("machineId: failed to read MachineGuid from registry:", e.message);
  }
  return null;
}

/**
 * Returns a stable, human-shareable machine ID for this PC.
 * Format: 4 groups of 4 uppercase hex characters, e.g. "A1B2-C3D4-E5F6-0123"
 * Falls back to a less-stable but still-local identifier if the registry
 * read fails for any reason (so the app never crashes on this).
 */
export function getMachineId() {
  if (cachedMachineId) return cachedMachineId;

  let raw = readWindowsMachineGuid();

  if (!raw) {
    // Fallback: combine hostname + platform + arch. Less stable (changes if
    // hostname changes) but ensures the app still functions if the registry
    // read is ever blocked (e.g. restricted permissions).
    raw = `${os.hostname()}-${process.platform}-${process.arch}-fallback`;
  }

  const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
  // Take first 16 hex chars, format as 4 groups of 4 for readability when
  // a shop owner has to read it aloud or type it somewhere.
  const short = hash.slice(0, 16);
  cachedMachineId = short.match(/.{1,4}/g).join("-");
  return cachedMachineId;
}