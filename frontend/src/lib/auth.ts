export type AuthData = {
  user: { id: string; email: string; role: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const KEY = 'botshield-auth';

export function getAuth (): AuthData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

export function setAuth (data: AuthData) {
  localStorage.setItem(KEY, JSON.stringify(data));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
}

export function clearAuth () {
  localStorage.removeItem(KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
}



