const STORAGE_KEY = 'qp_session';

export function loadSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    void err;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    void err;
  }
}

export function getDisplayName(session) {
  if (!session) return null;
  if (session.displayName) return session.displayName;
  if (session.user?.email) {
    return session.user.email.split('@')[0];
  }
  return null;
}

export function getRoleLabel(session) {
  const role = session?.user?.role;
  if (!role) return null;
  return role.charAt(0) + role.slice(1).toLowerCase();
}
