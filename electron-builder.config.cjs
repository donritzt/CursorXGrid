const path = require("node:path");
const { parseApiOrigin } = require("./electron/protocol");

module.exports = {
  appId: "com.cursorxgrid.desktop",
  productName: "CursorXGrid",
  artifactName: "CursorXGrid-Setup-${version}-${arch}.${ext}",
  directories: { output: "dist" },
  files: ["electron/**/*", "public/**/*", "package.json"],
  extraMetadata: {
    cursorxgridApiOrigin: parseApiOrigin(process.env.CURSORXGRID_API_URL),
  },
  publish: [{ provider: "github", owner: "donritzt", repo: "CursorXGrid" }],
  win: {
    target: ["nsis"],
    icon: path.join("public", "assets", "app-icon.ico"),
  },
  nsis: {
    perMachine: false,
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
