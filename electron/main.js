const path = require("node:path");
const {
  app,
  BrowserWindow,
  ipcMain,
  net,
  protocol,
  shell,
  session,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const {
  APP_ORIGIN,
  createProtocolHandler,
  parseApiOrigin,
} = require("./protocol");
const { createUpdates } = require("./updates");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "trendstype",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

if (process.platform === "win32")
  app.setAppUserModelId("com.trendstype.desktop");

let mainWindow;
let updates;

function isAppPage(url) {
  return url === `${APP_ORIGIN}/` || url === `${APP_ORIGIN}/index.html`;
}

function requireAppSender(event) {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame ||
    !isAppPage(event.senderFrame.url)
  ) {
    throw new Error("Ongeldige afzender.");
  }
}

app
  .whenReady()
  .then(async () => {
    const configuredOrigin = app.isPackaged
      ? require("../package.json").trendstypeApiOrigin
      : process.env.TRENDSTYPE_API_URL;
    const apiOrigin = parseApiOrigin(configuredOrigin);
    protocol.handle(
      "trendstype",
      createProtocolHandler({
        publicDir: path.join(__dirname, "..", "public"),
        apiOrigin,
        fetch: net.fetch,
      }),
    );
    session.defaultSession.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 360,
      minHeight: 500,
      fullscreen: true,
      icon: path.join(__dirname, "..", "public", "assets", "app-icon.ico"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    mainWindow.webContents.on("before-input-event", (event, input) => {
      if (
        input.type === "keyDown" &&
        input.key === "Escape" &&
        input.shift &&
        !input.control &&
        !input.alt &&
        !input.meta
      ) {
        event.preventDefault();
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
      }
    });
    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (!isAppPage(url)) event.preventDefault();
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url === "https://github.com/donritzt") {
        shell
          .openExternal(url)
          .catch((error) =>
            console.error("Externe link openen mislukt:", error),
          );
      }
      return { action: "deny" };
    });

    updates = createUpdates(autoUpdater, (state) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send("updates:changed", state);
    });
    for (const [channel, action] of [
      ["updates:state", () => updates.getState()],
      ["updates:download", () => updates.download()],
      ["updates:install", () => updates.install()],
    ]) {
      ipcMain.handle(channel, (event) => {
        requireAppSender(event);
        return action();
      });
    }
    await mainWindow.loadURL(`${APP_ORIGIN}/`);
    if (app.isPackaged) void updates.check();
  })
  .catch((error) => {
    console.error("TrendsType desktop kon niet worden gestart:", error);
    app.quit();
  });

app.on("window-all-closed", () => app.quit());
