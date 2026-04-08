export const DATA_URL = "./assets/data/recipes.json";

function readRuntimeConfig() {
  const config = window.CHEF_APP_CONFIG || {};
  return {
    SAVE_API_URL: typeof config.SAVE_API_URL === "string" ? config.SAVE_API_URL.trim() : ""
  };
}

export function getSaveApiUrl() {
  return readRuntimeConfig().SAVE_API_URL;
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function toSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function splitCommaValues(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.html) {
    element.innerHTML = options.html;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });
  }

  return element;
}

export function formatDuration(minutes) {
  const total = Number(minutes) || 0;
  if (total <= 0) {
    return "—";
  }

  if (total < 60) {
    return `${total} perc`;
  }

  const hours = Math.floor(total / 60);
  const remaining = total % 60;

  if (remaining === 0) {
    return `${hours} óra`;
  }

  return `${hours} óra ${remaining} perc`;
}

export function pluralizeRecipe(count) {
  return `${count} találat`;
}

export function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

export function buildRecipeLink(slug) {
  return `recipe.html?slug=${encodeURIComponent(slug)}`;
}

export function buildListFilterLink(filterKey, value) {
  const params = new URLSearchParams();
  params.set(filterKey, value);
  return `index.html?${params.toString()}`;
}

export function setDocumentTitle(title) {
  document.title = title;
}

export function uniqueSortedValues(items) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, "hu"));
}

export function extractTaxonomyValues(recipes, key) {
  return uniqueSortedValues(
    recipes.flatMap((recipe) => safeArray(recipe[key]))
  );
}

export async function fetchRecipesData(cacheBust = true) {
  const url = cacheBust ? `${DATA_URL}?v=${Date.now()}` : DATA_URL;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Nem sikerült betölteni az adatokat (${response.status}).`);
  }

  return response.json();
}

export function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("hu-HU", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return String(value ?? "");
  }
}

export function getTodayPin() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}${month}`;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function calcTotalTime(prepTime, cookTime) {
  return (Number(prepTime) || 0) + (Number(cookTime) || 0);
}

export function recipeSearchText(recipe) {
  const fields = [
    recipe.title,
    recipe.shortDescription,
    recipe.description,
    safeArray(recipe.category).join(" "),
    safeArray(recipe.diet).join(" "),
    safeArray(recipe.methods).join(" "),
    safeArray(recipe.methodDetails).join(" "),
    safeArray(recipe.taste).join(" "),
    safeArray(recipe.texture).join(" "),
    safeArray(recipe.color).join(" "),
    safeArray(recipe.tags).join(" "),
    safeArray(recipe.ingredients).map((item) => item.name).join(" ")
  ];

  return normalizeText(fields.join(" "));
}

export function ensureRecipeDefaults(recipe) {
  const nowIso = new Date().toISOString();

  return {
    id: recipe.id || "",
    slug: recipe.slug || "",
    title: recipe.title || "",
    shortDescription: recipe.shortDescription || "",
    description: recipe.description || "",
    category: safeArray(recipe.category),
    diet: safeArray(recipe.diet),
    ingredients: safeArray(recipe.ingredients).map((ingredient) => ({
      name: ingredient?.name || "",
      amount: ingredient?.amount || "",
      unit: ingredient?.unit || "",
      note: ingredient?.note || ""
    })),
    methods: safeArray(recipe.methods),
    methodDetails: safeArray(recipe.methodDetails),
    taste: safeArray(recipe.taste),
    texture: safeArray(recipe.texture),
    color: safeArray(recipe.color),
    allergens: safeArray(recipe.allergens),
    tags: safeArray(recipe.tags),
    relatedRecipes: safeArray(recipe.relatedRecipes),
    steps: safeArray(recipe.steps).map((step, index) => ({
      order: Number(step?.order) || index + 1,
      title: step?.title || "",
      description: step?.description || ""
    })),
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    totalTime: Number(recipe.totalTime) || 0,
    servings: Number(recipe.servings) || 1,
    difficulty: recipe.difficulty || "könnyű",
    createdAt: recipe.createdAt || nowIso,
    updatedAt: recipe.updatedAt || nowIso
  };
}

export function createEmptyRecipe(existingRecipes = []) {
  const baseTitle = "Új recept";
  const baseSlug = toSlug(baseTitle) || "uj-recept";

  let suffix = 1;
  let candidateSlug = baseSlug;
  let candidateId = `recipe-${candidateSlug}`;

  const usedSlugs = new Set(existingRecipes.map((item) => item.slug));
  const usedIds = new Set(existingRecipes.map((item) => item.id));

  while (usedSlugs.has(candidateSlug) || usedIds.has(candidateId)) {
    suffix += 1;
    candidateSlug = `${baseSlug}-${suffix}`;
    candidateId = `recipe-${candidateSlug}`;
  }

  const nowIso = new Date().toISOString();

  return ensureRecipeDefaults({
    id: candidateId,
    slug: candidateSlug,
    title: baseTitle,
    shortDescription: "",
    description: "",
    category: [],
    diet: [],
    ingredients: [{ name: "", amount: "", unit: "", note: "" }],
    methods: [],
    methodDetails: [],
    taste: [],
    texture: [],
    color: [],
    allergens: [],
    tags: [],
    relatedRecipes: [],
    steps: [{ order: 1, title: "", description: "" }],
    prepTime: 0,
    cookTime: 0,
    totalTime: 0,
    servings: 1,
    difficulty: "könnyű",
    createdAt: nowIso,
    updatedAt: nowIso
  });
}

export function validateRecipe(recipe, allRecipes = []) {
  const errors = [];
  const currentId = recipe.id;
  const currentSlug = recipe.slug;

  if (!recipe.id.trim()) {
    errors.push("Az ID kötelező.");
  }

  if (!recipe.slug.trim()) {
    errors.push("A slug kötelező.");
  }

  if (!recipe.title.trim()) {
    errors.push("A cím kötelező.");
  }

  if (!safeArray(recipe.ingredients).length) {
    errors.push("Legalább 1 hozzávaló szükséges.");
  }

  if (!safeArray(recipe.steps).length) {
    errors.push("Legalább 1 lépés szükséges.");
  }

  const duplicateId = allRecipes.find((item) => item.id === currentId && item !== recipe);
  if (duplicateId) {
    errors.push("Az ID már létezik.");
  }

  const duplicateSlug = allRecipes.find((item) => item.slug === currentSlug && item !== recipe);
  if (duplicateSlug) {
    errors.push("A slug már létezik.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
