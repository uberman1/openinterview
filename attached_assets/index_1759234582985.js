export class MockAuth {
  async getUser() { return { id: 'local-user', roles: ['dev'] }; }
}
export class MockStorage {
  constructor(){ this.db = new Map(); }
  async save(key, value){ this.db.set(key, value); return { ok: true }; }
  async get(key){ return this.db.get(key) ?? null; }
}
export class MockEmail {
  async send(to, subject, body){ return { id: 'email-local', queued: true, to, subject }; }
}
export class MockPayments {
  async createSession(amountCents, meta){ return { checkoutUrl: 'http://localhost/mock/checkout', amountCents, meta }; }
}
