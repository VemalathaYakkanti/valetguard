import { create } from 'zustand';

// Migrate from old key names (previous authStore used 'user' / 'token')
const oldUser = localStorage.getItem('user');
const oldToken = localStorage.getItem('token');
if (oldUser && !localStorage.getItem('vg_user')) {
  localStorage.setItem('vg_user', oldUser);
  localStorage.setItem('vg_token', oldToken || '');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

let inactivityTimer = null;
const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes default

const resetTimer = (logoutFn) => {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logoutFn();
    // Redirect to login - use window.location since we're outside React
    window.location.href = '/login';
  }, LOCK_TIMEOUT);
};

const startActivityListeners = (logoutFn) => {
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  const handler = () => resetTimer(logoutFn);
  events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
  // Start the initial timer
  resetTimer(logoutFn);
  // Return cleanup fn
  return () => {
    events.forEach((ev) => window.removeEventListener(ev, handler));
    if (inactivityTimer) clearTimeout(inactivityTimer);
  };
};

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('vg_user')) || null,
  token: localStorage.getItem('vg_token') || null,
  masterPassword: sessionStorage.getItem('vg_mp') || '',
  lockTimeoutMs: LOCK_TIMEOUT,
  _cleanupListeners: null,

  setAuth: (user, token) => {
    localStorage.setItem('vg_user', JSON.stringify(user));
    localStorage.setItem('vg_token', token);
    set({ user, token });
    // Start inactivity timer when user logs in
    const cleanup = startActivityListeners(() => get().logout());
    set({ _cleanupListeners: cleanup });
  },

  setMasterPassword: (password) => {
    sessionStorage.setItem('vg_mp', password);
    set({ masterPassword: password });
  },

  setLockTimeout: (ms) => {
    // Allow overriding lock timeout (e.g., from Settings)
    const logoutFn = () => get().logout();
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      logoutFn();
      window.location.href = '/login';
    }, ms);
    set({ lockTimeoutMs: ms });
  },

  logout: () => {
    // Clean up listeners
    const cleanup = get()._cleanupListeners;
    if (cleanup) cleanup();
    if (inactivityTimer) clearTimeout(inactivityTimer);

    localStorage.removeItem('vg_user');
    localStorage.removeItem('vg_token');
    sessionStorage.removeItem('vg_mp');
    set({
      user: null,
      token: null,
      masterPassword: '',
      _cleanupListeners: null,
    });
  },

  // Re-hydrate listeners if user is already logged in on page load
  initListeners: () => {
    const { user, _cleanupListeners } = get();
    if (user && !_cleanupListeners) {
      const cleanup = startActivityListeners(() => get().logout());
      set({ _cleanupListeners: cleanup });
    }
  },
}));

// Auto-start inactivity timer if user is already persisted (page refresh case)
const { user, initListeners } = useAuthStore.getState();
if (user) {
  initListeners();
}
