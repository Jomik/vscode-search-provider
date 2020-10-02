// Copyright (c) Sebastian Wiesner <sebastian@swsnr.de>

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
  namespace gi {
    /**
     * Shell toolkit.
     */
    namespace Gtk {
      export class Widget extends GObject.Object {
        /**
         * https://gjs-docs.gnome.org/gtk30~3.24.22/gtk.widget#method-show_all
         */
        show_all(): void;
      }

      export class Label extends Widget {
        /**
         * https://gjs-docs.gnome.org/gtk30~3.24.22/gtk.label#method-set_text
         */
        set_text(str: string): void;
      }

      export class TextBuffer extends GObject.Object {
        /**
         * https://gjs-docs.gnome.org/gtk30~3.24.22/gtk.textbuffer#method-set_text
         */
        set_text(text: string, len: number): void;
      }

      export class Builder extends GObject.Object {
        constructor();

        /**
         * https://gjs-docs.gnome.org/gtk30~3.24.22/gtk.builder#constructor-new_from_file
         */
        static new_from_file(path: string): Gtk.Builder;

        /**
         * https://gjs-docs.gnome.org/gtk30~3.24.22/gtk.builder#method-get_object
         */
        get_object<T extends GObject.Object>(name: string): T;
      }
    }
  }
}
