const path = require("node:path");
const { parseApiOrigin } = require("./electron/protocol");

module.exports = {
  appId: "com.trendstype.desktop",
  productName: "TrendsType",
  artifactName: "TrendsType-Setup-${version}-${arch}.${ext}",
  directories: { output: "dist" },
  files: ["electron/**/*", "public/**/*", "package.json"],
  extraMetadata: {
    trendstypeApiOrigin: parseApiOrigin(process.env.TRENDSTYPE_API_URL),
  },
  publish: [{ provider: "github", owner: "donritzt", repo: "TrendsType" }],
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
