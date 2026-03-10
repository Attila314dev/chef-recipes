const DATA_URL = 'data/recipes.json';

const state = {
  recipes: [],
  filteredRecipes: [],
  filters: {
    q: '',
    category: '',
    diet: '',
    ingredient: '',
    method: '',
    taste: '',
    texture: '',
    color: '',
    difficulty: '',
    season: '',
    allergen: ''
  }
};

const ui = {
  searchInput: document.getElementById('searchInput'),
  recipesGrid: document.getElementById('recipesGrid'),
  resultsMeta: document.getElementById('resultsMeta'),
  activeFilters: document.getElementById('activeFilters'),
  template: document.getElementById('recipeCardTemplate'),
  drawer: document.getElementById('filtersDrawer'),
  openFiltersBtn: document.getElementById('openFiltersBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  applyFiltersBtn: document.getElementById('applyFiltersBtn'),
  selects: {
    category: document.getElementById('filterCategory'),
    diet: document.getElementById('filterDiet'),
    ingredient: document.getElementById('filterIngredients'),
    method: document.getElementById('filterMethods'),
    taste: document.getElementById('filterTaste'),
    texture: document.getElementById('filterTexture'),
    color: document.getElementById('filterColor'),
    difficulty: document.getElementById('filterDifficulty'),
    season: document.getElementById('filterSeason'),
    allergen: document.getElementById('filterAllergens')
  }
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindUI();
  loadFiltersFromUrl();

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Nem sikerült betölteni a recepteket.');
    state.recipes = await response.json();

    populateFilterOptions(state.recipes);
    syncUIFromState();
    applyFilters();
  } catch (error) {
    renderError(error.message);
  }
}

function bindUI() {
  ui.searchInput.addEventListener('input', (e) => {
    state.filters.q = e.target.value.trim();
    updateUrlFromFilters();
    applyFilters();
  });

  Object.entries(ui.selects).forEach(([key, element]) => {
    element.addEventListener('change', (e) => {
      state.filters[key] = e.target.value;
    });
  });

  ui.applyFiltersBtn.addEventListener('click', () => {
    updateUrlFromFilters();
    applyFilters();
    closeDrawer();
  });

  ui.clearFiltersBtn.addEventListener('click', () => {
    clearFilters();
    closeDrawer();
  });

  ui.openFiltersBtn.addEventListener('click', openDrawer);

  ui.drawer.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-drawer="true"]')) {
      closeDrawer();
    }
  });
}

function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);

  state.filters.q = params.get('q') || '';
  state.filters.category = params.get('category') || '';
  state.filters.diet = params.get('diet') || '';
  state.filters.ingredient = params.get('ingredient') || '';
  state.filters.method = params.get('method') || '';
  state.filters.taste = params.get('taste') || '';
  state.filters.texture = params.get('texture') || '';
  state.filters.color = params.get('color') || '';
  state.filters.difficulty = params.get('difficulty') || '';
  state.filters.season = params.get('season') || '';
  state.filters.allergen = params.get('allergen') || '';
}

function syncUIFromState() {
  ui.searchInput.value = state.filters.q;

  Object.entries(ui.selects).forEach(([key, element]) => {
    if (element) {
      element.value = state.filters[key] || '';
    }
  });
}

function populateFilterOptions(recipes) {
  fillSelect(ui.selects.category, collectValues(recipes, 'category'));
  fillSelect(ui.selects.diet, collectValues(recipes, 'diet'));
  fillSelect(ui.selects.ingredient, collectIngredientNames(recipes));
  fillSelect(ui.selects.method, collectValues(recipes, 'methods'));
  fillSelect(ui.selects.taste, collectValues(recipes, 'taste'));
  fillSelect(ui.selects.texture, collectValues(recipes, 'texture'));
  fillSelect(ui.selects.color, collectValues(recipes, 'color'));
  fillSelect(ui.selects.allergen, collectValues(recipes, 'allergens'));
}

function collectValues(recipes, key) {
  const values = new Set();

  recipes.forEach((recipe) => {
    const value = recipe[key];
    if (Array.isArray(value)) {
      value.forEach((item) => values.add(String(item).trim()));
    } else if (value) {
      values.add(String(value).trim());
    }
  });

  return Array.from(values).filter(Boolean).sort(localeSort);
}

function collectIngredientNames(recipes) {
  const values = new Set();

  recipes.forEach((recipe) => {
    (recipe.ingredients || []).forEach((item) => {
      if (item?.name) values.add(String(item.name).trim());
    });
  });

  return Array.from(values).filter(Boolean).sort(localeSort);
}

function fillSelect(select, items) {
  const currentValue = select.value;
  const defaultOption = select.querySelector('option[value=""]');
  select.innerHTML = '';
  if (defaultOption) {
    select.appendChild(defaultOption);
  } else {
    const option = new Option('Összes', '');
    select.appendChild(option);
  }

  items.forEach((item) => {
    select.appendChild(new Option(item, item));
  });

  if (items.includes(currentValue)) {
    select.value = currentValue;
  }
}

function applyFilters() {
  const q = normalize(state.filters.q);

  state.filteredRecipes = state.recipes.filter((recipe) => {
    const matchesSearch = !q || matchesTextSearch(recipe, q);

    const matchesCategory = matchArrayFilter(recipe.category, state.filters.category);
    const matchesDiet = matchArrayFilter(recipe.diet, state.filters.diet);
    const matchesIngredient = matchIngredient(recipe.ingredients, state.filters.ingredient);
    const matchesMethod = matchArrayFilter(recipe.methods, state.filters.method);
    const matchesTaste = matchArrayFilter(recipe.taste, state.filters.taste);
    const matchesTexture = matchArrayFilter(recipe.texture, state.filters.texture);
    const matchesColor = matchArrayFilter(recipe.color, state.filters.color);
    const matchesDifficulty = normalize(recipe.difficulty) === normalize(state.filters.difficulty) || !state.filters.difficulty;
    const matchesSeason = normalize(recipe.season) === normalize(state.filters.season) || !state.filters.season;
    const matchesAllergen = matchArrayFilter(recipe.allergens, state.filters.allergen);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesDiet &&
      matchesIngredient &&
      matchesMethod &&
      matchesTaste &&
      matchesTexture &&
      matchesColor &&
      matchesDifficulty &&
      matchesSeason &&
      matchesAllergen
    );
  });

  renderActiveFilters();
  renderResultsMeta();
  renderRecipes();
}

function matchesTextSearch(recipe, q) {
  const haystack = [
    recipe.name,
    recipe.description,
    recipe.cuisine,
    recipe.difficulty,
    recipe.season,
    ...(recipe.category || []),
    ...(recipe.diet || []),
    ...(recipe.methods || []),
    ...(recipe.taste || []),
    ...(recipe.texture || []),
    ...(recipe.color || []),
    ...(recipe.tags || []),
    ...(recipe.allergens || []),
    ...((recipe.ingredients || []).map((i) => i.name)),
  ]
    .filter(Boolean)
    .join(' | ');

  return normalize(haystack).includes(q);
}

function matchArrayFilter(source, selected) {
  if (!selected) return true;
  if (!Array.isArray(source)) return false;
  return source.some((item) => normalize(item) === normalize(selected));
}

function matchIngredient(ingredients, selected) {
  if (!selected) return true;
  return (ingredients || []).some((item) => normalize(item.name) === normalize(selected));
}

function renderRecipes() {
  ui.recipesGrid.innerHTML = '';

  if (!state.filteredRecipes.length) {
    ui.recipesGrid.innerHTML = `
      <div class="empty-state card">
        <p>Nincs találat a megadott keresésre vagy szűrésre.</p>
      </div>
    `;
    return;
  }

  state.filteredRecipes.forEach((recipe) => {
    const node = ui.template.content.cloneNode(true);
    const links = node.querySelectorAll('.recipe-card-link');
    const img = node.querySelector('.recipe-image');
    const fallback = node.querySelector('.image-fallback');
    const titleLink = node.querySelector('.recipe-title a');
    const description = node.querySelector('.recipe-description');
    const chips = node.querySelector('.recipe-primary-chips');
    const meta = node.querySelector('.recipe-meta');

    const detailUrl = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;

    links.forEach((link) => {
      link.href = detailUrl;
    });

    titleLink.textContent = recipe.name || 'Névtelen recept';
    description.textContent = recipe.description || 'Nincs leírás.';

    setupImage(img, fallback, recipe.image, recipe.name);

    const primaryChips = [
      ...(recipe.category || []).slice(0, 1),
      ...(recipe.diet || []).slice(0, 1),
      ...(recipe.methods || []).slice(0, 2),
    ];

    primaryChips.forEach((item) => {
      chips.appendChild(createChip(item));
    });

    const metaItems = [
      recipe.difficulty ? `Nehézség: ${recipe.difficulty}` : '',
      recipe.prepTimeMin ? `Előkészítés: ${recipe.prepTimeMin} perc` : '',
      recipe.cookTimeMin ? `Elkészítés: ${recipe.cookTimeMin} perc` : '',
    ].filter(Boolean);

    metaItems.forEach((item) => {
      const span = document.createElement('span');
      span.textContent = item;
      meta.appendChild(span);
    });

    ui.recipesGrid.appendChild(node);
  });
}

function renderResultsMeta() {
  const count = state.filteredRecipes.length;
  const total = state.recipes.length;

  ui.resultsMeta.textContent =
    count === total
      ? `${total} recept`
      : `${count} találat / ${total} recept`;
}

function renderActiveFilters() {
  ui.activeFilters.innerHTML = '';

  const labels = {
    q: 'Keresés',
    category: 'Kategória',
    diet: 'Diéta',
    ingredient: 'Összetevő',
    method: 'Eljárás',
    taste: 'Íz',
    texture: 'Textúra',
    color: 'Szín',
    difficulty: 'Nehézség',
    season: 'Szezon',
    allergen: 'Allergén'
  };

  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) return;

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip is-filter';
    chip.innerHTML = `
      <span>${labels[key]}: ${escapeHtml(value)}</span>
      <span class="chip-clear">✕</span>
    `;
    chip.addEventListener('click', () => {
      state.filters[key] = '';
      syncUIFromState();
      updateUrlFromFilters();
      applyFilters();
    });

    ui.activeFilters.appendChild(chip);
  });
}

function updateUrlFromFilters() {
  const params = new URLSearchParams();

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  history.replaceState({}, '', newUrl);
}

function clearFilters() {
  Object.keys(state.filters).forEach((key) => {
    state.filters[key] = '';
  });

  syncUIFromState();
  updateUrlFromFilters();
  applyFilters();
}

function openDrawer() {
  ui.drawer.classList.add('is-open');
  ui.drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  ui.drawer.classList.remove('is-open');
  ui.drawer.setAttribute('aria-hidden', 'true');
}

function renderError(message) {
  ui.recipesGrid.innerHTML = `
    <div class="empty-state card">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function createChip(text) {
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = text;
  return chip;
}

function setupImage(img, fallback, src, alt) {
  const resolved = src && src.trim() ? src.trim() : '';

  if (!resolved) {
    img.classList.add('hidden');
    fallback.classList.remove('hidden');
    return;
  }

  img.src = resolved;
  img.alt = alt || 'Receptkép';
  img.onerror = () => {
    img.classList.add('hidden');
    fallback.classList.remove('hidden');
  };
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('hu-HU')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function localeSort(a, b) {
  return a.localeCompare(b, 'hu');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
