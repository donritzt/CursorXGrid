const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIRECTORY = path.join(__dirname, "data");
const SCORES_FILE = path.join(DATA_DIRECTORY, "scores.json");
const SUPABASE_URL = (process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
).trim();
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const MAX_WPM = 250;
const SESSION_TTL_MS = 30 * 60 * 1000;
const VALID_MODES = new Set([
  "time:15",
  "time:30",
  "time:60",
  "words:10",
  "words:25",
  "words:50",
]);
const sessions = new Map();

if (Boolean(SUPABASE_URL) !== Boolean(SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error(
    "Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both empty to use local JSON storage.",
  );
}

fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
if (!fs.existsSync(SCORES_FILE)) {
  fs.writeFileSync(SCORES_FILE, "[]\n", "utf8");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

function readLocalScores() {
  const contents = fs.readFileSync(SCORES_FILE, "utf8");
  const scores = JSON.parse(contents);
  if (!Array.isArray(scores)) {
    throw new Error("The score database must contain a JSON array.");
  }
  return scores;
}

function writeScores(scores) {
  const temporaryFile = `${SCORES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporaryFile,
    `${JSON.stringify(scores, null, 2)}\n`,
    "utf8",
  );
  fs.renameSync(temporaryFile, SCORES_FILE);
}

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`Supabase request failed (${response.status}): ${details}`);
  }
  return response;
}

async function readScores() {
  if (!SUPABASE_ENABLED) {
    return readLocalScores()
      .sort((a, b) => b.wpm - a.wpm || a.createdAt.localeCompare(b.createdAt))
      .slice(0, 20);
  }

  const response = await supabaseRequest(
    "scores?select=id,name,wpm,raw_wpm,accuracy,errors,mode,created_at&order=wpm.desc,created_at.asc&limit=20",
  );
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an invalid scores response.");
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    wpm: Number(row.wpm),
    rawWpm: Number(row.raw_wpm),
    accuracy: Number(row.accuracy),
    errors: Number(row.errors),
    mode: row.mode,
    createdAt: row.created_at,
  }));
}

async function saveScore(score) {
  if (!SUPABASE_ENABLED) {
    const scores = readLocalScores();
    scores.push(score);
    scores.sort(
      (a, b) => b.wpm - a.wpm || a.createdAt.localeCompare(b.createdAt),
    );
    writeScores(scores.slice(0, 1000));
    return;
  }

  await supabaseRequest("scores", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: score.id,
      name: score.name,
      wpm: score.wpm,
      raw_wpm: score.rawWpm,
      accuracy: score.accuracy,
      errors: score.errors,
      mode: score.mode,
      created_at: score.createdAt,
    }),
  });
}

async function migrateLocalScores() {
  const scores = readLocalScores();
  if (scores.length === 0) return 0;

  await supabaseRequest("scores?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(
      scores.map((score) => ({
        id: score.id,
        name: score.name,
        wpm: score.wpm,
        raw_wpm: score.rawWpm,
        accuracy: score.accuracy,
        errors: score.errors,
        mode: score.mode,
        created_at: score.createdAt,
      })),
    ),
  });
  return scores.length;
}

function parseMode(mode) {
  if (typeof mode !== "string" || !VALID_MODES.has(mode)) return null;
  const [type, value] = mode.split(":");
  return { type, value: Number(value) };
}

function cleanName(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 24);
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function minimumDuration(mode) {
  return mode.type === "time" ? Math.max(1000, mode.value * 1000 - 1200) : 1000;
}

app.get("/api/scores", async (req, res, next) => {
  try {
    res.json(await readScores());
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions", (req, res) => {
  const mode = parseMode(req.body && req.body.mode);
  if (!mode) {
    return res.status(400).json({ error: "Ongeldige testmodus." });
  }

  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.startedAt > SESSION_TTL_MS) sessions.delete(id);
  }

  const id = crypto.randomUUID();
  sessions.set(id, { mode, startedAt: now });
  return res.status(201).json({ sessionId: id });
});

app.post("/api/sessions/finish", (req, res) => {
  const sessionId =
    typeof (req.body && req.body.sessionId) === "string"
      ? req.body.sessionId
      : "";
  const session = sessions.get(sessionId);
  if (!session || Date.now() - session.startedAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return res
      .status(400)
      .json({ error: "Deze test is verlopen. Start een nieuwe test." });
  }
  if (session.finishedAt) {
    return res.status(409).json({ error: "Deze test is al afgerond." });
  }

  const finishedAt = Date.now();
  const elapsedMs = finishedAt - session.startedAt;
  if (elapsedMs < minimumDuration(session.mode)) {
    return res.status(400).json({ error: "De test is te snel afgerond." });
  }

  session.finishedAt = finishedAt;
  return res.json({ elapsedMs });
});

app.post("/api/scores", async (req, res, next) => {
  try {
    const body = req.body || {};
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const session = sessions.get(sessionId);
    if (!session || Date.now() - session.startedAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
      return res.status(400).json({
        error: "Deze test is verlopen of al opgeslagen. Start een nieuwe test.",
      });
    }

    const mode = parseMode(body.mode);
    if (
      !mode ||
      mode.type !== session.mode.type ||
      mode.value !== session.mode.value
    ) {
      return res.status(400).json({
        error: "De testmodus komt niet overeen met de gestarte test.",
      });
    }
    if (!session.finishedAt) {
      return res
        .status(400)
        .json({ error: "Rond eerst de test af voordat je de score opslaat." });
    }

    const name = cleanName(body.name);
    const correctChars = body.correctChars;
    const incorrectChars = body.incorrectChars;
    if (!name) return res.status(400).json({ error: "Vul je naam in." });
    if (
      !isNonNegativeInteger(correctChars) ||
      !isNonNegativeInteger(incorrectChars)
    ) {
      return res.status(400).json({ error: "Ongeldige testresultaten." });
    }

    const totalChars = correctChars + incorrectChars;
    if (
      !Number.isSafeInteger(totalChars) ||
      totalChars < 1 ||
      totalChars > 10000
    ) {
      return res.status(400).json({ error: "Ongeldig aantal getypte tekens." });
    }

    const elapsedMs = session.finishedAt - session.startedAt;
    const elapsedMinutes = elapsedMs / 60000;
    const wpm = Math.round((correctChars / 5 / elapsedMinutes) * 10) / 10;
    const rawWpm = Math.round((totalChars / 5 / elapsedMinutes) * 10) / 10;
    if (wpm > MAX_WPM || rawWpm > MAX_WPM) {
      return res.status(400).json({
        error: `Deze score is niet realistisch (maximum ${MAX_WPM} WPM).`,
      });
    }

    const accuracy = Math.round((correctChars / totalChars) * 1000) / 10;
    const score = {
      id: crypto.randomUUID(),
      name,
      wpm,
      rawWpm,
      accuracy,
      errors: incorrectChars,
      mode: `${mode.type === "time" ? "tijd" : "woorden"} ${mode.value}`,
      createdAt: new Date().toISOString(),
    };

    await saveScore(score);
    sessions.delete(sessionId);
    return res.status(201).json(score);
  } catch (error) {
    return next(error);
  }
});

app.use(
  express.static(path.join(__dirname, "public"), { extensions: ["html"] }),
);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Ongeldige JSON-invoer." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "De aanvraag is te groot." });
  }
  console.error("Request failed:", error);
  return res.status(500).json({ error: "Er ging iets mis op de server." });
});

async function startServer() {
  if (SUPABASE_ENABLED) {
    const migratedCount = await migrateLocalScores();
    console.log(
      `Lokale scorecontrole met Supabase voltooid (${migratedCount} score(s)).`,
    );
  }

  app.listen(PORT, HOST, () => {
    console.log(`CursorXGrid is beschikbaar op http://${HOST}:${PORT}`);
    console.log(
      SUPABASE_ENABLED
        ? "Scores worden opgeslagen in Supabase."
        : `Lokale JSON-opslag actief: ${SCORES_FILE}`,
    );
  });
}

startServer().catch((error) => {
  console.error("CursorXGrid kon niet worden gestart:", error);
  process.exitCode = 1;
});
