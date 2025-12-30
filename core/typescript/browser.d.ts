/**
 * Browser type declarations for Playwright waitForFunction callbacks
 *
 * These functions execute in the browser context via Playwright's evaluate/waitForFunction.
 * TypeScript doesn't know about DOM types since we're compiling for Node.js.
 *
 * @module browser.d.ts
 */

// Minimal DOM types needed for Playwright browser context callbacks
declare const window: {
  location: {
    href: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
    hostname: string;
  };
};

declare const document: {
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => NodeListOf<Element>;
  getElementById: (id: string) => Element | null;
  createElement: (tagName: string) => Element;
  body: Element;
  documentElement: Element;
};

declare const localStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  length: number;
  key: (index: number) => string | null;
};

declare const sessionStorage: {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  length: number;
  key: (index: number) => string | null;
};

interface Element {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  appendChild: (child: Element) => Element;
  remove: () => void;
  addEventListener: (type: string, listener: EventListener) => void;
  innerHTML: string;
  textContent: string | null;
  className: string;
  style: Record<string, string>;
}

interface EventListener {
  (evt: Event): void;
}

interface Event {
  type: string;
  target: Element | null;
}

interface NodeListOf<TNode> extends ArrayLike<TNode> {
  forEach: (callback: (node: TNode, index: number) => void) => void;
}
