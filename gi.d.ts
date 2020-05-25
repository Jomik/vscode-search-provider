// Copyright (c) 2019 Sebastian Wiesner <sebastian@swsnr.de>

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

declare namespace imports {
  class ByteArray {
    private constructor();
  }

  namespace byteArray {
    function toString(array: ByteArray): string;
  }

  namespace gi {
    namespace GLib {
      /**
       * https://gjs-docs.gnome.org/glib20~2.60.1/glib.get_user_config_dir
       */
      function get_user_config_dir(): string;
    }

    namespace Gio {
      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file
       */
      class File {
        private constructor();

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#function-new_for_uri
         */
        static new_for_uri(uri: string): File;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#function-new_for_path
         */
        static new_for_path(path: string): File;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_child
         */
        get_child(name: string): File;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_basename
         */
        get_basename(): string | null;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_parse_name
         */
        get_parse_name(): string;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-get_path
         */
        get_path(): string | null;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.file#method-load_contents
         */
        load_contents(
          cancellable: Cancellable | null
        ): [boolean, ByteArray, string];
      }

      class Cancellable {}

      type SubprocessFlags = number;

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocessflags
       */
      namespace SubprocessFlags {
        const STDOUT_PIPE: SubprocessFlags;
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.asyncresult
       */
      class AsyncResult {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess
       */
      export class Subprocess {
        constructor(args: {
          argv: ReadonlyArray<string>;
          flags: SubprocessFlags;
        });

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.initable#method-init
         */
        init(cancellable: Cancellable | null): boolean;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess#method-communicate_utf8_async
         */
        communicate_utf8_async(
          input: string | null,
          cancellable: Cancellable | null,
          callback: (process: Subprocess, result: AsyncResult) => void
        ): void;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.subprocess#method-communicate_utf8_finish
         */
        communicate_utf8_finish(result: AsyncResult): [boolean, string, string];
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.applaunchcontext
       */
      class AppLaunchContext {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.icon
       */
      class Icon {
        private constructor();
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo
       */
      class AppInfo {
        protected constructor();

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-get_name
         */
        get_name(): string;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-get_icon
         */
        get_icon(): Icon | null;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.appinfo#method-launch
         */
        launch(files: File[], context: AppLaunchContext | null): boolean;
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.desktopappinfo
       */
      export class DesktopAppInfo extends AppInfo {
        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.desktopappinfo#constructor-new
         */
        static new(desktop_id: string): DesktopAppInfo | null;
      }

      /**
       * https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings
       */
      export class GSettings {
        private constructor();

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings#method-get_string
         */
        get_string(key: string): string;

        /**
         * https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings#method-get_boolean
         */
        get_boolean(key: string): boolean;
      }
    }

    /**
     * Shell toolkit.
     */
    namespace St {
      export class Icon {
        constructor(props: { gicon: Gio.Icon; icon_size: number });
      }
    }
  }
}
