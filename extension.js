const Lang  = imports.lang;
const Main  = imports.ui.main;
const GLib = imports.gi.GLib;
const Json = imports.gi.Json;

var vscodeSearchProvider = null;
var storage = null;

function debug(message) {
  global.log("VS Code Search Provider ~ " + message);
}

const VSCodeSearchProvider = new Lang.Class({
  Name: 'VS Code Search Provider',
  
  _init: function() {
    global.log("_init")
    this.parser = Json.json_parser_new();
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
    //Main.overview.addSearchProvider(windowSearchProvider);
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