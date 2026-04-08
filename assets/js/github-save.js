import { getSaveApiUrl } from "./utils.js";

export async function saveRecipesToEndpoint(payload) {
  const saveApiUrl = getSaveApiUrl();

  if (!saveApiUrl) {
    throw new Error(
      "Nincs beállítva a SAVE_API_URL. Állítsd be a studio.html fájlban a window.CHEF_APP_CONFIG.SAVE_API_URL értékét."
    );
  }

  const response = await fetch(saveApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`A save endpoint hibás JSON választ adott. HTTP ${response.status}`);
    }
  } else {
    throw new Error(
      `A save endpoint nem JSON választ adott. HTTP ${response.status}. Válasz eleje: ${rawText.slice(0, 180)}`
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Mentési hiba. HTTP ${response.status}`);
  }

  return data;
}
