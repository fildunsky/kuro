"use strict";
const { app, clipboard, dialog, shell } = require("electron");
const os = require("node:os");
const { activate } = require("./win");
const { release } = require("./url");
const { t } = require("./locale");
const file = require("./file");
const { store: settings } = require("./settings");

// Shortcut reference shown from Help: [label key, accelerator].
const KEY_REFERENCE = [
  ["dialog.key.addDueDate", "Ctrl+Shift+T"],
  ["dialog.key.addReminder", "Ctrl+Shift+E"],
  ["dialog.key.setRepeat", "Ctrl+Shift+U"],
  ["dialog.key.addMyDay", "Ctrl+K"],
  ["dialog.key.completeTodo", "Ctrl+Shift+N"],
  ["dialog.key.deleteList", "Ctrl+Shift+D"],
  ["dialog.key.deleteTodo", "Ctrl+D"],
  ["dialog.key.globalCreateTodo", "Ctrl+Alt+C"],
  ["dialog.key.globalSearchTodo", "Ctrl+Alt+F"],
  ["dialog.key.globalToggleWindow", "Ctrl+Alt+A"],
  ["dialog.key.hideTodo", "Ctrl+Shift+H"],
  ["dialog.key.important", "Ctrl+I"],
  ["dialog.key.myDay", "Ctrl+M"],
  ["dialog.key.newList", "Ctrl+L"],
  ["dialog.key.newTodo", "Ctrl+N"],
  ["dialog.key.planned", "Ctrl+P"],
  ["dialog.key.renameList", "Ctrl+Y"],
  ["dialog.key.renameTodo", "Ctrl+T"],
  ["dialog.key.return", "Esc"],
  ["dialog.key.setReminder", "Ctrl+Shift+E"],
  ["dialog.key.settings", "Ctrl+,"],
  ["dialog.key.signOut", "Ctrl+Alt+Q"],
  ["dialog.key.tasks", "Ctrl+J"],
  ["dialog.key.toggleCustomMode", "Ctrl+S"],
  ["dialog.key.toggleDarkTheme", "Ctrl+H"],
  ["dialog.key.toggleSidebar", "Ctrl+B"],
];

class Dialog {
  get _keyReferenceInfo() {
    return KEY_REFERENCE
      .map(([key, accelerator]) => `${t(key)}: ${accelerator}`)
      .join("\n");
  }

  get _systemInfo() {
    return [
      `${t("dialog.info.version")}: ${app.getVersion()}`,
      `Electron: ${process.versions.electron}`,
      `Chrome: ${process.versions.chrome}`,
      `Node: ${process.versions.node}`,
      `V8: ${process.versions.v8}`,
      `${t("dialog.info.os")}: ${os.type()} ${os.arch()} ${os.release()}`,
    ].join("\n");
  }

  get _appVersion() {
    return t("dialog.appVersion", {version: app.getVersion(), arch: os.arch()});
  }

  _keyRef() {
    return this._create({
      buttons: [t("dialog.button.done"), t("dialog.button.copy")],
      detail: `${t("dialog.createdBy", {name: "Greymond"})}\n\n${this._keyReferenceInfo}`,
      message: this._appVersion,
      title: t("dialog.keyRef.title"),
    });
  }

  _about() {
    return this._create({
      buttons: [t("dialog.button.done"), t("dialog.button.copy")],
      detail: `${t("dialog.createdBy", {name: "Klaus Sinani"})}\n\n${this._systemInfo}`,
      message: this._appVersion,
      title: t("dialog.about.title"),
    });
  }

  _create(options) {
    return dialog.showMessageBoxSync(
      Object.assign(
        {
          cancelId: 1,
          defaultId: 0,
          icon: file.icon,
        },
        options,
      ),
    );
  }

  _exit() {
    return this._create({
      buttons: [t("dialog.button.exit"), t("dialog.button.dismiss")],
      detail: t("dialog.exit.detail"),
      message: t("dialog.exit.message"),
      title: t("dialog.exit.title"),
    });
  }

  _signOut() {
    return this._create({
      buttons: [t("dialog.button.signOut"), t("dialog.button.dismiss")],
      detail: t("dialog.signOut.detail"),
      message: t("dialog.signOut.message"),
      title: t("dialog.signOut.title"),
    });
  }

  _restart() {
    return this._create({
      buttons: [t("dialog.button.restart"), t("dialog.button.dismiss")],
      detail: t("dialog.restart.detail"),
      message: t("dialog.restart.message"),
      title: t("dialog.restart.title"),
    });
  }

  _update(version) {
    return this._create({
      buttons: [t("dialog.button.download"), t("dialog.button.dismiss")],
      detail: t("dialog.updateAvailable.detail"),
      message: t("dialog.updateAvailable.message", {version}),
      title: t("dialog.updateAvailable.title"),
    });
  }

  confirmAbout() {
    if (this._about() === 1) {
      clipboard.writeText(this._systemInfo);
    }
  }

  confirmKey() {
    if (this._keyRef() === 1) {
      clipboard.writeText(this._keyReferenceInfo);
    }
  }

  confirmExit() {
    if (settings.get("requestExitConfirmation")) {
      if (this._exit() === 0) {
        app.quit();
      }
    } else {
      app.quit();
    }
  }

  confirmActivationRestart(option, state) {
    if (this._restart() === 0) {
      settings.set(option, state);
      app.quit();
      app.relaunch();
    }
  }

  confirmSignOut() {
    if (this._signOut() === 0) {
      activate("sign-out");
    }
  }

  updateError(content) {
    return dialog.showErrorBox(t("dialog.updateError.title"), content);
  }

  noUpdate() {
    return this._create({
      buttons: [t("dialog.button.done")],
      detail: t("dialog.noUpdate.detail", {version: app.getVersion()}),
      message: t("dialog.noUpdate.message"),
      title: t("dialog.noUpdate.title"),
    });
  }

  getUpdate(version) {
    if (this._update(version) === 0) {
      shell.openExternal(release);
    }
  }
}

module.exports = new Dialog();
