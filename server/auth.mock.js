// /server/auth.mock.js
// Simple in-memory token store & mock user
const tokens = new Map(); // token -> user

function makeToken(){
  return 'tok_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export function attachUser(req, _res, next){
  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m){
    const tok = m[1]
    const user = tokens.get(tok) || null
    if (user) req.user = { ...user, token: tok }
  }
  next()
}

export function ensureAuth(req, res, next){
  if (!req.user){
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
  }
  next()
}

export function mountAuthRoutes(app, base){
  // Attach user middleware globally for all routes
  app.use(attachUser);
  
  // In-memory user store
  const users = new Map(); // email -> user
  
  // Signup endpoint
  app.post(`${base}/auth/signup`, (req, res)=>{
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ error: { code: 'BAD_INPUT', message: 'Email required' } });
    if (users.has(email)) return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'User already exists' } });
    
    const user = { id: 'user_' + Math.random().toString(36).slice(2), email, name: email.split('@')[0] };
    users.set(email, user);
    return res.status(201).json({ user });
  });
  
  // Login always succeeds with the registered user
  app.post(`${base}/auth/login`, (req, res)=>{
    const { email } = req.body || {};
    let user = users.get(email);
    if (!user) {
      // Fallback to demo user for backward compatibility
      user = { id: 'demo-user', email: 'demo@example.com', name: 'Demo User', roles: ['user'] };
    }
    const token = makeToken();
    tokens.set(token, user);
    res.json({ token, user });
  })

  app.post(`${base}/auth/logout`, (req, res)=>{
    const auth = req.headers['authorization'] || ''
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (m) tokens.delete(m[1])
    res.json({ ok: true })
  })

  app.get(`${base}/auth/me`, (req, res)=>{
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not logged in' } })
    res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, roles: req.user.roles } })
  })
}
