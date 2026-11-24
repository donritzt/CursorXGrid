function createUpdates(updater, notify, log = console.error) {
  let state = { status: "idle" };
  let checking = false;
  let lastReportedError;
  const setState = (next) => {
    state = next;
    notify(state);
  };
  const reportError = (error) => {
    lastReportedError = error;
    log("Update mislukt:", error);
    if (
      checking &&
      (error.code === "ERR_UPDATER_NO_PUBLISHED_VERSIONS" ||
        (error.code === "ERR_XML_MISSED_ELEMENT" &&
          error.message === "No published versions on GitHub"))
    ) {
      setState({
        status: "unreleased",
        message: "Er zijn nog geen updates gepubliceerd.",
      });
      return;
    }
    setState({
      status: "error",
      message: "Updatecontrole of downloaden mislukt.",
    });
  };
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.on("update-available", (info) =>
    setState({ status: "available", version: info.version }),
  );
  updater.on("update-not-available", () =>
    setState({ status: "current", message: "Je gebruikt de nieuwste versie." }),
  );
  updater.on("update-downloaded", (info) =>
    setState({ status: "downloaded", version: info.version }),
  );
  updater.on("error", reportError);
  return {
    getState: () => state,
    async check() {
      checking = true;
      lastReportedError = undefined;
      try {
        await updater.checkForUpdates();
      } catch (error) {
        if (error !== lastReportedError) reportError(error);
      } finally {
        checking = false;
      }
    },
    async download() {
      if (state.status !== "available")
        throw new Error("Geen update beschikbaar.");
      setState({ status: "downloading" });
      lastReportedError = undefined;
      try {
        await updater.downloadUpdate();
      } catch (error) {
        if (error !== lastReportedError) reportError(error);
      }
    },
    install() {
      if (state.status !== "downloaded")
        throw new Error("Update is nog niet gedownload.");
      updater.quitAndInstall();
    },
  };
}

module.exports = { createUpdates };
