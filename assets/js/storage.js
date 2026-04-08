const STORAGE_KEYS = {
  STUDIO_AUTH: "masterchef-studio-auth-v1",
  STUDIO_DRAFTS: "masterchef-studio-drafts-v1",
  LAST_RECIPE_ID: "masterchef-studio-last-recipe-id-v1"
};

function readJson(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallbackValue;
    }
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function isStudioAuthenticated() {
  return localStorage.getItem(STORAGE_KEYS.STUDIO_AUTH) === "1";
}

export function setStudioAuthenticated(value) {
  if (value) {
    localStorage.setItem(STORAGE_KEYS.STUDIO_AUTH, "1");
  } else {
    localStorage.removeItem(STORAGE_KEYS.STUDIO_AUTH);
  }
}

export function getStudioDrafts() {
  return readJson(STORAGE_KEYS.STUDIO_DRAFTS, {});
}

export function saveStudioDraft(recipeId, recipe) {
  const drafts = getStudioDrafts();
  drafts[recipeId] = {
    recipe,
    savedAt: new Date().toISOString()
  };
  writeJson(STORAGE_KEYS.STUDIO_DRAFTS, drafts);
}

export function getStudioDraft(recipeId) {
  const drafts = getStudioDrafts();
  return drafts[recipeId] || null;
}

export function removeStudioDraft(recipeId) {
  const drafts = getStudioDrafts();
  delete drafts[recipeId];
  writeJson(STORAGE_KEYS.STUDIO_DRAFTS, drafts);
}

export function clearAllStudioDrafts() {
  localStorage.removeItem(STORAGE_KEYS.STUDIO_DRAFTS);
}

export function setLastEditedRecipeId(recipeId) {
  if (recipeId) {
    localStorage.setItem(STORAGE_KEYS.LAST_RECIPE_ID, recipeId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.LAST_RECIPE_ID);
  }
}

export function getLastEditedRecipeId() {
  return localStorage.getItem(STORAGE_KEYS.LAST_RECIPE_ID) || "";
}
