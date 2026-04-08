function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function isValidDataset(body) {
  return Boolean(
    body &&
    typeof body === "object" &&
    Number.isInteger(Number(body.version)) &&
    Array.isArray(body.recipes)
  );
}

async function readJsonBody(req) {
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      success: false,
      message: "Csak POST kérés engedélyezett."
    });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const path = process.env.GITHUB_RECIPES_PATH || "assets/data/recipes.json";

  if (!token || !owner || !repo) {
    return sendJson(res, 500, {
      success: false,
      message: "Hiányoznak a GitHub környezeti változók."
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, {
      success: false,
      message: "A kérés törzse nem érvényes JSON."
    });
  }

  if (!isValidDataset(body)) {
    return sendJson(res, 400, {
      success: false,
      message: "A payload nem érvényes dataset."
    });
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
      return sendJson(res, 502, {
        success: false,
        message: `Nem sikerült lekérni a jelenlegi GitHub fájlt. ${currentText}`
      });
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
      return sendJson(res, 502, {
        success: false,
        message: updateData?.message || "A GitHub update nem sikerült."
      });
    }

    return sendJson(res, 200, {
      success: true,
      message: "Mentés sikeres.",
      commitSha: updateData?.commit?.sha || "",
      updatedAt: normalizedPayload.updatedAt
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: error.message || "Váratlan szerverhiba történt."
    });
  }
}
