import { getRecipeDataset, resetRecipeDatasetCache } from "./app.js";
import { saveRecipesToEndpoint } from "./github-save.js";
import {
  getLastEditedRecipeId,
  getStudioDraft,
  getStudioDrafts,
  isStudioAuthenticated,
  removeStudioDraft,
  saveStudioDraft,
  setLastEditedRecipeId,
  setStudioAuthenticated
} from "./storage.js";
import {
  calcTotalTime,
  createEmptyRecipe,
  deepClone,
  ensureRecipeDefaults,
  escapeHtml,
  formatDateTime,
  getTodayPin,
  splitCommaValues,
  toSlug,
  validateRecipe
} from "./utils.js";

const state = {
  dataset: null,
  recipes: [],
  filteredRecipes: [],
  selectedRecipeId: "",
  isDirty: false,
  saveMessageTimer: null
};

const elements = {
  loginView: document.getElementById("studio-login-view"),
  appView: document.getElementById("studio-app-view"),
  loginForm: document.getElementById("studio-login-form"),
  pinInput: document.getElementById("studio-pin-input"),
  loginMessage: document.getElementById("studio-login-message"),
  logoutBtn: document.getElementById("studio-logout-btn"),
  saveStatus: document.getElementById("studio-save-status"),
  recipeList: document.getElementById("studio-recipe-list"),
  searchInput: document.getElementById("studio-search-input"),
  newRecipeBtn: document.getElementById("new-recipe-btn"),
  restoreDraftBtn: document.getElementById("restore-draft-btn"),
  saveDatasetBtn: document.getElementById("save-dataset-btn"),
  form: document.getElementById("recipe-editor-form"),
  preview: document.getElementById("recipe-json-preview"),
  ingredientsEditor: document.getElementById("ingredients-editor"),
  stepsEditor: document.getElementById("steps-editor"),
  addIngredientBtn: document.getElementById("add-ingredient-btn"),
  addStepBtn: document.getElementById("add-step-btn"),
  ingredientTemplate: document.getElementById("ingredient-row-template"),
  stepTemplate: document.getElementById("step-row-template"),

  fieldId: document.getElementById("field-id"),
  fieldSlug: document.getElementById("field-slug"),
  fieldTitle: document.getElementById("field-title"),
  fieldShortDescription: document.getElementById("field-short-description"),
  fieldDescription: document.getElementById("field-description"),
  fieldCategory: document.getElementById("field-category"),
  fieldDiet: document.getElementById("field-diet"),
  fieldMethods: document.getElementById("field-methods"),
  fieldMethodDetails: document.getElementById("field-method-details"),
  fieldTaste: document.getElementById("field-taste"),
  fieldTexture: document.getElementById("field-texture"),
  fieldColor: document.getElementById("field-color"),
  fieldAllergens: document.getElementById("field-allergens"),
  fieldTags: document.getElementById("field-tags"),
  fieldRelatedRecipes: document.getElementById("field-related-recipes"),
  fieldPrepTime: document.getElementById("field-prep-time"),
  fieldCookTime: document.getElementById("field-cook-time"),
  fieldTotalTime: document.getElementById("field-total-time"),
  fieldServings: document.getElementById("field-servings"),
  fieldDifficulty: document.getElementById("field-difficulty")
};

function setSaveStatus(kind, text) {
  elements.saveStatus.className = `save-status save-status-${kind}`;
  elements.saveStatus.textContent = text;
}

function markDirty() {
  state.isDirty = true;
  setSaveStatus("dirty", "Vannak helyi módosítások");
}

function clearDirty() {
  state.isDirty = false;
  setSaveStatus("idle", "Nincs módosítás");
}

function showLoginView() {
  elements.loginView.hidden = false;
  elements.appView.hidden = true;
}

function showAppView() {
  elements.loginView.hidden = true;
  elements.appView.hidden = false;
}

function getSelectedRecipe() {
  return state.recipes.find((recipe) => recipe.id === state.selectedRecipeId) || null;
}

function parseRepeaterIngredients() {
  const items = [...elements.ingredientsEditor.querySelectorAll(".ingredient-item")];

  return items.map((item) => ({
    name: item.querySelector(".ingredient-name").value.trim(),
    amount: item.querySelector(".ingredient-amount").value.trim(),
    unit: item.querySelector(".ingredient-unit").value.trim(),
    note: item.querySelector(".ingredient-note").value.trim()
  })).filter((ingredient) => ingredient.name || ingredient.amount || ingredient.unit || ingredient.note);
}

function parseRepeaterSteps() {
  const items = [...elements.stepsEditor.querySelectorAll(".step-item")];

  return items.map((item, index) => ({
    order: Number(item.querySelector(".step-order").value) || index + 1,
    title: item.querySelector(".step-title").value.trim(),
    description: item.querySelector(".step-description").value.trim()
  })).filter((step) => step.title || step.description);
}

function currentRecipeFromForm() {
  const current = getSelectedRecipe();
  const createdAt = current?.createdAt || new Date().toISOString();

  const recipe = ensureRecipeDefaults({
    id: elements.fieldId.value.trim(),
    slug: elements.fieldSlug.value.trim(),
    title: elements.fieldTitle.value.trim(),
    shortDescription: elements.fieldShortDescription.value.trim(),
    description: elements.fieldDescription.value.trim(),
    category: splitCommaValues(elements.fieldCategory.value),
    diet: splitCommaValues(elements.fieldDiet.value),
    ingredients: parseRepeaterIngredients(),
    methods: splitCommaValues(elements.fieldMethods.value),
    methodDetails: splitCommaValues(elements.fieldMethodDetails.value),
    taste: splitCommaValues(elements.fieldTaste.value),
    texture: splitCommaValues(elements.fieldTexture.value),
    color: splitCommaValues(elements.fieldColor.value),
    allergens: splitCommaValues(elements.fieldAllergens.value),
    tags: splitCommaValues(elements.fieldTags.value),
    relatedRecipes: splitCommaValues(elements.fieldRelatedRecipes.value),
    steps: parseRepeaterSteps(),
    prepTime: Number(elements.fieldPrepTime.value) || 0,
    cookTime: Number(elements.fieldCookTime.value) || 0,
    totalTime: Number(elements.fieldTotalTime.value) || 0,
    servings: Number(elements.fieldServings.value) || 1,
    difficulty: elements.fieldDifficulty.value,
    createdAt,
    updatedAt: new Date().toISOString()
  });

  if (!recipe.slug && recipe.title) {
    recipe.slug = toSlug(recipe.title);
  }

  if (!recipe.id && recipe.slug) {
    recipe.id = `recipe-${recipe.slug}`;
  }

  if (!recipe.totalTime) {
    recipe.totalTime = calcTotalTime(recipe.prepTime, recipe.cookTime);
  }

  return recipe;
}

function updatePreview() {
  const recipe = currentRecipeFromForm();
  elements.preview.textContent = JSON.stringify(recipe, null, 2);
}

function syncFormToState() {
  const recipe = currentRecipeFromForm();
  const index = state.recipes.findIndex((item) => item.id === state.selectedRecipeId);

  if (index === -1) {
    return;
  }

  state.recipes[index] = recipe;
  state.selectedRecipeId = recipe.id;
  saveStudioDraft(recipe.id, recipe);
  setLastEditedRecipeId(recipe.id);
  markDirty();
  updatePreview();
  renderRecipeList();
}

function createIngredientRow(ingredient = { name: "", amount: "", unit: "", note: "" }) {
  const fragment = elements.ingredientTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".ingredient-item");

  row.querySelector(".ingredient-name").value = ingredient.name || "";
  row.querySelector(".ingredient-amount").value = ingredient.amount || "";
  row.querySelector(".ingredient-unit").value = ingredient.unit || "";
  row.querySelector(".ingredient-note").value = ingredient.note || "";

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", syncFormToState);
  });

  row.querySelector(".ingredient-remove").addEventListener("click", () => {
    row.remove();
    syncFormToState();
  });

  return fragment;
}

function createStepRow(step = { order: 1, title: "", description: "" }) {
  const fragment = elements.stepTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".step-item");

  row.querySelector(".step-order").value = step.order ?? 1;
  row.querySelector(".step-title").value = step.title || "";
  row.querySelector(".step-description").value = step.description || "";

  row.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", syncFormToState);
  });

  row.querySelector(".step-remove").addEventListener("click", () => {
    row.remove();
    syncFormToState();
  });

  return fragment;
}

function renderIngredientsEditor(ingredients) {
  elements.ingredientsEditor.innerHTML = "";
  const source = ingredients.length ? ingredients : [{ name: "", amount: "", unit: "", note: "" }];
  source.forEach((ingredient) => {
    elements.ingredientsEditor.append(createIngredientRow(ingredient));
  });
}

function renderStepsEditor(steps) {
  elements.stepsEditor.innerHTML = "";
  const source = steps.length ? steps : [{ order: 1, title: "", description: "" }];
  source.forEach((step, index) => {
    elements.stepsEditor.append(createStepRow({
      ...step,
      order: Number(step.order) || index + 1
    }));
  });
}

function populateForm(recipe) {
  elements.fieldId.value = recipe.id;
  elements.fieldSlug.value = recipe.slug;
  elements.fieldTitle.value = recipe.title;
  elements.fieldShortDescription.value = recipe.shortDescription;
  elements.fieldDescription.value = recipe.description;
  elements.fieldCategory.value = recipe.category.join(", ");
  elements.fieldDiet.value = recipe.diet.join(", ");
  elements.fieldMethods.value = recipe.methods.join(", ");
  elements.fieldMethodDetails.value = recipe.methodDetails.join(", ");
  elements.fieldTaste.value = recipe.taste.join(", ");
  elements.fieldTexture.value = recipe.texture.join(", ");
  elements.fieldColor.value = recipe.color.join(", ");
  elements.fieldAllergens.value = recipe.allergens.join(", ");
  elements.fieldTags.value = recipe.tags.join(", ");
  elements.fieldRelatedRecipes.value = recipe.relatedRecipes.join(", ");
  elements.fieldPrepTime.value = recipe.prepTime;
  elements.fieldCookTime.value = recipe.cookTime;
  elements.fieldTotalTime.value = recipe.totalTime;
  elements.fieldServings.value = recipe.servings;
  elements.fieldDifficulty.value = recipe.difficulty;

  renderIngredientsEditor(recipe.ingredients);
  renderStepsEditor(recipe.steps);
  updatePreview();
}

function selectRecipe(recipeId) {
  const recipe = state.recipes.find((item) => item.id === recipeId);
  if (!recipe) {
    return;
  }

  state.selectedRecipeId = recipeId;
  setLastEditedRecipeId(recipeId);

  const draft = getStudioDraft(recipeId);
  const recipeToEdit = draft?.recipe ? ensureRecipeDefaults(draft.recipe) : ensureRecipeDefaults(recipe);

  const index = state.recipes.findIndex((item) => item.id === recipeId);
  state.recipes[index] = recipeToEdit;

  populateForm(recipeToEdit);
  renderRecipeList();
}

function renderRecipeList() {
  const needle = elements.searchInput.value.trim().toLowerCase();
  state.filteredRecipes = state.recipes
    .filter((recipe) => {
      if (!needle) {
        return true;
      }

      return [recipe.title, recipe.slug, recipe.id]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => a.title.localeCompare(b.title, "hu"));

  elements.recipeList.innerHTML = "";

  state.filteredRecipes.forEach((recipe) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "studio-recipe-button";
    if (recipe.id === state.selectedRecipeId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <span class="studio-recipe-title">${escapeHtml(recipe.title || recipe.slug || recipe.id)}</span>
      <span class="studio-recipe-meta">${escapeHtml(recipe.slug)} · frissítve: ${escapeHtml(formatDateTime(recipe.updatedAt))}</span>
    `;

    button.addEventListener("click", () => {
      selectRecipe(recipe.id);
    });

    elements.recipeList.append(button);
  });
}

function bindStaticFieldListeners() {
  [
    elements.fieldId,
    elements.fieldSlug,
    elements.fieldTitle,
    elements.fieldShortDescription,
    elements.fieldDescription,
    elements.fieldCategory,
    elements.fieldDiet,
    elements.fieldMethods,
    elements.fieldMethodDetails,
    elements.fieldTaste,
    elements.fieldTexture,
    elements.fieldColor,
    elements.fieldAllergens,
    elements.fieldTags,
    elements.fieldRelatedRecipes,
    elements.fieldPrepTime,
    elements.fieldCookTime,
    elements.fieldTotalTime,
    elements.fieldServings,
    elements.fieldDifficulty
  ].forEach((field) => {
    field.addEventListener("input", () => {
      if (field === elements.fieldTitle) {
        const currentSlug = elements.fieldSlug.value.trim();
        const currentId = elements.fieldId.value.trim();

        if (!currentSlug || currentSlug.startsWith("uj-recept")) {
          elements.fieldSlug.value = toSlug(elements.fieldTitle.value.trim());
        }

        if (!currentId || currentId.startsWith("recipe-uj-recept")) {
          const slug = elements.fieldSlug.value.trim();
          elements.fieldId.value = slug ? `recipe-${slug}` : "";
        }
      }

      if (field === elements.fieldPrepTime || field === elements.fieldCookTime) {
        elements.fieldTotalTime.value = String(
          calcTotalTime(elements.fieldPrepTime.value, elements.fieldCookTime.value)
        );
      }

      syncFormToState();
    });

    field.addEventListener("change", syncFormToState);
  });
}

function createNewRecipe() {
  const recipe = createEmptyRecipe(state.recipes);
  state.recipes.unshift(recipe);
  state.selectedRecipeId = recipe.id;
  populateForm(recipe);
  renderRecipeList();
  markDirty();
}

function restoreLatestDraft() {
  const drafts = getStudioDrafts();
  const entries = Object.entries(drafts);

  if (!entries.length) {
    setSaveStatus("idle", "Nincs visszaállítható draft");
    window.clearTimeout(state.saveMessageTimer);
    state.saveMessageTimer = window.setTimeout(() => {
      if (!state.isDirty) {
        clearDirty();
      }
    }, 2000);
    return;
  }

  const latest = entries.sort((a, b) => {
    return new Date(b[1].savedAt).getTime() - new Date(a[1].savedAt).getTime();
  })[0];

  const recipeId = latest[0];
  const draftRecipe = ensureRecipeDefaults(latest[1].recipe);

  const existingIndex = state.recipes.findIndex((item) => item.id === recipeId);
  if (existingIndex >= 0) {
    state.recipes[existingIndex] = draftRecipe;
  } else {
    state.recipes.unshift(draftRecipe);
  }

  state.selectedRecipeId = recipeId;
  populateForm(draftRecipe);
  renderRecipeList();
  markDirty();
}

async function saveDataset() {
  if (!getSelectedRecipe()) {
    return;
  }

  syncFormToState();

  const errors = [];
  state.recipes.forEach((recipe) => {
    const result = validateRecipe(recipe, state.recipes);
    if (!result.valid) {
      errors.push(`${recipe.title || recipe.id || "Ismeretlen recept"}: ${result.errors.join(" ")}`);
    }
  });

  if (errors.length) {
    setSaveStatus("error", "Mentési hiba");
    window.alert(`Mentés megszakítva:\n\n${errors.join("\n")}`);
    return;
  }

  const payload = {
    version: Number(state.dataset?.version) || 1,
    updatedAt: new Date().toISOString(),
    recipes: deepClone(state.recipes)
  };

  try {
    setSaveStatus("saving", "Mentés folyamatban...");
    const result = await saveRecipesToEndpoint(payload);
    resetRecipeDatasetCache();
    state.dataset = payload;
    clearDirty();
    setSaveStatus("success", `Mentve · ${result.updatedAt || "kész"}`);

    state.recipes.forEach((recipe) => removeStudioDraft(recipe.id));
  } catch (error) {
    setSaveStatus("error", "Mentési hiba");
    window.alert(`Mentési hiba: ${error.message}`);
  }
}

function bindGlobalEvents() {
  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const pin = elements.pinInput.value.trim();

    if (pin === getTodayPin()) {
      setStudioAuthenticated(true);
      elements.loginMessage.textContent = "";
      showAppView();
      initStudioApp();
    } else {
      elements.loginMessage.textContent = "Hibás PIN.";
    }
  });

  elements.logoutBtn.addEventListener("click", () => {
    setStudioAuthenticated(false);
    showLoginView();
    elements.pinInput.value = "";
    elements.loginMessage.textContent = "";
  });

  elements.searchInput.addEventListener("input", renderRecipeList);

  elements.newRecipeBtn.addEventListener("click", createNewRecipe);
  elements.restoreDraftBtn.addEventListener("click", restoreLatestDraft);
  elements.saveDatasetBtn.addEventListener("click", saveDataset);

  elements.addIngredientBtn.addEventListener("click", () => {
    elements.ingredientsEditor.append(createIngredientRow());
    syncFormToState();
  });

  elements.addStepBtn.addEventListener("click", () => {
    const nextOrder = elements.stepsEditor.querySelectorAll(".step-item").length + 1;
    elements.stepsEditor.append(createStepRow({ order: nextOrder, title: "", description: "" }));
    syncFormToState();
  });

  bindStaticFieldListeners();
}

async function initStudioApp() {
  if (state.dataset) {
    renderRecipeList();
    return;
  }

  try {
    state.dataset = await getRecipeDataset();
    state.recipes = (state.dataset.recipes || []).map((recipe) => ensureRecipeDefaults(recipe));

    const preferredId = getLastEditedRecipeId();
    const existingPreferred = state.recipes.find((item) => item.id === preferredId);

    const initialRecipe = existingPreferred || state.recipes[0];
    renderRecipeList();

    if (initialRecipe) {
      selectRecipe(initialRecipe.id);
    } else {
      createNewRecipe();
    }

    clearDirty();
  } catch (error) {
    setSaveStatus("error", "Betöltési hiba");
    elements.recipeList.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function initStudio() {
  bindGlobalEvents();

  if (isStudioAuthenticated()) {
    showAppView();
    initStudioApp();
  } else {
    showLoginView();
  }
}

initStudio();
