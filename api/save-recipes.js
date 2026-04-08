async function readJsonBodyFromNodeRequest(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendNodeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function isValidDataset(body) {
  return Boolean(
    body &&
    typeof body === "object" &&
    Number.isInteger(Number(body.version)) &&
    Array.isArray(body.recipes)
  );
}

async function updateGithubRecipesFile(body) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const path = process.env.GITHUB_RECIPES_PATH || "assets/data/recipes.json";

  if (!token || !owner || !repo) {
    return {
      ok: false,
      status: 500,
      payload: {
        success: false,
        message: "Hiányoznak a GitHub környezeti változók."
      }
    };
  }

  if (!isValidDataset(body)) {
    return {
      ok: false,
      status: 400,
      payload: {
        success: false,
        message: "A payload nem érvényes dataset."
      }
    };
  }

  const normalizedPayload = {
    version: Number(body.version) || 1,
    updatedAt: new Date().toISOString(),
    recipes: body.recipes
  };

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const currentResponse = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "masterchef-studio-save-endpoint"
      }
    });

    if (!currentResponse.ok) {
      const currentText = await currentResponse.text();
      return {
        ok: false,
        status: 502,
        payload: {
          success: false,
          message: `Nem sikerült lekérni a jelenlegi GitHub fájlt. ${currentText}`
        }
      };
    }

    const currentFile = await currentResponse.json();

    const updateResponse = await fetch(contentsUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "masterchef-studio-save-endpoint"
      },
      body: JSON.stringify({
        message: "content: update recipes via MasterChef Studio",
        content: Buffer.from(JSON.stringify(normalizedPayload, null, 2), "utf8").toString("base64"),
        sha: currentFile.sha,
        branch
      })
    });

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      return {
        ok: false,
        status: 502,
        payload: {
          success: false,
          message: updateData?.message || "A GitHub update nem sikerült."
        }
      };
    }

    return {
      ok: true,
      status: 200,
      payload: {
        success: true,
        message: "Mentés sikeres.",
        commitSha: updateData?.commit?.sha || "",
        updatedAt: normalizedPayload.updatedAt
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        success: false,
        message: error.message || "Váratlan szerverhiba történt."
      }
    };
  }
}

async function handleBodyObject(body) {
  return updateGithubRecipesFile(body);
}

export default async function vercelHandler(req, res) {
  if (req.method === "OPTIONS") {
    return sendNodeJson(res, 200, {
      success: true,
      message: "CORS preflight ok."
    });
  }

  if (req.method !== "POST") {
    return sendNodeJson(res, 405, {
      success: false,
      message: "Csak POST kérés engedélyezett."
    });
  }

  let body;
  try {
    body = await readJsonBodyFromNodeRequest(req);
  } catch {
    return sendNodeJson(res, 400, {
      success: false,
      message: "A kérés törzse nem érvényes JSON."
    });
  }

  const result = await handleBodyObject(body);
  return sendNodeJson(res, result.status, result.payload);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        success: true,
        message: "CORS preflight ok."
      })
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        success: false,
        message: "Csak POST kérés engedélyezett."
      })
    };
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        success: false,
        message: "A kérés törzse nem érvényes JSON."
      })
    };
  }

  const result = await handleBodyObject(body);

  return {
    statusCode: result.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(result.payload)
  };
}

export async function onRequestOptions() {
  return jsonResponse(200, {
    success: true,
    message: "CORS preflight ok."
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      message: "A kérés törzse nem érvényes JSON."
    });
  }

  const result = await handleBodyObject(body);
  return jsonResponse(result.status, result.payload);
}
