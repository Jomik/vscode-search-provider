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

const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = ExtensionUtils.getCurrentExtension()!;

/**
 * Log a message from this extension.
 *
 * @param message The message to log
 */
const l = (message: string): void => log(`${Self.metadata.name}: ${message}`);

interface CodeAppInfo {
  /**
   * The desktop app providing code.
   */
  readonly app: imports.gi.Gio.DesktopAppInfo;

  /**
   * The name of the configuration directory of this code app.
   */
  readonly configDirectoryName: string;
}

const findVSCode = (): CodeAppInfo | null => {
  const candidates = [
    ["code.desktop", "Code"],
    ["visual-studio-code.desktop", "Code"],
    ["code_code.desktop", "Code"],
    ["vscode-oss.desktop", "Code - OSS"]
  ];
  for (const [desktopId, configDirectoryName] of candidates) {
    const app = Gio.DesktopAppInfo.new(desktopId);
    if (app) {
      l(`Found code at desktop app ${desktopId}`);
      return {
        app,
        configDirectoryName
      };
    }
  }
  return null;
};

/**
 * Launch VSCode in Gnome shell.
 *
 * On failure show an error notification.
 *
 * @param vscode The vscode app
 * @param files The file to launch vscode with
 */
const launchVSCodeInShell = (
  vscode: imports.gi.Gio.AppInfo,
  files?: imports.gi.Gio.File[]
): void => {
  try {
    vscode.launch(files || [], null);
  } catch (err) {
    Main.notifyError("Failed to launch VSCode", err.message);
  }
};

type RecentItemKind = "workspace" | "file";

/**
 * A VSCode recent item.
 */
interface RecentItem {
  /**
   * The ID of this item.
   */
  readonly id: string;

  /**
   * The name of this item.
   */
  readonly name: string;

  /**
   * The shortened readable path of this item.
   */
  readonly readablePath: string;

  /**
   * The absolute path of this item.
   */
  readonly file: imports.gi.Gio.File;

  /**
   * The kind of this item.
   */
  readonly kind: RecentItemKind;
}

type RecentItems = ReadonlyMap<string, RecentItem>;

/**
 * Lookup recent items by their identifiers.
 *
 * @param items Recent items
 * @param identifiers Identifiers to look for
 * @returns All items from `items` with any of the given `identifiers`.
 */
const lookupRecentItems = (
  items: RecentItems,
  identifiers: ReadonlyArray<string>
): RecentItem[] =>
  Array.from(items.values()).filter(item => identifiers.includes(item.id));

/**
 * Whether an item matches all of the given terms.
 *
 * @param item The item
 * @param terms All terms to look for
 */
const recentItemMatchesTerms = (
  item: RecentItem,
  terms: ReadonlyArray<string>
): boolean =>
  terms.every(t => item.name.includes(t) || item.readablePath.includes(t));

/**
 * Find all items which match all of the given terms and have a kind contained in `kinds`.
 *
 * @param items Recent items
 * @param terms Terms to look for
 * @param kinds Item kinds to filter by
 * @returns The IDs of all matching items
 */
const findMatchingItems = (
  items: ReadonlyArray<RecentItem>,
  terms: ReadonlyArray<string>,
  kinds: ReadonlyArray<RecentItemKind>
): string[] =>
  items
    .filter(
      item => recentItemMatchesTerms(item, terms) && kinds.includes(item.kind)
    )
    .map(item => item.id);

/**
 * Get a list of all enabled item kinds from the given settings.
 */
const getEnabledKinds = (
  settings: imports.gi.Gio.GSettings
): ReadonlyArray<RecentItemKind> => {
  const kinds: RecentItemKind[] = [];
  if (settings.get_boolean("show-workspaces")) {
    kinds.push("workspace");
  }
  if (settings.get_boolean("show-files")) {
    kinds.push("file");
  }
  return kinds;
};

/**
 * Create a function to turn a recent item into a search provider result meta object.
 *
 * @param vscode The vscode app providing the icon
 */
const resultMetaOfRecentItem = (vscode: imports.gi.Gio.DesktopAppInfo) => (
  item: RecentItem
): ResultMeta => ({
  id: item.id,
  name: item.name,
  description: item.readablePath,
  createIcon: (size): imports.gi.St.Icon | null => {
    const gicon = vscode.get_icon();
    if (gicon) {
      return new St.Icon({
        gicon,
        // eslint-disable-next-line @typescript-eslint/camelcase
        icon_size: size
      });
    } else {
      return null;
    }
  }
});

/**
 * Create a search provider for the given VSCode and its given recent items.
 *
 * @param vscode The VSCode app
 * @param settings Settings of this extension
 * @param items All recent items of VSCode.
 * @returns A search provider which exposes the given items.
 */
const createProvider = (
  vscode: imports.gi.Gio.DesktopAppInfo,
  settings: imports.gi.Gio.GSettings,
  items: RecentItems
): SearchProvider => ({
  id: Self.uuid,
  canLaunchSearch: true,
  isRemoteProvider: false,
  appInfo: vscode,
  getInitialResultSet: (terms, callback): void =>
    callback(
      findMatchingItems(
        Array.from(items.values()),
        terms,
        getEnabledKinds(settings)
      )
    ),
  getSubsearchResultSet: (current, terms, callback): void =>
    callback(
      findMatchingItems(
        lookupRecentItems(items, current),
        terms,
        getEnabledKinds(settings)
      )
    ),
  getResultMetas: (ids, callback): void =>
    callback(lookupRecentItems(items, ids).map(resultMetaOfRecentItem(vscode))),
  launchSearch: (): void => launchVSCodeInShell(vscode),
  activateResult: (id): void => {
    const item = items.get(id);
    if (item) {
      launchVSCodeInShell(vscode, [item.file]);
    }
  },
  filterResults: (results, max): string[] => results.slice(0, max)
});

/**
 * Create a recent item from a URI.
 *
 * @param kind The kind of the new item
 * @returns The recent item for the URI
 */
const createRecentItem = (kind: RecentItemKind) => (
  uri: string
): RecentItem => {
  const file = Gio.File.new_for_uri(uri);
  return {
    id: `vscode-search-provider-${uri}`,
    // TODO: Check the outcome of get_basename on file URIs
    name: file.get_basename() || `<unnamed ${kind}>`,
    // TODO: Test what this parse name thing actually is
    readablePath: file.get_parse_name(),
    kind,
    file
  };
};

/**
 * Find recent items from VSCode.
 *
 * @param configDirectoryName The name of the config directory of the code app
 * @returns A promise with recent items
 */
const findVSCodeRecentItems = (
  configDirectoryName: string
): Promise<RecentItems> =>
  new Promise(resolve => {
    // TODO: Use async load contents for async IO, to avoid blocking the shell
    const contents = Gio.File.new_for_path(GLib.get_user_config_dir())
      .get_child(configDirectoryName)
      .get_child("storage.json")
      .load_contents(null)[1];

    const storage = JSON.parse(ByteArray.toString(contents));

    const recentWorkspaceURIs: string[] =
      storage.openedPathsList.workspaces3 ||
      storage.openedPathsList.workspaces2 ||
      storage.openedPathsList.workspaces ||
      [];
    const recentFileURIs: string[] =
      storage.openedPathsList.files2 || storage.openedPathsList.files || [];

    const recentItems = recentWorkspaceURIs
      .map(createRecentItem("workspace"))
      .concat(recentFileURIs.map(createRecentItem("file")));

    resolve(new Map(recentItems.map(item => [item.id, item])));
  });

/**
 * The registered provider
 */
// eslint-disable-next-line immutable/no-let
let registeredProvider: "unregistered" | "registering" | SearchProvider =
  "unregistered";

/**
 * Initialize this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
function init(): void {}

/**
 * Register a search provider for VSCode.
 *
 * @param vscode The VSCode app
 * @returns A promise which resolves once the provider is registered.
 */
const registerProvider = (vscode: CodeAppInfo): Promise<void> => {
  registeredProvider = "registering";
  return findVSCodeRecentItems(vscode.configDirectoryName)
    .then(items => {
      // If the user hasn't disabled the extension meanwhile create the
      // search provider and registered it, both in our global variable
      // and for gnome shell.
      if (registeredProvider === "registering") {
        registeredProvider = createProvider(
          vscode.app,
          ExtensionUtils.getSettings(),
          items
        );
        Main.overview.viewSelector._searchResults._registerProvider(
          registeredProvider
        );
      }
    })
    .catch(error =>
      Main.notifyError("Failed to get recent VSCode entries", error.message)
    );
};

/**
 * Enable this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function enable(): void {
  if (registeredProvider === "unregistered") {
    const vscode = findVSCode();
    if (vscode) {
      registerProvider(vscode);
    } else {
      Main.notifyError(
        "VSCode not found",
        "Try installing VSCode or VSCode OSS."
      );
    }
  }
}

/**
 * Disable this extension.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function disable(): void {
  if (typeof registeredProvider !== "string") {
    Main.overview.viewSelector._searchResults._unregisterProvider(
      registeredProvider
    );
  }
  // Make sure to always switch back to unregistered, so that the user can re-enable it.
  registeredProvider = "unregistered";
}
