import { fetchRecipesData } from "./utils.js";

let recipeDatasetPromise = null;

export async function getRecipeDataset() {
  if (!recipeDatasetPromise) {
    recipeDatasetPromise = fetchRecipesData();
  }

  const dataset = await recipeDatasetPromise;
  return dataset;
}

export function resetRecipeDatasetCache() {
  recipeDatasetPromise = null;
}

export function getPageName() {
  return document.body?.dataset?.page || "";
}
