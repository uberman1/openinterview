// Generic SMS provider interface + factory
// Provider is selected via env: SMS_PROVIDER=twilio|mock
//
// Note: Twilio SDK is loaded lazily so the app doesn't crash if the
// dependency isn't installed yet.

class BaseSmsProvider {
  async sendSms(_opts) { // eslint-disable-line no-unused-vars
    throw new Error('sendSms not implemented');
  }
}

class TwilioSmsProvider extends BaseSmsProvider {
  constructor() {
    super();
    this.accountSid = process.env.SMS_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.SMS_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
    // Accept multiple env var names for compatibility with existing setups
    this.fromNumber =
      process.env.SMS_FROM_NUMBER ||
      process.env.TWILIO_FROM_NUMBER ||
      process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[sms] Twilio not fully configured, SMS disabled');
      this.client = null;
    } else {
      this.client = null; // created lazily
    }
  }

  async getClient() {
    if (this.client) return this.client;
    if (!this.accountSid || !this.authToken) return null;

    try {
      const mod = await import('twilio');
      const twilioLib = mod.default || mod;
      this.client = twilioLib(this.accountSid, this.authToken);
      return this.client;
    } catch (err) {
      console.error('[sms] Missing npm dependency "twilio". Install it to enable SMS:', err.message || err);
      return null;
    }
  }

  async sendSms({ to, message, metadata }) {
    const client = await this.getClient();
    if (!client) return { success: false, errorMessage: 'Twilio not configured' };

    try {
      const resp = await client.messages.create({
        to,
        from: this.fromNumber,
        body: message,
        statusCallback: process.env.SMS_STATUS_WEBHOOK_URL || undefined,
      });

      console.log('[sms] Twilio message sent', resp.sid, 'to', to, metadata || '');

      return {
        success: true,
        providerMessageId: resp.sid,
      };
    } catch (err) {
      console.error('[sms] Twilio send failed:', err.message || err);
      return {
        success: false,
        errorCode: err.code ? String(err.code) : undefined,
        errorMessage: err.message || String(err),
      };
    }
  }
}

class MockSmsProvider extends BaseSmsProvider {
  async sendSms({ to, message, metadata }) {
    console.log('[sms-mock] Would send SMS', { to, message, metadata });
    return {
      success: true,
      providerMessageId: `mock-${Date.now()}`,
    };
  }
}

let cachedProvider = null;

export function getSmsProvider() {
  if (cachedProvider) return cachedProvider;

  const provider = (process.env.SMS_PROVIDER || '').toLowerCase() || 'mock';

  if (provider === 'twilio') {
    cachedProvider = new TwilioSmsProvider();
  } else if (provider === 'mock') {
    cachedProvider = new MockSmsProvider();
  } else {
    console.warn('[sms] Unknown SMS_PROVIDER, falling back to mock:', provider);
    cachedProvider = new MockSmsProvider();
  }

  return cachedProvider;
}

