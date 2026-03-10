const DRAFT_KEY = 'masterchef_recipe_draft';

const studioUI = {
  loginGate: document.getElementById('loginGate'),
  studioApp: document.getElementById('studioApp'),
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('passwordInput'),
  loginMessage: document.getElementById('loginMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  recipeForm: document.getElementById('recipeForm'),
  ingredientsList: document.getElementById('ingredientsList'),
  stepsList: document.getElementById('stepsList'),
  jsonPreview: document.getElementById('jsonPreview'),
  jsonImport: document.getElementById('jsonImport'),
  studioAlerts: document.getElementById('studioAlerts'),
  addIngredientBtn: document.getElementById('addIngredientBtn'),
  addStepBtn: document.getElementById('addStepBtn'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  downloadJsonBtn: document.getElementById('downloadJsonBtn'),
  loadJsonBtn: document.getElementById('loadJsonBtn'),
  saveDraftBtn: document.getElementById('saveDraftBtn'),
  restoreDraftBtn: document.getElementById('restoreDraftBtn'),
  clearDraftBtn: document.getElementById('clearDraftBtn'),
  resetFormBtn: document.getElementById('resetFormBtn'),
  validateBtn: document.getElementById('validateBtn')
};

document.addEventListener('DOMContentLoaded', initStudio);

function initStudio() {
  bindAuthUI();
  initAccessGate();
}

function bindAuthUI() {
  studioUI.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = studioUI.passwordInput.value;

    if (!password) {
      showLoginMessage('Add meg a jelszót.');
      return;
    }

    if (!authorizeMasterChef(password)) {
      showLoginMessage('Hibás jelszó.');
      return;
    }

    showLoginMessage('Sikeres belépés.', true);
    initAccessGate();
  });

  studioUI.logoutBtn.addEventListener('click', () => {
    logoutMasterChef();
    studioUI.passwordInput.value = '';
    showLoginMessage('');
    studioUI.studioApp.classList.add('hidden');
    studioUI.loginGate.classList.remove('hidden');
    studioUI.logoutBtn.classList.add('hidden');
  });
}

function initAccessGate() {
  if (!isMasterChefAuthorized()) {
    studioUI.loginGate.classList.remove('hidden');
    studioUI.studioApp.classList.add('hidden');
    studioUI.logoutBtn.classList.add('hidden');
    return;
  }

  studioUI.loginGate.classList.add('hidden');
  studioUI.studioApp.classList.remove('hidden');
  studioUI.logoutBtn.classList.remove('hidden');

  initStudioApp();
}

let studioInitialized = false;

function initStudioApp() {
  if (studioInitialized) return;
  studioInitialized = true;

  bindStudioEvents();

  addIngredientRow();
  addStepRow();

  const draft = loadDraft();
  if (draft) {
    fillFormFromRecipe(draft);
    pushAlert('Korábbi draft betöltve a localStorage-ből.', 'success');
  }

  updateJsonPreview();
}

function bindStudioEvents() {
  studioUI.recipeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = validateRecipe(buildRecipeFromForm());

    if (!result.valid) {
      pushAlert(result.errors.join(' '), 'error');
      updateJsonPreview();
      return;
    }

    updateJsonPreview();
    pushAlert('A recept JSON sikeresen frissült és valid.', 'success');
  });

  studioUI.recipeForm.addEventListener('input', () => {
    updateJsonPreview();
    autoSaveDraft();
  });

  studioUI.addIngredientBtn.addEventListener('click', () => {
    addIngredientRow();
    updateJsonPreview();
  });

  studioUI.addStepBtn.addEventListener('click', () => {
    addStepRow();
    updateJsonPreview();
  });

  studioUI.ingredientsList.addEventListener('click', (e) => {
    if (e.target.matches('[data-remove-ingredient]')) {
      e.target.closest('.dynamic-item')?.remove();
      ensureAtLeastOneIngredient();
      updateJsonPreview();
      autoSaveDraft();
    }
  });

  studioUI.stepsList.addEventListener('click', (e) => {
    if (e.target.matches('[data-remove-step]')) {
      e.target.closest('.dynamic-item')?.remove();
      ensureAtLeastOneStep();
      updateJsonPreview();
      autoSaveDraft();
    }
  });

  studioUI.copyJsonBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(studioUI.jsonPreview.textContent);
      pushAlert('JSON a vágólapra másolva.', 'success');
    } catch (error) {
      pushAlert('A másolás nem sikerült.', 'error');
    }
  });

  studioUI.downloadJsonBtn.addEventListener('click', () => {
    const recipe = buildRecipeFromForm();
    const validation = validateRecipe(recipe);

    if (!validation.valid) {
      pushAlert(validation.errors.join(' '), 'error');
      return;
    }

    const filename = `${recipe.slug || 'recept'}.json`;
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    pushAlert(`Export kész: ${filename}`, 'success');
  });

  studioUI.loadJsonBtn.addEventListener('click', () => {
    const raw = studioUI.jsonImport.value.trim();

    if (!raw) {
      pushAlert('Nincs importálandó JSON.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      fillFormFromRecipe(parsed);
      updateJsonPreview();
      autoSaveDraft();
      pushAlert('A JSON sikeresen betöltődött a formba.', 'success');
    } catch (error) {
      pushAlert('Érvénytelen JSON formátum.', 'error');
    }
  });

  studioUI.saveDraftBtn.addEventListener('click', () => {
    autoSaveDraft(true);
  });

  studioUI.restoreDraftBtn.addEventListener('click', () => {
    const draft = loadDraft();
    if (!draft) {
      pushAlert('Nincs elmentett draft.', 'error');
      return;
    }
    fillFormFromRecipe(draft);
    updateJsonPreview();
    pushAlert('Draft visszaállítva.', 'success');
  });

  studioUI.clearDraftBtn.addEventListener('click', () => {
    localStorage.removeItem(DRAFT_KEY);
    pushAlert('A draft törölve lett.', 'success');
  });

  studioUI.resetFormBtn.addEventListener('click', () => {
    studioUI.recipeForm.reset();
    studioUI.ingredientsList.innerHTML = '';
    studioUI.stepsList.innerHTML = '';
    addIngredientRow();
    addStepRow();
    updateJsonPreview();
    autoSaveDraft();
    pushAlert('Az űrlap alaphelyzetbe állt.', 'success');
  });

  studioUI.validateBtn.addEventListener('click', () => {
    const validation = validateRecipe(buildRecipeFromForm());
    if (validation.valid) {
      pushAlert('A recept valid.', 'success');
    } else {
      pushAlert(validation.errors.join(' '), 'error');
    }
    updateJsonPreview();
  });
}

function showLoginMessage(message, isSuccess = false) {
  studioUI.loginMessage.textContent = message;
  studioUI.loginMessage.classList.toggle('is-success', isSuccess);
}

function addIngredientRow(data = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-head">
      <strong>Összetevő</strong>
      <button class="btn btn-danger btn-small" type="button" data-remove-ingredient>Eltávolítás</button>
    </div>
    <div class="dynamic-grid ingredients-grid">
      <input class="input ingredient-name" type="text" placeholder="Név *" value="${escapeAttr(data.name || '')}" />
      <input class="input ingredient-qty" type="text" placeholder="Mennyiség" value="${escapeAttr(data.qty || '')}" />
      <input class="input ingredient-unit" type="text" placeholder="Egység" value="${escapeAttr(data.unit || '')}" />
      <input class="input ingredient-note" type="text" placeholder="Megjegyzés" value="${escapeAttr(data.note || '')}" />
    </div>
  `;
  studioUI.ingredientsList.appendChild(wrapper);
}

function addStepRow(value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-head">
      <strong>Lépés</strong>
      <button class="btn btn-danger btn-small" type="button" data-remove-step>Eltávolítás</button>
    </div>
    <textarea class="input textarea step-text" rows="3" placeholder="Elkészítési lépés *">${escapeHtml(value)}</textarea>
  `;
  studioUI.stepsList.appendChild(wrapper);
}

function ensureAtLeastOneIngredient() {
  if (!studioUI.ingredientsList.children.length) {
    addIngredientRow();
  }
}

function ensureAtLeastOneStep() {
  if (!studioUI.stepsList.children.length) {
    addStepRow();
  }
}

function buildRecipeFromForm() {
  const get = (id) => document.getElementById(id)?.value?.trim() || '';

  const recipe = {
    id: get('id'),
    slug: get('slug'),
    name: get('name'),
    description: get('description'),
    image: get('image'),
    category: splitCsv(get('category')),
    diet: splitCsv(get('diet')),
    cuisine: get('cuisine'),
    taste: splitCsv(get('taste')),
    texture: splitCsv(get('texture')),
    color: splitCsv(get('color')),
    methods: splitCsv(get('methods')),
    methodDetails: splitCsv(get('methodDetails')),
    season: get('season'),
    servingTemp: get('servingTemp'),
    prepTimeMin: toNumberOrNull(get('prepTimeMin')),
    cookTimeMin: toNumberOrNull(get('cookTimeMin')),
    difficulty: get('difficulty'),
    ingredients: collectIngredients(),
    steps: collectSteps(),
    allergens: splitCsv(get('allergens')),
    tags: splitCsv(get('tags')),
    relatedRecipes: splitCsv(get('relatedRecipes')),
    notes: get('notes')
  };

  return recipe;
}

function collectIngredients() {
  return Array.from(studioUI.ingredientsList.querySelectorAll('.dynamic-item'))
    .map((row) => ({
      name: row.querySelector('.ingredient-name')?.value?.trim() || '',
      qty: row.querySelector('.ingredient-qty')?.value?.trim() || '',
      unit: row.querySelector('.ingredient-unit')?.value?.trim() || '',
      note: row.querySelector('.ingredient-note')?.value?.trim() || ''
    }))
    .filter((item) => item.name || item.qty || item.unit || item.note)
    .map((item) => {
      const clean = {
        name: item.name,
        qty: item.qty,
        unit: item.unit
      };
      if (item.note) clean.note = item.note;
      return clean;
    });
}

function collectSteps() {
  return Array.from(studioUI.stepsList.querySelectorAll('.step-text'))
    .map((field) => field.value.trim())
    .filter(Boolean);
}

function updateJsonPreview() {
  const recipe = buildRecipeFromForm();
  studioUI.jsonPreview.textContent = JSON.stringify(recipe, null, 2);
}

function validateRecipe(recipe) {
  const errors = [];

  if (!recipe.id) errors.push('Az ID kötelező.');
  if (!recipe.slug) errors.push('A slug kötelező.');
  if (recipe.slug && !/^[a-z0-9-]+$/.test(recipe.slug)) errors.push('A slug csak kisbetűt, számot és kötőjelet tartalmazhat.');
  if (!recipe.name) errors.push('A név kötelező.');
  if (!recipe.description) errors.push('A leírás kötelező.');
  if (!recipe.category.length) errors.push('Legalább 1 kategória kell.');
  if (!recipe.diet.length) errors.push('Legalább 1 diéta / típus kell.');
  if (!recipe.methods.length) errors.push('Legalább 1 eljárás kell.');
  if (!recipe.difficulty) errors.push('A nehézség kötelező.');
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 1) errors.push('Legalább 1 összetevő kell.');
  if (!Array.isArray(recipe.steps) || recipe.steps.length < 1) errors.push('Legalább 1 elkészítési lépés kell.');

  recipe.ingredients.forEach((item, index) => {
    if (!item.name) {
      errors.push(`A(z) ${index + 1}. összetevő neve hiányzik.`);
    }
  });

  if (recipe.prepTimeMin !== null && recipe.prepTimeMin < 0) errors.push('Az előkészítési idő nem lehet negatív.');
  if (recipe.cookTimeMin !== null && recipe.cookTimeMin < 0) errors.push('A főzési / sütési idő nem lehet negatív.');

  return {
    valid: errors.length === 0,
    errors
  };
}

function fillFormFromRecipe(recipe) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };

  set('id', recipe.id);
  set('slug', recipe.slug);
  set('name', recipe.name);
  set('description', recipe.description);
  set('image', recipe.image);
  set('cuisine', recipe.cuisine);
  set('servingTemp', recipe.servingTemp);

  set('category', joinCsv(recipe.category));
  set('diet', joinCsv(recipe.diet));
  set('methods', joinCsv(recipe.methods));
  set('methodDetails', joinCsv(recipe.methodDetails));
  set('taste', joinCsv(recipe.taste));
  set('texture', joinCsv(recipe.texture));
  set('color', joinCsv(recipe.color));

  set('prepTimeMin', recipe.prepTimeMin ?? '');
  set('cookTimeMin', recipe.cookTimeMin ?? '');
  set('difficulty', recipe.difficulty);
  set('season', recipe.season);

  set('allergens', joinCsv(recipe.allergens));
  set('tags', joinCsv(recipe.tags));
  set('relatedRecipes', joinCsv(recipe.relatedRecipes));
  set('notes', recipe.notes);

  studioUI.ingredientsList.innerHTML = '';
  (recipe.ingredients || []).forEach((item) => addIngredientRow(item));
  ensureAtLeastOneIngredient();

  studioUI.stepsList.innerHTML = '';
  (recipe.steps || []).forEach((step) => addStepRow(step));
  ensureAtLeastOneStep();
}

function autoSaveDraft(showMessage = false) {
  const recipe = buildRecipeFromForm();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(recipe));
  if (showMessage) {
    pushAlert('Piszkozat elmentve.', 'success');
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function pushAlert(message, type = 'success') {
  studioUI.studioAlerts.innerHTML = '';
  const box = document.createElement('div');
  box.className = `alert-box ${type === 'error' ? 'is-error' : 'is-success'}`;
  box.textContent = message;
  studioUI.studioAlerts.appendChild(box);
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCsv(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
