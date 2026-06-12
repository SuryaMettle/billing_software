// src/services/auth.js
// Handles JWT storage, retrieval, and session management.
// Uses localStorage so token persists across page refreshes.
// Token is cleared when app version changes or on logout.

const TOKEN_KEY   = "pos_token";
const USER_KEY    = "pos_user";
const VERSION_KEY = "pos_version";

// ── Bump this every release to force re-login ──
const APP_VERSION = "1.0.0";

// On load, check if version changed — if so, clear old session
(function checkVersion() {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  if (storedVersion !== APP_VERSION) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
})();

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;

  // Decode JWT payload (no crypto verify — server does that)
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      clearSession();
      return false;
    }
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function getUserRole() {
  const user = getStoredUser();
  return user?.role || null;
}

export function isAdmin() {
  return getUserRole() === "admin";
}