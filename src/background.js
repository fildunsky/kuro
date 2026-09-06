"use strict";
const { colors, scenes } = require("./backgrounds");
const { store: settings } = require("./settings");

// Runs in the renderer (preload). The theme chosen for a list in the theme
// panel is stored under `listThemes[<list key>]` as
//   { kind: "color", value: "<id>", light: bool }
//   { kind: "scene", value: "<id>" }
// and applied as <html data-kuro-background="…" data-kuro-tone="light|dark">
// plus CSS variables, which src/style/list-backgrounds.css picks up.
const ACTIVE_LIST = ".listItem-container.active .listItem";
const MY_DAY_ACTIVE = ".todayToolbar-item.active";

class Background {
  constructor() {
    this._observer = null;
    this._scheduled = false;
    this._listeners = new Set();
  }

  // Stable key of the list on screen: To-Do puts the list id on the active
  // sidebar entry (`inbox`, `important`, or the long id of a custom list).
  currentListKey() {
    if (document.querySelector(MY_DAY_ACTIVE)) {
      return "today";
    }

    const active = document.querySelector(ACTIVE_LIST);
    if (active?.id) {
      return active.id;
    }

    const [, section, key] = window.location.pathname.split("/");
    return section === "tasks" && key && key !== "id" ? key : null;
  }

  currentListTitle() {
    return document.querySelector("#main .listTitle")?.textContent.trim() || "";
  }

  _all() {
    const stored = settings.get("listThemes");
    const themes = stored && typeof stored === "object" ? { ...stored } : {};

    // Migrate the first version of this feature (scene id per list)
    const legacy = settings.get("listBackgrounds");
    if (legacy && typeof legacy === "object") {
      for (const [key, id] of Object.entries(legacy)) {
        if (!themes[key] && scenes.some(x => x.id === id)) {
          themes[key] = { kind: "scene", value: id };
        }
      }

      settings.delete("listBackgrounds");
      settings.set("listThemes", themes);
    }

    return themes;
  }

  current() {
    const key = this.currentListKey();
    return key ? this._all()[key] || null : null;
  }

  onChange(listener) {
    this._listeners.add(listener);
  }

  apply() {
    const theme = this.current();
    const html = document.documentElement;
    const { dataset, style } = html;

    delete dataset.kuroBackground;
    delete dataset.kuroTone;
    style.removeProperty("--kuro-list-bg");

    switch (theme?.kind) {
      case "color": {
        const color = colors.find(x => x.id === theme.value);
        if (color) {
          dataset.kuroBackground = "color";
          dataset.kuroTone = theme.light ? "light" : "dark";
          style.setProperty("--kuro-list-bg", theme.light ? color.light : color.solid);
        }

        break;
      }

      case "scene": {
        const scene = scenes.find(x => x.id === theme.value);
        if (scene) {
          dataset.kuroBackground = scene.id;
          dataset.kuroTone = scene.tone;
        }

        break;
      }

      default:
    }

    for (const listener of this._listeners) {
      listener(theme);
    }
  }

  set(theme) {
    const key = this.currentListKey();
    if (!key) {
      return false;
    }

    const all = this._all();
    if (theme) {
      all[key] = theme;
    } else {
      delete all[key];
    }

    settings.set("listThemes", all);
    this.apply();
    return true;
  }

  // Re-apply whenever the active list changes (To-Do toggles classes in the
  // sidebar and on #app when navigating; there is no navigation event to hook).
  watch() {
    if (this._observer) {
      return;
    }

    this._observer = new MutationObserver(() => {
      if (this._scheduled) {
        return;
      }

      this._scheduled = true;
      requestAnimationFrame(() => {
        this._scheduled = false;
        this.apply();
      });
    });

    this._observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    this.apply();
  }
}

module.exports = new Background();
