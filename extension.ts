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

import ByteArray = imports.byteArray;
import GLib = imports.gi.GLib;
import Gio = imports.gi.Gio;
import St = imports.gi.St;

import Main = imports.ui.main;
import ExtensionUtils = imports.misc.extensionUtils;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const Self = ExtensionUtils.getCurrentExtension()!;

const l = {
  /**
   * Log a message from this extension.
   *
   * @param message The message to log
   */
  info: (message: string): void => log(`${Self.metadata.name}: ${message}`),

  /**
   * Log an error message from this extension.
   *
   * @param message The message to log
   */
  error: (message: string): void =>
    logError(`${Self.metadata.name}: ${message}`),
};

interface CodeAppInfo {
  /**
   * The desktop app providing code.
   */
  readonly app: Gio.DesktopAppInfo;

  /**
   * The name of the configuration directory of this code app.
   */
  readonly configDirectoryName: string;
}

const findVSCode = (): CodeAppInfo | null => {
  const candidates = [
    // Standard Code OSS build on Arch Linux.
    ["code-oss.desktop", "Code - OSS"],
    // Code OSS build on Solus Linux, see <https://github.com/Jomik/vscode-search-provider/pull/10>
    ["vscode-oss.desktop", "Code - OSS"],
    // Offical VSCode snap, see <https://github.com/Jomik/vscode-search-provider/pull/14>
    // and <https://snapcraft.io/code>
    ["code_code.desktop", "Code"],
    // VSCodium support, Free/Libre Open Source Software Binaries of VSCode.
    // See <https://vscodium.com/> for explanations
    // PR: https://github.com/Jomik/vscode-search-provider/pull/30
    ["codium.desktop", "VSCodium"],
    // TODO: Figure out what systems these desktop files are from.
    ["code.desktop", "Code"],
    ["visual-studio-code.desktop", "Code"],
  ];
  for (const [desktopId, configDirectoryName] of candidates) {
    const app = Gio.DesktopAppInfo.new(desktopId);
    if (app) {
      l.info(`Found code at desktop app ${desktopId}`);
      return {
        app,
        configDirectoryName,
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
const launchVSCodeInShell = (vscode: Gio.AppInfo, files?: Gio.File[]): void => {
  try {
    vscode.launch(files || [], null);
  } catch (err) {
    const stack = err.stack || "<no stacktrace>";
    l.error(`Failed to lauch VSCode: ${err.message}\n${stack}`);
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
  readonly file: Gio.File;

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
  Array.from(items.values()).filter((item) => identifiers.includes(item.id));

/**
 * Whether an item matches all of the given terms.
 *
 * @param item The item
 * @param terms All terms to look for
 */
const recentItemMatchesTerms = (
  item: RecentItem,
  terms: ReadonlyArray<string> | null
): boolean =>
  terms !== null &&
  terms.every((t) => item.name.includes(t) || item.readablePath.includes(t));

/**
 * Find all items which match all of the given terms and have a kind contained in `kinds`.
 *
 * @param items Recent items
 * @param terms Terms to look for
 * @param kinds Item kinds to filter by
 * @returns The IDs of all matching items, or an empty array if terms is empty
 */
const findMatchingItems = (
  items: ReadonlyArray<RecentItem>,
  terms: ReadonlyArray<string> | null,
  kinds: ReadonlyArray<RecentItemKind>
): string[] =>
  items
    .filter(
      (item) => recentItemMatchesTerms(item, terms) && kinds.includes(item.kind)
    )
    .map((item) => item.id);

/**
 * Get a list of all enabled item kinds from the given settings.
 */
const getEnabledKinds = (
  settings: Gio.GSettings
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
 * Get the search prefix set in the given settings.
 */
const getPrefix = (settings: Gio.GSettings): string =>
  settings.get_string("search-prefix");

/**
 * Check search terms against a user-specified search prefix.
 *
 * `terms` match the given `prefix` if the prefix is empty or if the first term
 * starts with `prefix`.  If terms match the prefix return `terms` with `prefix`
 * removed from the first term, otherwise return `null`.
 *
 * @param terms
 * @param prefix
 * @returns `terms` without `prefix`, or null if terms didn't match prefix
 */
const checkAndRemovePrefix = (
  terms: ReadonlyArray<string>,
  prefix: string | null | undefined
): ReadonlyArray<string> | null => {
  if (!prefix) {
    // There's no prefix so just return the terms unchanged
    return terms;
  } else {
    if (0 < terms.length && terms[0].startsWith(prefix)) {
      // The prefix matches, so remove it from the first term
      const head = terms[0].substring(prefix.length);
      const tail = terms.slice(1);
      return head ? [head, ...tail] : tail;
    } else {
      // Prefix doesn't match
      return null;
    }
  }
};

/**
 * Create a function to turn a recent item into a search provider result meta object.
 *
 * @param vscode The vscode app providing the icon
 */
const resultMetaOfRecentItem = (vscode: Gio.DesktopAppInfo) => (
  item: RecentItem
): ResultMeta => ({
  id: item.id,
  name: item.name,
  description: item.readablePath,
  createIcon: (size): St.Icon | null => {
    const gicon = vscode.get_icon();
    if (gicon) {
      return new St.Icon({
        gicon,
        icon_size: size,
      });
    } else {
      return null;
    }
  },
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
  vscode: Gio.DesktopAppInfo,
  settings: Gio.GSettings,
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
        checkAndRemovePrefix(terms, getPrefix(settings)),
        getEnabledKinds(settings)
      )
    ),
  getSubsearchResultSet: (current, terms, callback): void =>
    callback(
      findMatchingItems(
        lookupRecentItems(items, current),
        checkAndRemovePrefix(terms, getPrefix(settings)),
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
  filterResults: (results, max): string[] => results.slice(0, max),
});

/**
 * Create a recent item from a URI.
 *
 * @param kind The kind of the new item
 * @param uri The URI of the new item
 * @returns The recent item for the URI
 */
const createRecentItem = (kind: RecentItemKind, uri: string): RecentItem => {
  const file = Gio.File.new_for_uri(uri);
  return {
    id: `vscode-search-provider-${uri}`,
    // TODO: Check the outcome of get_basename on file URIs
    name: file.get_basename() || `<unnamed ${kind}>`,
    // TODO: Test what this parse name thing actually is
    readablePath: file.get_parse_name(),
    kind,
    file,
  };
};

/**
 * A type predicate to check that an object has a certain property.
 *
 * See https://fettblog.eu/typescript-hasownproperty/, works around the fact that
 * "in" is no type predicate currently.
 *
 * @param obj The object to check
 * @param prop The property to look for
 */
const hasOwnProperty = <X extends unknown, Y extends PropertyKey>(
  obj: X,
  prop: Y
): obj is X & Record<Y, unknown> =>
  Object.prototype.hasOwnProperty.call(obj, prop);

/**
 * Convert any workspace item objects to URIs.
 *
 * @param item The workspace item from storage.json
 * @returns The URI for the workspace
 */
const parseWorkspaceItem = (item: unknown): string | null => {
  if (typeof item === "string") {
    return item;
  } else if (
    item &&
    typeof item === "object" &&
    hasOwnProperty(item, "configURIPath") &&
    typeof item.configURIPath === "string"
  ) {
    return item.configURIPath;
  } else {
    l.error(`Failed to parse workspace item: ${JSON.stringify(item)}`);
    return null;
  }
};

interface MaybeOpenedPathsList {
  readonly workspaces?: unknown;
  readonly workspaces2?: unknown;
  readonly workspaces3?: unknown;
  readonly entries?: unknown;
  readonly files?: unknown;
  readonly files2?: unknown;
}

const getRecentItemsFromStorage = (
  storage: unknown
): ReadonlyArray<RecentItem> => {
  const openedPathsList =
    storage &&
    typeof storage === "object" &&
    hasOwnProperty(storage, "openedPathsList") &&
    typeof storage.openedPathsList === "object"
      ? (storage.openedPathsList as MaybeOpenedPathsList)
      : undefined;

  if (typeof openedPathsList === "undefined") {
    l.error(
      `Failed to find openedPathsList in storage: ${JSON.stringify(storage)}`
    );
    return [];
  }

  const workspaceItems =
    openedPathsList.workspaces3 ||
    openedPathsList.workspaces2 ||
    openedPathsList.workspaces;

  const recentItems: RecentItem[] = [];
  if (workspaceItems && Array.isArray(workspaceItems)) {
    for (const item of workspaceItems) {
      const uri = parseWorkspaceItem(item);
      if (uri) {
        recentItems.push(createRecentItem("workspace", uri));
      }
    }
  }

  const recentFiles = openedPathsList.files2 || openedPathsList.files;
  if (recentFiles && Array.isArray(recentFiles)) {
    for (const item of recentFiles) {
      if (typeof item === "string") {
        recentItems.push(createRecentItem("file", item));
      } else {
        l.error(`Failed to parse recent file: ${JSON.stringify(item)}`);
      }
    }
  }

  const entries = openedPathsList.entries;
  if (entries && Array.isArray(entries)) {
    for (const item of entries) {
      if (item && typeof item.folderUri === "string") {
        recentItems.push(createRecentItem("workspace", item.folderUri));
      } else if (item && typeof item.fileUri === "string") {
        recentItems.push(createRecentItem("file", item.fileUri));
      } else {
        l.error(`Failed to parse recent path: ${JSON.stringify(item)}`);
      }
    }
  }

  return recentItems;
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
  new Promise((resolve) => {
    // TODO: Use async load contents for async IO, to avoid blocking the shell
    const contents = Gio.File.new_for_path(GLib.get_user_config_dir())
      .get_child(configDirectoryName)
      .get_child("storage.json")
      .load_contents(null)[1];

    const recentItems = getRecentItemsFromStorage(
      JSON.parse(ByteArray.toString(contents)) as unknown
    );

    resolve(new Map(recentItems.map((item) => [item.id, item])));
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
    .then((items) => {
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
    .catch((error) => {
      const stack = error.stack || "<no stacktrace>";
      l.error(
        `Failed to get recent VSCode entries: ${error.message}\n${stack}`
      );
      Main.notifyError("Failed to get recent VSCode entries", error.message);
    });
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
