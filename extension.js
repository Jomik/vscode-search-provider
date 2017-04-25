const Lang = imports.lang;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const homePath = GLib.getenv("HOME");

let vscodeSearchProvider = null;
let storage = null;

function getFolderPaths() {
  try {
    const json = JSON.parse(GLib.file_get_contents(storage)[1]);
    return json.openedPathsList.folders;
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
    global.log("_init");
    this.id = 'VSCodeProjects';
    this.appInfo = {
      get_name: function () { return 'vscode-search-provider'; },
      get_icon: function () { return Gio.Icon.new_for_string("visual-studio-code"); },
      get_id: function () { return this.id; }
    };
  },

  getInitialResultSet: function (terms, callback, cancellable) {
    this._results = getFolderPaths().map(pathToResultObject);
    this.getSubsearchResultSet(undefined, terms, callback);
  },

  getSubsearchResultSet: function (previousResults, terms, callback) {
    let search = terms.join(" ").toLowerCase();
    let resultIds = [];
    for (candidate of this._results) {
      if (candidate.name.toLowerCase().indexOf(search) !== -1) {
        resultIds.push(candidate.id);
      }
    }
    callback(resultIds);
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
