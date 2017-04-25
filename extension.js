const Lang = imports.lang;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const homePath = GLib.getenv("HOME");

var vscodeSearchProvider = null;
var storage = null;

function debug(message) {
  global.log("VS Code Search Provider ~ " + message);
}

function getFolderPaths() {
  let json = null;
  try {
    json = JSON.parse(GLib.file_get_contents(storage)[1]);
  } catch (e) {
    // Return empty array.
  }

  if (json) {
    json = json["openedPathsList"];
    if (json) {
      json = json["folders"];
      if (json) {
        debug("getFolderPaths = " + json);
        return json;
      }
    }
  }
  debug("getFolderPaths = " + json);
  return [];
}

function projectNameFromPath(path) {
  let name = path.split('\\').pop().split('/').pop();
  debug("projectNameFromPath: " + path + " -> " + name);
  return name;
}

function fullPath(path) {
  return path.startsWith(homePath)
    ? "~" + path.slice(homePath.length)
    : path;
}

function pathToResultObject(path, index) {
  debug("pathToResultObject(" + index + 1 + "): " + path)
  return {
    'id': index + 1,
    'name': projectNameFromPath(path),
    'description': fullPath(path),
    'path': path,
    'createIcon': function (size) {
      debug("Icon for " + projectNameFromPath(path));
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
      get_icon: function () { return Gio.icon_new_for_string("/usr/share/icons/visual-studio-code.png"); },
      get_id: function () { return this.id; }
    };
  },

  getInitialResultSet: function (terms, callback, cancellable) {
    debug("getInitialResultSet: " + terms);
    let search = terms.join(" ").toLowerCase();
    this._results = getFolderPaths().map(pathToResultObject);
    this._resultIds = [];
    for (candidate of this._results) {
      if (candidate.name.toLowerCase().indexOf(search) !== -1) {
        this._resultIds.push(candidate.id);
      }
    }
    debug("Found [" + this._resultIds + "] for " + search);
    return callback(this._resultIds);
  },

  getSubsearchResultSet: function (previousResults, terms, callback, cancellable) {
    debug("getSubsearchResultSet");
    this.getInitialResultSet(terms, callback, cancellable);
  },

  getResultMetas: function (resultIds, callback) {
    let resultMetas = this._results.filter(function (res) {
      return resultIds.indexOf(res.id) !== -1;
    });
    debug("getResultMetas: " + resultMetas);
    callback(resultMetas);
  },

  filterResults: function (results, max) {
    return results.slice(0, max);
  },

  activateResult: function (id, terms) {
    debug("activateResult id: " + id);
    debug("activateResult terms: " + terms.join(" "));
  }
});

function init() {
  storage = homePath + "/.config/Code/storage.json";
  global.log("init");
}

function enable() {
  if (!vscodeSearchProvider) {
    global.log("enabled");
    vscodeSearchProvider = new VSCodeSearchProvider();
    Main.overview.viewSelector._searchResults._registerProvider(vscodeSearchProvider);
  }
}

function disable() {
  if (vscodeSearchProvider) {
    global.log("disabled");
    Main.overview.viewSelector._searchResults._unregisterProvider(vscodeSearchProvider);
    vscodeSearchProvider = null;
  }
}
