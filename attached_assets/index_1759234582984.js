// Adapter interfaces (ports) and registry
export class AuthPort {
  async getUser() { throw new Error('Not implemented'); }
}
export class StoragePort {
  async save(key, value) { throw new Error('Not implemented'); }
  async get(key) { throw new Error('Not implemented'); }
}
export class EmailPort {
  async send(to, subject, body) { throw new Error('Not implemented'); }
}
export class PaymentsPort {
  async createSession(amountCents, meta) { throw new Error('Not implemented'); }
}

import flags from '../config/flags.json' assert { type: 'json' };

let registry = null;
export function getRegistry() {
  if (registry) return registry;
  if (flags.useMockAdapters) {
    const { MockAuth, MockStorage, MockEmail, MockPayments } = await import('../mocks/index.js');
    registry = {
      auth: new MockAuth(),
      storage: new MockStorage(),
      email: new MockEmail(),
      payments: new MockPayments(),
      mode: 'mock'
    };
  } else {
    // Placeholder for real adapters; to be implemented in later modules
    registry = { mode: 'real' };
  }
  return registry;
}
