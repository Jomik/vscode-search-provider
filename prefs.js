const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;

const Self = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Self.imports.utils;

let settings;

function init() {
  settings = Utils.getSettings();
}

function buildPrefsWidget() {
  const buildable = new Gtk.Builder();
  buildable.add_from_file(Self.dir.get_path() + '/prefs.xml');
  const box = buildable.get_object('prefs_widget');

  const version_label = buildable.get_object('version_info');
  version_label.set_text('[VSCode-Search-Provider v' + Self.metadata.version + ']');

  settings.bind('show-folders', buildable.get_object('field_folders'), 'active', Gio.SettingsBindFlags.DEFAULT);
  settings.bind('show-files', buildable.get_object('field_files'), 'active', Gio.SettingsBindFlags.DEFAULT);

  box.show_all();
  return box;
}