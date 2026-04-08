import { SAVE_ENDPOINT_URL } from "./utils.js";

export async function saveRecipesToEndpoint(payload) {
  const response = await fetch(SAVE_ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Ismeretlen válasz érkezett a save endpointról."
  }));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "A mentés nem sikerült.");
  }

  return data;
}
