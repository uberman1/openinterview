export class MockAuth {
  async getUser() { 
    return { id: 'local-user', roles: ['dev'] }; 
  }
}

export class MockStorage {
  private db = new Map();
  
  async save(key: string, value: any) { 
    this.db.set(key, value); 
    return { ok: true }; 
  }
  
  async get(key: string) { 
    return this.db.get(key) ?? null; 
  }
}

export class MockEmail {
  async send(to: string, subject: string, body: string) { 
    return { id: 'email-local', queued: true, to, subject }; 
  }
}

export class MockPayments {
  async createSession(amountCents: number, meta: any) { 
    return { 
      checkoutUrl: 'http://localhost/mock/checkout', 
      amountCents, 
      meta 
    }; 
  }
}
