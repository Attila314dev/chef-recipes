const MASTERCHEF_AUTH = {
  password: 'masterchef2026',
  storageKey: 'masterchef_authorized',
  sessionHours: 8
};

function isMasterChefAuthorized() {
  try {
    const raw = localStorage.getItem(MASTERCHEF_AUTH.storageKey);
    if (!raw) return false;

    const payload = JSON.parse(raw);
    if (!payload || payload.authorized !== true || !payload.expiresAt) return false;

    return Date.now() < payload.expiresAt;
  } catch (error) {
    return false;
  }
}

function authorizeMasterChef(password) {
  const isValid = password === MASTERCHEF_AUTH.password;

  if (!isValid) return false;

  const expiresAt = Date.now() + MASTERCHEF_AUTH.sessionHours * 60 * 60 * 1000;
  localStorage.setItem(
    MASTERCHEF_AUTH.storageKey,
    JSON.stringify({
      authorized: true,
      expiresAt
    })
  );

  return true;
}

function logoutMasterChef() {
  localStorage.removeItem(MASTERCHEF_AUTH.storageKey);
}
