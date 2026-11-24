const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_ORIGIN = "trendstype://app";
const FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/word-banks.js", "word-banks.js"],
  ["/style.css", "style.css"],
  ["/assets/company-logo.png", "assets/company-logo.png"],
  ["/assets/github-logo.webp", "assets/github-logo.webp"],
  [
    "/assets/keyboard-photo-horizontal.png",
    "assets/keyboard-photo-horizontal.png",
  ],
]);
const API_ROUTES = new Map([
  ["/api/scores", new Set(["GET", "POST"])],
  ["/api/sessions", new Set(["POST"])],
  ["/api/sessions/finish", new Set(["POST"])],
]);
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

function parseApiOrigin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "TRENDSTYPE_API_URL moet een HTTPS-origin zonder pad, inloggegevens of query zijn.",
    );
  }
  return url.origin;
}

function errorResponse(status, message) {
  return Response.json({ error: message }, { status });
}

function createProtocolHandler({
  publicDir,
  apiOrigin,
  fetch,
  log = console.error,
}) {
  const origin = parseApiOrigin(apiOrigin);
  return async (request) => {
    const url = new URL(request.url);
    if (
      url.protocol !== "trendstype:" ||
      url.hostname !== "app" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return errorResponse(400, "Ongeldige aanvraag.");
    }

    if (API_ROUTES.has(url.pathname)) {
      if (!API_ROUTES.get(url.pathname).has(request.method)) {
        return errorResponse(405, "Methode niet toegestaan.");
      }
      if (!origin) {
        return errorResponse(503, "Score-server is niet ingesteld.");
      }
      try {
        const headers = { Accept: "application/json" };
        let body;
        if (request.method === "POST") {
          body = await request.arrayBuffer();
          if (body.byteLength > 16384) {
            return errorResponse(413, "De aanvraag is te groot.");
          }
          headers["Content-Type"] = "application/json";
        }
        const response = await fetch(`${origin}${url.pathname}`, {
          method: request.method,
          headers,
          body,
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
        });
        if (response.status >= 300 && response.status < 400) {
          return errorResponse(
            502,
            "De score-server stuurde een onverwachte doorverwijzing.",
          );
        }
        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("content-type") || "application/json",
          },
        });
      } catch (error) {
        log("Score-server niet bereikbaar:", error);
        return errorResponse(503, "De score-server is niet bereikbaar.");
      }
    }

    const filename = FILES.get(url.pathname);
    if (!filename || !["GET", "HEAD"].includes(request.method)) {
      return errorResponse(404, "Bestand niet gevonden.");
    }
    const response = await fetch(
      pathToFileURL(path.join(publicDir, filename)).toString(),
      {
        method: request.method,
      },
    );
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", CSP);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  };
}

module.exports = { APP_ORIGIN, createProtocolHandler, parseApiOrigin };
