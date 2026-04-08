import { getRecipeDataset } from "./app.js";
import {
  applyFilters,
  buildFilterOptions,
  filtersFromUrl,
  populateSelect,
  resultCountLabel,
  syncFiltersToUrl,
  activeFiltersSummary
} from "./filters.js";
import {
  buildRecipeLink,
  createElement,
  escapeHtml,
  formatDuration
} from "./utils.js";

const state = {
  dataset: null,
  recipes: [],
  filters: filtersFromUrl()
};

const elements = {
  searchInput: document.getElementById("search-input"),
  categorySelect: document.getElementById("filter-category"),
  dietSelect: document.getElementById("filter-diet"),
  methodSelect: document.getElementById("filter-method"),
  tasteSelect: document.getElementById("filter-taste"),
  textureSelect: document.getElementById("filter-texture"),
  colorSelect: document.getElementById("filter-color"),
  clearBtn: document.getElementById("clear-filters-btn"),
  activeFilters: document.getElementById("active-filters"),
  resultsCount: document.getElementById("results-count"),
  recipesGrid: document.getElementById("recipes-grid"),
  recipesEmpty: document.getElementById("recipes-empty")
};

function renderActiveFilters() {
  const items = activeFiltersSummary(state.filters);
  elements.activeFilters.innerHTML = "";

  if (!items.length) {
    const chip = createElement("span", {
      className: "chip",
      text: "Nincs aktív szűrő"
    });
    elements.activeFilters.append(chip);
    return;
  }

  const labels = {
    q: "Keresés",
    category: "Kategória",
    diet: "Diéta",
    method: "Technológia",
    taste: "Íz",
    texture: "Textúra",
    color: "Színvilág"
  };

  items.forEach(({ key, value }) => {
    const chip = createElement("span", {
      className: "chip",
      text: `${labels[key]}: ${value}`
    });
    elements.activeFilters.append(chip);
  });
}

function renderRecipes(recipes) {
  elements.recipesGrid.innerHTML = "";
  elements.resultsCount.textContent = resultCountLabel(recipes.length);
  elements.recipesEmpty.hidden = recipes.length !== 0;

  if (!recipes.length) {
    return;
  }

  recipes.forEach((recipe) => {
    const article = createElement("article", { className: "recipe-card" });

    const heading = createElement("h3");
    const link = createElement("a", {
      attributes: {
        href: buildRecipeLink(recipe.slug)
      },
      text: recipe.title
    });
    heading.append(link);

    const copy = createElement("p", {
      text: recipe.shortDescription || recipe.description || ""
    });

    const chips = createElement("div", { className: "chip-row" });
    [...recipe.category, ...recipe.diet, ...recipe.methods.slice(0, 1)]
      .filter(Boolean)
      .slice(0, 4)
      .forEach((item) => {
        chips.append(
          createElement("span", {
            className: "chip",
            text: item
          })
        );
      });

    const footer = createElement("div", { className: "recipe-card-footer" });

    const meta = createElement("div", { className: "recipe-card-meta" });
    meta.append(
      createElement("span", {
        className: "meta-pill",
        text: `⏱ ${formatDuration(recipe.totalTime)}`
      })
    );
    meta.append(
      createElement("span", {
        className: "meta-pill",
        text: `👥 ${recipe.servings} adag`
      })
    );

    const detailsLink = createElement("a", {
      className: "recipe-card-link",
      attributes: { href: buildRecipeLink(recipe.slug) },
      text: "Részletek →"
    });

    footer.append(meta, detailsLink);
    article.append(heading, copy, chips, footer);
    elements.recipesGrid.append(article);
  });
}

function updateFilterStateFromInputs() {
  state.filters.q = elements.searchInput.value.trim();
  state.filters.category = elements.categorySelect.value;
  state.filters.diet = elements.dietSelect.value;
  state.filters.method = elements.methodSelect.value;
  state.filters.taste = elements.tasteSelect.value;
  state.filters.texture = elements.textureSelect.value;
  state.filters.color = elements.colorSelect.value;
}

function applyAndRender() {
  updateFilterStateFromInputs();
  syncFiltersToUrl(state.filters);
  renderActiveFilters();
  const filtered = applyFilters(state.recipes, state.filters);
  renderRecipes(filtered);
}

function bindEvents() {
  [
    elements.searchInput,
    elements.categorySelect,
    elements.dietSelect,
    elements.methodSelect,
    elements.tasteSelect,
    elements.textureSelect,
    elements.colorSelect
  ].forEach((element) => {
    element.addEventListener("input", applyAndRender);
    element.addEventListener("change", applyAndRender);
  });

  elements.clearBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.categorySelect.value = "";
    elements.dietSelect.value = "";
    elements.methodSelect.value = "";
    elements.tasteSelect.value = "";
    elements.textureSelect.value = "";
    elements.colorSelect.value = "";
    applyAndRender();
  });
}

function hydrateFilterInputs() {
  elements.searchInput.value = state.filters.q;
  elements.categorySelect.value = state.filters.category;
  elements.dietSelect.value = state.filters.diet;
  elements.methodSelect.value = state.filters.method;
  elements.tasteSelect.value = state.filters.taste;
  elements.textureSelect.value = state.filters.texture;
  elements.colorSelect.value = state.filters.color;
}

function populateFilterSelects(recipes) {
  const options = buildFilterOptions(recipes);

  populateSelect(elements.categorySelect, options.category, state.filters.category);
  populateSelect(elements.dietSelect, options.diet, state.filters.diet);
  populateSelect(elements.methodSelect, options.method, state.filters.method);
  populateSelect(elements.tasteSelect, options.taste, state.filters.taste);
  populateSelect(elements.textureSelect, options.texture, state.filters.texture);
  populateSelect(elements.colorSelect, options.color, state.filters.color);
}

async function initChefList() {
  try {
    state.dataset = await getRecipeDataset();
    state.recipes = state.dataset.recipes || [];

    populateFilterSelects(state.recipes);
    hydrateFilterInputs();
    bindEvents();
    renderActiveFilters();
    renderRecipes(applyFilters(state.recipes, state.filters));
  } catch (error) {
    elements.recipesGrid.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

initChefList();
