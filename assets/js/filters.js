import {
  extractTaxonomyValues,
  normalizeText,
  pluralizeRecipe,
  recipeSearchText
} from "./utils.js";

export function getDefaultFilters() {
  return {
    q: "",
    category: "",
    diet: "",
    method: "",
    taste: "",
    texture: "",
    color: ""
  };
}

export function filtersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const defaults = getDefaultFilters();

  return {
    q: params.get("q") || defaults.q,
    category: params.get("category") || defaults.category,
    diet: params.get("diet") || defaults.diet,
    method: params.get("method") || defaults.method,
    taste: params.get("taste") || defaults.taste,
    texture: params.get("texture") || defaults.texture,
    color: params.get("color") || defaults.color
  };
}

export function syncFiltersToUrl(filters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const nextUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

export function applyFilters(recipes, filters) {
  const searchNeedle = normalizeText(filters.q);

  return recipes.filter((recipe) => {
    if (searchNeedle) {
      const haystack = recipeSearchText(recipe);
      if (!haystack.includes(searchNeedle)) {
        return false;
      }
    }

    if (filters.category && !recipe.category.includes(filters.category)) {
      return false;
    }

    if (filters.diet && !recipe.diet.includes(filters.diet)) {
      return false;
    }

    if (filters.method && !recipe.methods.includes(filters.method)) {
      return false;
    }

    if (filters.taste && !recipe.taste.includes(filters.taste)) {
      return false;
    }

    if (filters.texture && !recipe.texture.includes(filters.texture)) {
      return false;
    }

    if (filters.color && !recipe.color.includes(filters.color)) {
      return false;
    }

    return true;
  });
}

export function buildFilterOptions(recipes) {
  return {
    category: extractTaxonomyValues(recipes, "category"),
    diet: extractTaxonomyValues(recipes, "diet"),
    method: extractTaxonomyValues(recipes, "methods"),
    taste: extractTaxonomyValues(recipes, "taste"),
    texture: extractTaxonomyValues(recipes, "texture"),
    color: extractTaxonomyValues(recipes, "color")
  };
}

export function populateSelect(selectElement, values, selectedValue = "") {
  const firstOption = selectElement.querySelector("option");
  selectElement.innerHTML = "";

  if (firstOption) {
    selectElement.append(firstOption);
    firstOption.selected = selectedValue === "";
  } else {
    const fallbackOption = document.createElement("option");
    fallbackOption.value = "";
    fallbackOption.textContent = "Összes";
    fallbackOption.selected = selectedValue === "";
    selectElement.append(fallbackOption);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    selectElement.append(option);
  });
}

export function activeFiltersSummary(filters) {
  return Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ key, value }));
}

export function resultCountLabel(count) {
  return pluralizeRecipe(count);
}
