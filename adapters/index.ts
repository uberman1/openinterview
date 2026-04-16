// Adapter interfaces (ports) and registry
export class AuthPort {
  async getUser(): Promise<any> { 
    throw new Error('Not implemented'); 
  }
}

export class StoragePort {
  async save(key: string, value: any): Promise<any> { 
    throw new Error('Not implemented'); 
  }
  async get(key: string): Promise<any> { 
    throw new Error('Not implemented'); 
  }
}

export class EmailPort {
  async send(to: string, subject: string, body: string): Promise<any> { 
    throw new Error('Not implemented'); 
  }
}

export class PaymentsPort {
  async createSession(amountCents: number, meta: any): Promise<any> { 
    throw new Error('Not implemented'); 
  }
}

import flags from '../config/flags.json';

let registry: any = null;

export async function getRegistry() {
  if (registry) return registry;
  
  if (flags.useMockAdapters) {
    const { MockAuth, MockStorage, MockEmail, MockPayments } = await import('../mocks/index');
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
