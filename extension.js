const Lang = imports.lang;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const Self = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Self.imports.utils;

const homePath = GLib.getenv("HOME");

let FOLDERS = true;
let FILES = true;

let vscodeSearchProvider = null;
let storage = null;

let desktopAppInfo = Gio.DesktopAppInfo.new("code.desktop");

if (desktopAppInfo === null) {
  desktopAppInfo = Gio.DesktopAppInfo.new("visual-studio-code.desktop");
}

let vscodeIcon;

if (desktopAppInfo !== null) {
  vscodeIcon = desktopAppInfo.get_icon();
}

function debug(message) {		
  global.log("VS Code Search Provider ~ " + message);		
}

function getPaths() {
  function exists(path) {
    return Gio.File.new_for_path(path).query_exists(null);
  }
  
  try {
    const json = JSON.parse(GLib.file_get_contents(storage)[1]);
    
    let folders = [];
    if (FOLDERS) {
      folders = json.openedPathsList.folders;
    }

    let files = [];
    if (FILES) {
      files = json.openedPathsList.files;
    }

    return folders.concat(files).filter(exists);
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

function pathToResultObject(path, index) {
  return {
    id: index + 1,
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
    this.id = 'VSCodeProjects';
    this.appInfo = {
      get_name: function () { return 'vscode-search-provider'; },
      get_icon: function () { return vscodeIcon; },
      get_id: function () { return this.id; }
    };

    this.settings = Utils.getSettings();
    this.settings.connect('changed', Lang.bind(this, this._applySettings));
    this._applySettings();
  },

  _applySettings: function() {
    FOLDERS = this.settings.get_boolean('show-folders');
    FILES = this.settings.get_boolean('show-files');
  },

  getInitialResultSet: function (terms, callback, cancellable) {
    this._results = getPaths().map(pathToResultObject);
    this.getSubsearchResultSet(undefined, terms, callback);
  },

  getSubsearchResultSet: function (previousResults, terms, callback) {
    let search = terms.join(" ").toLowerCase();
    function containsSearch(candidate) {
      return candidate.name.toLowerCase().indexOf(search) !== -1;
    }
    function getId(candidate) {
      return candidate.id;
    };
    callback(this._results.filter(containsSearch).map(getId));
  },

  getResultMetas: function (resultIds, callback) {
    let resultMetas = this._results.filter(function (res) {
      return resultIds.indexOf(res.id) !== -1;
    });
    callback(resultMetas);
  },

  filterResults: function (results, max) {
    return results.slice(0, max);
  },

  activateResult: function (id, terms) {
    let result = this._results.filter(function(res) {
      return res.id === id;
    })[0];
    Util.spawn(["code", result.path]);
  }
});

function init() {
  storage = homePath + "/.config/Code/storage.json";
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
