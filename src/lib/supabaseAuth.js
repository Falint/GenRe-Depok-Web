const storageKey = 'genre-depok-auth-session';

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Konfigurasi autentikasi belum tersedia.');
  }

  return { url, anonKey };
}

async function request(path, options = {}) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error_description || body?.msg || 'Tidak dapat memproses permintaan.');
  }
  return body;
}

function saveSession(session) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

async function getProfile(accessToken, userId) {
  const { url, anonKey } = config();
  const response = await fetch(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,nama_lengkap,jabatan,bidang_divisi,kelompok,level,avatar`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  );
  const profiles = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(profiles) || !profiles[0]) {
    throw new Error('Profil pengurus tidak ditemukan atau tidak dapat diakses.');
  }
  return profiles[0];
}

export async function signInWithPassword(email, password) {
  const session = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const profile = await getProfile(session.access_token, session.user.id);
  saveSession(session);
  return { session, profile };
}

export async function restoreSession() {
  const stored = readSession();
  if (!stored?.refresh_token) return null;

  try {
    const session = await request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: stored.refresh_token }),
    });
    const profile = await getProfile(session.access_token, session.user.id);
    saveSession(session);
    return { session, profile };
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export async function signOut(session) {
  try {
    await request('/auth/v1/logout', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
  } finally {
    localStorage.removeItem(storageKey);
  }
}
