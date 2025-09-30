// In-memory database for Module 1
interface Profile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface Interview {
  id: string;
  profileId: string;
  title: string;
  createdAt: string;
}

const state = {
  profiles: new Map<string, Profile>(),
  interviews: new Map<string, Interview>(),
};

let seq = 0;
function id(): string {
  seq += 1;
  return String(seq).padStart(6, '0');
}

export const db = {
  createProfile(data: { name: string; email: string }): Profile {
    const now = new Date().toISOString();
    const record: Profile = {
      id: id(),
      name: data.name,
      email: data.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
    state.profiles.set(record.id, record);
    return record;
  },

  getProfile(profileId: string): Profile | null {
    return state.profiles.get(profileId) || null;
  },

  getAllProfiles(): Profile[] {
    return Array.from(state.profiles.values());
  },

  updateProfile(profileId: string, patch: Partial<Pick<Profile, 'name' | 'email'>>): Profile | null {
    const cur = state.profiles.get(profileId);
    if (!cur) return null;
    const next: Profile = {
      ...cur,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    state.profiles.set(profileId, next);
    return next;
  },

  listProfiles({ q = '', limit = 20, cursor = null as string | null }) {
    const arr = Array.from(state.profiles.values())
      .filter(p => (q ? (p.name.toLowerCase().includes(q) || p.email.includes(q)) : true))
      .sort((a, b) => a.id.localeCompare(b.id));

    let start = 0;
    if (cursor) {
      const i = arr.findIndex(p => p.id === cursor);
      start = i >= 0 ? i + 1 : 0;
    }

    const slice = arr.slice(start, start + limit);
    const nextCursor = slice.length && (start + limit) < arr.length ? slice[slice.length - 1].id : null;
    return { items: slice, nextCursor };
  },

  createInterview(data: { profileId: string; title: string }): Interview {
    const now = new Date().toISOString();
    const record: Interview = {
      id: id(),
      profileId: data.profileId,
      title: data.title,
      createdAt: now,
    };
    state.interviews.set(record.id, record);
    return record;
  },

  listInterviewsByProfile(profileId: string): Interview[] {
    return Array.from(state.interviews.values())
      .filter(r => r.profileId === profileId)
      .sort((a, b) => a.id.localeCompare(b.id));
  },
};
