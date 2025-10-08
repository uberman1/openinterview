import fs from "fs";
import path from "path";

const FILE = path.resolve("public/availability.html");
if (!fs.existsSync(FILE)) {
  console.error("ERROR: public/availability.html not found. Run this from your project root.");
  process.exit(1);
}

const original = fs.readFileSync(FILE, "utf8");

// If already patched, exit gracefully.
if (original.includes('id="btnHome"')) {
  console.log("availability.html already has Home button — no changes.");
  process.exit(0);
}

// Target the header button group that contains Revert and Save.
const BUTTON_GROUP_REGEX = /(<div class="flex\\s+items-center\\s+gap-3">[\\s\\S]*?id="btnSave"[\\s\\S]*?<\\/button>)(\\s*<\\/div>)/m;

if (!BUTTON_GROUP_REGEX.test(original)) {
  console.error("ERROR: Could not find the Save button group to patch (id='btnSave'). Aborting.");
  process.exit(1);
}

const HOME_BTN = '\n      <a id="btnHome" href="/home.html" class="px-4 py-2 rounded-lg bg-primary text-white">Home</a>';

const updated = original.replace(BUTTON_GROUP_REGEX, (_m, before, after) => before + HOME_BTN + after);

// Backup then write
const backupPath = FILE + `.bak.${Date.now()}`;
fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(FILE, updated, "utf8");

console.log("✅ Home button added next to Save in availability.html");
console.log("Backup:", backupPath);
