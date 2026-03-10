const RECIPE_DATA_URL = 'data/recipes.json';

document.addEventListener('DOMContentLoaded', initRecipePage);

async function initRecipePage() {
  const stateNode = document.getElementById('recipeState');
  const recipeView = document.getElementById('recipeView');

  try {
    const slug = new URLSearchParams(window.location.search).get('slug');

    if (!slug) {
      throw new Error('Nem adtál meg receptet. Nyisd meg a listából a részletes oldalt.');
    }

    const response = await fetch(RECIPE_DATA_URL);
    if (!response.ok) throw new Error('Nem sikerült betölteni a receptadatokat.');

    const recipes = await response.json();
    const recipe = recipes.find((item) => item.slug === slug);

    if (!recipe) {
      throw new Error('A keresett recept nem található.');
    }

    renderRecipe(recipe, recipes);
    document.title = `Chef — ${recipe.name}`;
    stateNode.classList.add('hidden');
    recipeView.classList.remove('hidden');
  } catch (error) {
    stateNode.textContent = error.message;
  }
}

function renderRecipe(recipe, recipes) {
  const image = document.getElementById('recipeImage');
  const imageFallback = document.getElementById('recipeImageFallback');

  document.getElementById('recipeName').textContent = recipe.name || 'Névtelen recept';
  document.getElementById('recipeDescription').textContent = recipe.description || 'Nincs leírás.';
  document.getElementById('recipePrepTime').textContent = formatMinutes(recipe.prepTimeMin);
  document.getElementById('recipeCookTime').textContent = formatMinutes(recipe.cookTimeMin);
  document.getElementById('recipeDifficulty').textContent = recipe.difficulty || '-';
  document.getElementById('recipeServingTemp').textContent = recipe.servingTemp || '-';

  setupImage(image, imageFallback, recipe.image, recipe.name);

  const primaryChips = document.getElementById('detailPrimaryChips');
  primaryChips.innerHTML = '';
  [...(recipe.category || []), ...(recipe.diet || [])].slice(0, 4).forEach((item) => {
    primaryChips.appendChild(createFilterLinkChip(item, guessFilterKey(item, recipe)));
  });

  renderChipSection('recipeCategory', recipe.category, 'category');
  renderChipSection('recipeDiet', recipe.diet, 'diet');
  renderChipSection('recipeCuisine', recipe.cuisine ? [recipe.cuisine] : [], 'q');
  renderChipSection('recipeMethods', recipe.methods, 'method');
  renderChipSection('recipeMethodDetails', recipe.methodDetails, 'q');
  renderChipSection('recipeTaste', recipe.taste, 'taste');
  renderChipSection('recipeTexture', recipe.texture, 'texture');
  renderChipSection('recipeColor', recipe.color, 'color');
  renderChipSection('recipeSeason', recipe.season ? [recipe.season] : [], 'season');
  renderChipSection('recipeAllergens', recipe.allergens, 'allergen');
  renderChipSection('recipeTags', recipe.tags, 'q');

  renderIngredients(recipe.ingredients || []);
  renderSteps(recipe.steps || []);
  renderNotes(recipe.notes);
  renderRelated(recipe, recipes);
}

function renderChipSection(containerId, values, filterKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!values || !values.length) {
    container.innerHTML = '<span class="muted">Nincs megadva</span>';
    return;
  }

  values.forEach((value) => {
    container.appendChild(createFilterLinkChip(value, filterKey));
  });
}

function renderIngredients(ingredients) {
  const list = document.getElementById('recipeIngredients');
  list.innerHTML = '';

  if (!ingredients.length) {
    list.innerHTML = '<li class="muted">Nincs megadva összetevő.</li>';
    return;
  }

  ingredients.forEach((item) => {
    const li = document.createElement('li');
    const main = document.createElement('span');
    main.className = 'ingredient-main';

    const amountParts = [item.qty, item.unit].filter(Boolean).join(' ');
    main.innerHTML = item.name
      ? `<a class="text-link" href="index.html?ingredient=${encodeURIComponent(item.name)}">${escapeHtml(item.name)}</a>${amountParts ? ` — ${escapeHtml(amountParts)}` : ''}`
      : 'Névtelen összetevő';

    li.appendChild(main);

    if (item.note) {
      const note = document.createElement('span');
      note.className = 'ingredient-note';
      note.textContent = `(${item.note})`;
      li.appendChild(note);
    }

    list.appendChild(li);
  });
}

function renderSteps(steps) {
  const list = document.getElementById('recipeSteps');
  list.innerHTML = '';

  if (!steps.length) {
    list.innerHTML = '<li class="muted">Nincs megadva elkészítési lépés.</li>';
    return;
  }

  steps.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
}

function renderNotes(notes) {
  const box = document.getElementById('recipeNotes');
  box.textContent = notes || 'Nincs külön megjegyzés.';
}

function renderRelated(recipe, recipes) {
  const container = document.getElementById('relatedRecipes');
  container.innerHTML = '';

  let related = [];

  if (Array.isArray(recipe.relatedRecipes) && recipe.relatedRecipes.length) {
    related = recipe.relatedRecipes
      .map((slug) => recipes.find((item) => item.slug === slug))
      .filter(Boolean);
  }

  if (!related.length) {
    related = recipes
      .filter((item) => item.slug !== recipe.slug)
      .map((item) => ({
        recipe: item,
        score: similarityScore(recipe, item)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.recipe);
  }

  if (!related.length) {
    container.innerHTML = '<div class="muted">Nincs kapcsolódó recept.</div>';
    return;
  }

  related.forEach((item) => {
    const card = document.createElement('a');
    card.className = 'related-card';
    card.href = `recipe.html?slug=${encodeURIComponent(item.slug)}`;
    card.innerHTML = `
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description || 'Nincs leírás.')}</p>
      <div class="chip-group">
        ${(item.category || []).slice(0, 1).map(renderChipHtml).join('')}
        ${(item.methods || []).slice(0, 2).map(renderChipHtml).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

function createFilterLinkChip(text, filterKey) {
  const link = document.createElement('a');
  link.className = 'chip is-clickable';
  link.href = `index.html?${encodeURIComponent(filterKey)}=${encodeURIComponent(text)}`;
  link.textContent = text;
  return link;
}

function similarityScore(source, candidate) {
  const fields = ['category', 'diet', 'methods', 'taste', 'texture', 'color', 'tags'];
  let score = 0;

  fields.forEach((field) => {
    const a = new Set((source[field] || []).map(normalize));
    const b = new Set((candidate[field] || []).map(normalize));

    a.forEach((value) => {
      if (b.has(value)) score += 1;
    });
  });

  return score;
}

function guessFilterKey(text, recipe) {
  if ((recipe.category || []).includes(text)) return 'category';
  if ((recipe.diet || []).includes(text)) return 'diet';
  return 'q';
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

function formatMinutes(value) {
  return value || value === 0 ? `${value} perc` : '-';
}

function renderChipHtml(text) {
  return `<span class="chip">${escapeHtml(text)}</span>`;
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('hu-HU')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
