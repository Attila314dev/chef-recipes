import { getRecipeDataset } from "./app.js";
import {
  buildListFilterLink,
  createElement,
  escapeHtml,
  formatDuration,
  getQueryParams,
  setDocumentTitle
} from "./utils.js";

const elements = {
  article: document.getElementById("recipe-article"),
  notFound: document.getElementById("recipe-not-found"),
  title: document.getElementById("recipe-title"),
  eyebrow: document.getElementById("recipe-eyebrow"),
  shortDescription: document.getElementById("recipe-short-description"),
  metaSummary: document.getElementById("recipe-meta-summary"),
  description: document.getElementById("recipe-description"),
  ingredientsList: document.getElementById("ingredients-list"),
  stepsList: document.getElementById("steps-list"),
  backLink: document.getElementById("back-to-list-link"),
  relatedRecipes: document.getElementById("related-recipes"),
  chipsCategory: document.getElementById("chips-category"),
  chipsDiet: document.getElementById("chips-diet"),
  chipsMethods: document.getElementById("chips-methods"),
  chipsMethodDetails: document.getElementById("chips-method-details"),
  chipsTaste: document.getElementById("chips-taste"),
  chipsTexture: document.getElementById("chips-texture"),
  chipsColor: document.getElementById("chips-color"),
  chipsAllergens: document.getElementById("chips-allergens"),
  chipsTags: document.getElementById("chips-tags")
};

function createFilterChip(label, filterKey) {
  const chip = createElement("a", {
    className: "chip is-link",
    text: label,
    attributes: {
      href: buildListFilterLink(filterKey, label)
    }
  });
  return chip;
}

function renderChipGroup(container, items, filterKey = null) {
  container.innerHTML = "";

  if (!items || !items.length) {
    container.append(
      createElement("span", { className: "chip", text: "—" })
    );
    return;
  }

  items.forEach((item) => {
    const chip = filterKey
      ? createFilterChip(item, filterKey)
      : createElement("span", { className: "chip", text: item });

    container.append(chip);
  });
}

function renderMetaSummary(recipe) {
  elements.metaSummary.innerHTML = "";

  const values = [
    `⏱ ${formatDuration(recipe.totalTime)}`,
    `👥 ${recipe.servings} adag`,
    `⚙️ ${recipe.difficulty}`
  ];

  values.forEach((value) => {
    elements.metaSummary.append(
      createElement("span", {
        className: "meta-pill",
        text: value
      })
    );
  });
}

function renderIngredients(recipe) {
  elements.ingredientsList.innerHTML = "";

  recipe.ingredients.forEach((ingredient) => {
    const li = document.createElement("li");
    const parts = [
      ingredient.amount,
      ingredient.unit,
      ingredient.name
    ].filter(Boolean).join(" ").trim();

    const fullText = ingredient.note
      ? `${parts} – ${ingredient.note}`
      : parts;

    li.textContent = fullText || ingredient.name || "Ismeretlen hozzávaló";
    elements.ingredientsList.append(li);
  });
}

function renderSteps(recipe) {
  elements.stepsList.innerHTML = "";

  const sortedSteps = [...recipe.steps].sort((a, b) => a.order - b.order);

  sortedSteps.forEach((step) => {
    const li = document.createElement("li");

    const title = createElement("div", {
      className: "step-title",
      text: `${step.order}. ${step.title || "Lépés"}`
    });

    const copy = createElement("div", {
      text: step.description || ""
    });

    li.append(title, copy);
    elements.stepsList.append(li);
  });
}

function renderRelatedRecipes(recipe, allRecipes) {
  elements.relatedRecipes.innerHTML = "";

  const related = allRecipes.filter((item) =>
    recipe.relatedRecipes.includes(item.id)
  );

  if (!related.length) {
    elements.relatedRecipes.innerHTML = `<p class="muted">Nincs megadott kapcsolódó recept.</p>`;
    return;
  }

  related.forEach((item) => {
    const link = createElement("a", {
      className: "related-item",
      attributes: {
        href: `recipe.html?slug=${encodeURIComponent(item.slug)}`
      }
    });

    link.append(
      createElement("span", {
        className: "related-item-title",
        text: item.title
      }),
      createElement("span", {
        className: "related-item-copy",
        text: item.shortDescription || ""
      })
    );

    elements.relatedRecipes.append(link);
  });
}

function restoreBackLink() {
  const referrer = document.referrer;
  if (referrer && referrer.includes("index.html")) {
    elements.backLink.href = referrer;
  }
}

function renderRecipe(recipe, allRecipes) {
  setDocumentTitle(`Chef – ${recipe.title}`);
  elements.eyebrow.textContent = recipe.category?.[0] || "Recept";
  elements.title.textContent = recipe.title;
  elements.shortDescription.textContent = recipe.shortDescription || "";
  elements.description.textContent = recipe.description || "";
  renderMetaSummary(recipe);
  renderIngredients(recipe);
  renderSteps(recipe);

  renderChipGroup(elements.chipsCategory, recipe.category, "category");
  renderChipGroup(elements.chipsDiet, recipe.diet, "diet");
  renderChipGroup(elements.chipsMethods, recipe.methods, "method");
  renderChipGroup(elements.chipsMethodDetails, recipe.methodDetails);
  renderChipGroup(elements.chipsTaste, recipe.taste, "taste");
  renderChipGroup(elements.chipsTexture, recipe.texture, "texture");
  renderChipGroup(elements.chipsColor, recipe.color, "color");
  renderChipGroup(elements.chipsAllergens, recipe.allergens);
  renderChipGroup(elements.chipsTags, recipe.tags);

  renderRelatedRecipes(recipe, allRecipes);

  elements.article.hidden = false;
  elements.notFound.hidden = true;
}

function renderNotFound() {
  elements.article.hidden = true;
  elements.notFound.hidden = false;
  setDocumentTitle("Chef – Recept nem található");
}

async function initRecipeDetail() {
  const params = getQueryParams();
  const slug = params.get("slug");

  if (!slug) {
    renderNotFound();
    return;
  }

  try {
    const dataset = await getRecipeDataset();
    const recipes = dataset.recipes || [];
    const recipe = recipes.find((item) => item.slug === slug);

    restoreBackLink();

    if (!recipe) {
      renderNotFound();
      return;
    }

    renderRecipe(recipe, recipes);
  } catch (error) {
    renderNotFound();
    elements.notFound.innerHTML = `
      <h1>Betöltési hiba</h1>
      <p>${escapeHtml(error.message)}</p>
      <a class="button button-primary" href="index.html">Vissza a listához</a>
    `;
  }
}

initRecipeDetail();
