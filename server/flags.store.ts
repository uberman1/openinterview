import { load, save } from './data/fsStore';

export type Flags = {
  enableEmails: boolean;
  enablePayments: boolean;
  enableCloudStorage: boolean;
  enableSupabase: boolean;
  enableVideoPipeline: boolean;
};

const FILE = 'flags.json';
const DEFAULTS: Flags = {
  enableEmails: false,
  enablePayments: false,
  enableCloudStorage: false,
  enableSupabase: false,
  enableVideoPipeline: false
};

export async function getFlags() {
  const flags = await load<Partial<Flags>>(FILE, {});
  return { ...DEFAULTS, ...flags };
}

export async function updateFlags(patch: Partial<Flags>) {
  const next = { ...(await getFlags()), ...patch };
  await save(FILE, next);
  return next;
}
