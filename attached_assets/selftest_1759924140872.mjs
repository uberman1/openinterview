import fs from "fs";
import path from "path";

const FILE = path.resolve("public/availability.html");

function fail(msg) { console.log("❌ FAIL:", msg); process.exitCode = 1; }
function pass(msg) { console.log("✅", msg); }

if (!fs.existsSync(FILE)) { fail("public/availability.html not found."); process.exit(1); }

const html = fs.readFileSync(FILE, "utf8");

html.includes('id="btnRevert"') ? pass("Revert button present") : fail("Revert button missing");
html.includes('id="btnSave"')   ? pass("Save button present")   : fail("Save button missing");
html.includes('id="btnHome"')   ? pass("Home button present")   : fail("Home button missing");

/* Ordering and styling checks */
(/id="btnSave"[\s\S]*?id="btnHome"/m.test(html)) ? pass("Home appears after Save") : fail("Home not after Save");
(/id="btnHome"[^>]*class="[^"]*bg-primary[^"]*text-white[^"]*"/.test(html)) ? pass("Home button styling OK") : fail("Home button styling missing");
(/id="btnHome"[^>]*href="\/home\.html"/.test(html)) ? pass("Home links to /home.html") : fail("Home href incorrect");

const count = (html.match(/id="btnHome"/g) || []).length;
(count === 1) ? pass("Exactly one Home button") : fail(`Expected 1 Home button, found ${count}`);

console.log("\nSelf-test complete.");
