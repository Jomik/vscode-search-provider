const Lang  = imports.lang;
const Main  = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

var vscodeSearchProvider = null;
var storage = null;

function debug(message) {
  global.log("VS Code Search Provider ~ " + message);
}

function getFolders() {
  let json = null;
  try {
    json = JSON.parse(GLib.file_get_contents(storage)[1]);
  } catch(e) {
    // Return empty array.
  }
  
  if (json) {
    json = json["openedPathsList"];
    if (json) {
      json = json["folders"];
      if (json) {
        return json;
      }
    }
  }
  return [];
}

const VSCodeSearchProvider = new Lang.Class({
  Name: 'VS Code Search Provider',
  
  _init: function() {
    global.log("_init");
  },
  
  getInitialResultSet: function(terms, callback, cancellable) {
    debug("getInitialResultSet: " + terms.join(" "));
  },
  
  activateResult: function(id, terms) {
    debug("activateResult id: " + id);
    debug("activateResult terms: " + terms.join(" "));
  }
});

function init() {
  storage = GLib.getenv("HOME") + "/.config/Code/storage.json";
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