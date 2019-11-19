// Copyright (c) 2019 Sebastian Wiesner <sebastian@swsnr.de>
// Copyright (c) 2017 Jonas Damtoft

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Kept as Javascript, because typescript doesn't matter much here, and
// converting multiple files to Typescript introduces scoping issues on
// top-level, because typescript considers all files as single project with one
// common top scope.  Hence we can't redefine imports, etc.

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Self = ExtensionUtils.getCurrentExtension();

// eslint-disable-next-line no-unused-vars
function init() {}

// eslint-disable-next-line no-unused-vars
function buildPrefsWidget() {
  const settings = ExtensionUtils.getSettings();
  const buildable = new Gtk.Builder();
  buildable.add_from_file(Self.dir.get_child("prefs.xml").get_path());
  const box = buildable.get_object("prefs_widget");

  const version_label = buildable.get_object("version_info");
  version_label.set_text(`[VSCode-Search-Provider v${Self.metadata.version}]`);

  settings.bind(
    "show-workspaces",
    buildable.get_object("field_workspaces"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-files",
    buildable.get_object("field_files"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );

  box.show_all();
  return box;
}
