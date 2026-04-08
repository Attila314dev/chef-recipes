import { SAVE_ENDPOINT_URL } from "./utils.js";

export async function saveRecipesToEndpoint(payload) {
  const response = await fetch(SAVE_ENDPOINT_URL, {
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
      throw new Error(`Az endpoint hibás JSON választ adott. HTTP ${response.status}`);
    }
  } else {
    throw new Error(
      `Az endpoint nem JSON választ adott. HTTP ${response.status}. Válasz eleje: ${rawText.slice(0, 180)}`
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Mentési hiba. HTTP ${response.status}`);
  }

  return data;
}
