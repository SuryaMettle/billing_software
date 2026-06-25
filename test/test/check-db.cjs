const Database = require("better-sqlite3");
const path = require("path");
const os = require("os");

const dbPath = path.join(os.homedir(), "AppData", "Roaming", "POS Billing", "billing.db");
const db = new Database(dbPath);

const row = db.prepare("SELECT google_refresh_token, google_email FROM settings WHERE id = 1").get();
console.log("google_email:", row?.google_email);
console.log("google_refresh_token:", row?.google_refresh_token ? "EXISTS ✅" : "NULL ❌");
db.close();