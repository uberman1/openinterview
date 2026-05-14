// tools/update-hashes.mjs
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";

const files = [
  "public/home.html",
  "public/profile_edit.html",
  "public/subscription.html",
  "public/password_reset.html",
  "public/public_profile.html",
  "public/dashboard.html",
  "public/admin.html",
  "public/email_template.html",
  "public/login.html"
];

const normalize = (s) =>
  s.replace(/\r\n/g, "\n")
   .replace(/[ \t]+$/gm, ""); // strip trailing spaces

const hashes = {};
for (const path of files) {
  const raw = readFileSync(path, "utf8");
  const canon = normalize(raw);
  const h = createHash("sha256").update(canon, "utf8").digest("hex");
  hashes[path] = h;
}

const out = { updatedAt: new Date().toISOString(), hashes };
writeFileSync("tests/expected-hashes.json", JSON.stringify(out, null, 2));
console.log("Updated hashes:", out);
