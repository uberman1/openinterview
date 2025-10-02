export const isDemo = (): boolean => {
  try {
    const fromUrl = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('demo') === '1';
    const fromLocal = typeof window !== 'undefined' &&
      window.localStorage.getItem('__DEMO_MODE__') === '1';
    const fromEnv = import.meta?.env?.VITE_DEMO_MODE === 'true';
    return Boolean(fromUrl || fromLocal || fromEnv);
  } catch {
    return Boolean(import.meta?.env?.VITE_DEMO_MODE === 'true');
  }
};

export const enableDemo = (): void => {
  if (typeof window !== 'undefined') localStorage.setItem('__DEMO_MODE__', '1');
};

export const disableDemo = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem('__DEMO_MODE__');
};
