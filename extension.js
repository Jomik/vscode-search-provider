const ByteArray = imports.byteArray;
const Lang = imports.lang;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const Self = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Self.imports.utils;

const homePath = GLib.getenv("HOME");

let WORKSPACES = true;
let FILES = true;
let SEARCH_PREFIX = "code:";

let vscodeSearchProvider = null;
let storage = null;

let configDirName = "Code";

let desktopAppInfo = Gio.DesktopAppInfo.new("code.desktop");

if (desktopAppInfo === null) {
  desktopAppInfo = Gio.DesktopAppInfo.new("visual-studio-code.desktop");
}

if (desktopAppInfo === null) {
  desktopAppInfo = Gio.DesktopAppInfo.new("vscode_vscode.desktop");
}

if (desktopAppInfo === null) {
  desktopAppInfo = Gio.DesktopAppInfo.new("code_code.desktop");
}

if (desktopAppInfo === null) {
  desktopAppInfo = Gio.DesktopAppInfo.new("vscode-oss.desktop");
  if (desktopAppInfo !== null) {
    configDirName = "Code - OSS";
  }
}

function debug(message) {
  global.log("VS Code Search Provider ~ " + message);
}

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function getPaths() {
  function toPath(uri) {
    if (isString(uri)) {
      if (uri.indexOf('file://') === 0) {
        return uri.substring(7);
      }
      return uri;
    }
    else {
      return uri.configPath;
    }
  }

  function exists(path) {
    return Gio.File.new_for_path(path).query_exists(null);
  }

  try {
    const json = JSON.parse(ByteArray.toString(GLib.file_get_contents(storage)[1]));

    let workspaces = [];
    if (WORKSPACES) {
      workspaces = json.openedPathsList.workspaces3 || json.openedPathsList.workspaces2 || json.openedPathsList.workspaces || [];
    }

    let files = [];
    if (FILES) {
      files = json.openedPathsList.files2 || json.openedPathsList.files || [];
    }

    return workspaces.concat(files).map(toPath).filter(exists);
  } catch (e) {
    return [];
  }
}

function projectNameFromPath(path) {
  let name = path.split('\\').pop().split('/').pop();
  return name;
}

function fullPath(path) {
  return path.startsWith(homePath)
    ? "~" + path.slice(homePath.length)
    : path;
}

function pathToResultObject(path) {
  return {
    id: `vscode-${fullPath(path)}`,
    name: projectNameFromPath(path),
    description: fullPath(path),
    path: path,
    createIcon: function (size) {
    }
  }
}

const VSCodeSearchProvider = new Lang.Class({
  Name: 'VS Code Search Provider',

  _init: function () {
    if (desktopAppInfo !== null) {
      // Pretend that this is Code
      this.appInfo = desktopAppInfo;
    } else {
      // Fallback to minimal app info if we haven't found the code desktop app
      this.appInfo = {
        get_name: function () { return 'vscode-search-provider'; },
        get_icon: function () { },
        get_id: function () { return 'VSCodeProjects'; }
      };
    }

    this.settings = Utils.getSettings();
    this.settings.connect('changed', Lang.bind(this, this._applySettings));
    this._applySettings();
  },

  _applySettings: function () {
    WORKSPACES = this.settings.get_boolean('show-workspaces');
    FILES = this.settings.get_boolean('show-files');
    SEARCH_PREFIX = this.settings.get_string('search-prefix');
  },

  getInitialResultSet: function (terms, callback, cancellable) {
    this._results = getPaths().map(pathToResultObject);
    this.getSubsearchResultSet(undefined, terms, callback);
  },

  getSubsearchResultSet: function (previousResults, terms, callback) {
    let search = terms.join(" ").toLowerCase();

    if (search.startsWith(SEARCH_PREFIX)) {
      search = search.replace(SEARCH_PREFIX, "");
    }

    function containsSearch(candidate) {
      return candidate.path.toLowerCase().indexOf(search) !== -1;
    }
    function getId(candidate) {
      return candidate.id;
    };
    callback(this._results.filter(containsSearch).map(getId));
  },

  getResultMetas: function (resultIds, callback) {
    const resultMetas = this._results.filter(function (res) {
      return resultIds.indexOf(res.id) !== -1;
    });
    callback(resultMetas);
  },

  filterResults: function (results, max) {
    return results.slice(0, max);
  },

  activateResult: function (id, terms) {
    const result = this._results.filter(function (res) {
      return res.id === id;
    })[0];
    launchVSCode(result.path);
  },

  launchSearch: function () {
    launchVSCode();
  },
});

function launchVSCode(path) {
  if (desktopAppInfo !== null) {
    try {
      const files = path ? [Gio.File.new_for_path(path)] : [];
      desktopAppInfo.launch(files, null);
    } catch (err) {
      Main.notifyError('Failed to launch Code', err.message);
    }
  } else {
    // If we have no desktop app, fall back to the code binary
    const command = path ? ["code", path] : [code];
    Util.spawn(command);
  }
}

function init() {
  storage = homePath + "/.config/" + configDirName + "/storage.json";
}

function enable() {
  if (!vscodeSearchProvider) {
    vscodeSearchProvider = new VSCodeSearchProvider();
    Main.overview.viewSelector._searchResults._registerProvider(vscodeSearchProvider);
  }
}

function disable() {
  if (vscodeSearchProvider) {
    Main.overview.viewSelector._searchResults._unregisterProvider(vscodeSearchProvider);
    vscodeSearchProvider = null;
  }
}
