const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const {
  createProtocolHandler,
  parseApiOrigin,
} = require("../electron/protocol");
const { createUpdates } = require("../electron/updates");

test("API configuration accepts only an HTTPS origin without credentials or paths", () => {
  assert.equal(parseApiOrigin(), null);
  assert.equal(
    parseApiOrigin("https://scores.example.com/"),
    "https://scores.example.com",
  );
  for (const value of [
    "http://scores.example.com",
    "https://user:secret@scores.example.com",
    "https://scores.example.com/api",
    "https://scores.example.com/?other=1",
  ]) {
    assert.throws(() => parseApiOrigin(value));
  }
});

test("desktop protocol limits routes and reports an unconfigured API", async () => {
  const handler = createProtocolHandler({
    publicDir: "public",
    fetch: async () => {
      throw new Error("unexpected fetch");
    },
  });
  const response = await handler(new Request("trendstype://app/api/scores"));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /niet ingesteld/);
  assert.equal(
    (await handler(new Request("trendstype://app/api/sessions"))).status,
    405,
  );
  assert.equal(
    (await handler(new Request("trendstype://app/.env"))).status,
    404,
  );
  assert.equal(
    (await handler(new Request("trendstype://other/app.js"))).status,
    400,
  );
});

test("desktop protocol serves only allowed files with a content security policy", async () => {
  let fetchedUrl;
  const handler = createProtocolHandler({
    publicDir: "public",
    fetch: async (url) => {
      fetchedUrl = url;
      return new Response("<html></html>", {
        headers: { "content-type": "text/html" },
      });
    },
  });
  const response = await handler(new Request("trendstype://app/"));
  assert.match(fetchedUrl, /public\/index\.html$/);
  assert.match(
    response.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
});

test("API proxy preserves allowed JSON requests but does not follow redirects", async () => {
  const calls = [];
  const handler = createProtocolHandler({
    publicDir: "public",
    apiOrigin: "https://scores.example.com",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ sessionId: "test" }, { status: 201 });
    },
  });
  const response = await handler(
    new Request("trendstype://app/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "should-not-be-forwarded",
      },
      body: '{"mode":"words:10"}',
    }),
  );
  assert.equal(response.status, 201);
  assert.equal((await response.json()).sessionId, "test");
  assert.equal(calls[0].url, "https://scores.example.com/api/sessions");
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(
    Buffer.from(calls[0].options.body).toString(),
    '{"mode":"words:10"}',
  );

  const redirect = createProtocolHandler({
    publicDir: "public",
    apiOrigin: "https://scores.example.com",
    fetch: async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://other.example" },
      }),
  });
  assert.equal(
    (await redirect(new Request("trendstype://app/api/scores"))).status,
    502,
  );
});

test("API proxy reports network failures and rejects oversized requests", async () => {
  const errors = [];
  const handler = createProtocolHandler({
    publicDir: "public",
    apiOrigin: "https://scores.example.com",
    fetch: async () => {
      throw new Error("offline");
    },
    log: (...args) => errors.push(args),
  });
  assert.equal(
    (await handler(new Request("trendstype://app/api/scores"))).status,
    503,
  );
  assert.equal(errors.length, 1);
  const response = await handler(
    new Request("trendstype://app/api/scores", {
      method: "POST",
      body: "x".repeat(16385),
    }),
  );
  assert.equal(response.status, 413);
});

test("updater waits for explicit download and install", async () => {
  const updater = new EventEmitter();
  let downloads = 0;
  let installs = 0;
  updater.checkForUpdates = async () =>
    updater.emit("update-available", { version: "1.1.0" });
  updater.downloadUpdate = async () => {
    downloads += 1;
    updater.emit("update-downloaded", { version: "1.1.0" });
  };
  updater.quitAndInstall = () => {
    installs += 1;
  };
  const states = [];
  const updates = createUpdates(updater, (state) => states.push(state.status));
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.throws(() => updates.install());
  await updates.check();
  assert.equal(downloads, 0);
  assert.deepEqual(updates.getState(), {
    status: "available",
    version: "1.1.0",
  });
  await updates.download();
  assert.equal(downloads, 1);
  assert.equal(installs, 0);
  updates.install();
  assert.equal(installs, 1);
  assert.deepEqual(states, ["available", "downloading", "downloaded"]);
});

test("updater failures are reported without crashing", async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => {
    throw new Error("network unavailable");
  };
  const errors = [];
  const updates = createUpdates(
    updater,
    () => {},
    (...args) => errors.push(args),
  );
  await updates.check();
  assert.equal(updates.getState().status, "error");
  assert.equal(errors.length, 1);
});

test("updater confirms when the installed version is current", async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => updater.emit("update-not-available");
  const updates = createUpdates(updater, () => {});
  await updates.check();
  assert.deepEqual(updates.getState(), {
    status: "current",
    message: "Je gebruikt de nieuwste versie.",
  });
});

test("an empty GitHub release feed is not reported as an update failure", async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => {
    const error = Object.assign(new Error("No published versions on GitHub"), {
      code: "ERR_XML_MISSED_ELEMENT",
    });
    updater.emit("error", error);
    throw error;
  };
  const states = [];
  const errors = [];
  const updates = createUpdates(
    updater,
    (state) => states.push(state),
    (...args) => errors.push(args),
  );
  await updates.check();
  assert.deepEqual(updates.getState(), {
    status: "unreleased",
    message: "Er zijn nog geen updates gepubliceerd.",
  });
  assert.equal(states.length, 1);
  assert.equal(errors.length, 1);
});

test("other missing XML elements remain errors", async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => {
    throw Object.assign(new Error('No element "link"'), {
      code: "ERR_XML_MISSED_ELEMENT",
    });
  };
  const updates = createUpdates(
    updater,
    () => {},
    () => {},
  );
  await updates.check();
  assert.equal(updates.getState().status, "error");
});

test("download errors are not mistaken for an empty release feed", async () => {
  const updater = new EventEmitter();
  updater.downloadUpdate = async () => {
    throw Object.assign(new Error("No published versions on GitHub"), {
      code: "ERR_XML_MISSED_ELEMENT",
    });
  };
  const updates = createUpdates(
    updater,
    () => {},
    () => {},
  );
  updater.emit("update-available", { version: "1.1.0" });
  await updates.download();
  assert.equal(updates.getState().status, "error");
});
