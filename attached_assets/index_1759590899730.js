import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory seed (read once on boot)
const db = JSON.parse(readFileSync(path.join(__dirname, "seed.json"), "utf8"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Root → login (helps Replit preview show correct page)
app.get("/", (_req, res) => res.redirect("/login.html"));
console.log("[OpenInterview] Preview Tip: open /login.html (root redirects there).");

// --- Auth (email -> role) ---
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).send("email required");
  let user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) {
    const isAdmin = /admin@/i.test(email);
    user = { id: String(Date.now()), email, name: email.split("@")[0], role: isAdmin ? "admin" : "user", handle: email.split("@")[0] };
    db.users.push(user);
  }
  res.json({ token: "dev-token", user });
});

// --- Minimal stubs used by later modules / smoke tests ---
app.get("/api/admin/users", (_req, res) => res.json(db.users));
app.get("/api/public/profile/:handle", (req, res) => {
  const p = db.profiles.find(x => x.handle === req.params.handle);
  if (!p) return res.status(404).send("not found");
  const u = db.users.find(x => x.id === p.userId);
  res.json({ name: u.name, email: u.email, ...p.public });
});

export default app;

if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("Server running on", PORT));
}
