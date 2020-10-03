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

import ByteArray = imports.byteArray;
import Gtk = imports.gi.Gtk;
import Gio = imports.gi.Gio;

import ExtensionUtils = imports.misc.extensionUtils;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = ExtensionUtils.getCurrentExtension()!;

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
function init(): void {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildPrefsWidget() {
  const ui = Self.dir.get_child("prefs.xml").get_path();
  if (!ui) {
    throw new Error("Fatal error, failed to find prefs.xml");
  }
  const buildable = Gtk.Builder.new_from_file(ui);
  const box = buildable.get_object<Gtk.Widget>("prefs_widget");

  const settings = ExtensionUtils.getSettings();
  const license = ByteArray.toString(
    Self.dir.get_child("LICENSE").load_contents(null)[1]
  );
  const about_license_buffer = buildable.get_object<Gtk.TextBuffer>(
    "about_license_buffer"
  );
  about_license_buffer.set_text(license, -1);

  const about_version_label = buildable.get_object<Gtk.Label>(
    "about_version_label"
  );
  about_version_label.set_text(`Version ${Self.metadata.version}`);

  settings.bind(
    "show-workspaces",
    buildable.get_object("show_workspaces_switch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-files",
    buildable.get_object("show_files_switch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "search-prefix",
    buildable.get_object("search_prefix_entry"),
    "text",
    Gio.SettingsBindFlags.DEFAULT
  );

  box.show_all();
  return box;
}
