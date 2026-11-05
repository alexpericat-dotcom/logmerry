import { JSDOM } from "jsdom";

/** Installe un navigateur factice (jsdom) sur `globalThis` : à importer en premier par un test de composant. */
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as Record<string, unknown>;
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in g)) Object.defineProperty(g, key, { configurable: true, get: () => (dom.window as never)[key] });
}
for (const key of ["window", "document", "navigator"]) {
  Object.defineProperty(g, key, { configurable: true, value: key === "window" ? dom.window : (dom.window as never)[key] });
}
// React lit un <form> jsdom avec `new FormData(form)` : celui de Node refuse un formulaire jsdom, on utilise celui de jsdom.
Object.defineProperty(g, "FormData", { configurable: true, value: (dom.window as never)["FormData"] });
g.IS_REACT_ACT_ENVIRONMENT = true; // React : les mises à jour passent par act() (Testing Library s'en charge)
// jsdom n'a ni ResizeObserver ni IntersectionObserver : doublures que le test déclenche lui-même. Chaque observateur créé est gardé (rappel, options, état
// « déconnecté ») dans `globalThis.__intersections` et `globalThis.__resizes`.
type Seen = { callback: (entries: unknown[]) => void; options?: { rootMargin?: string }; disconnected: boolean };
class FakeResizeObserver {
  private seen: Seen;
  constructor(callback: (entries: unknown[]) => void) {
    this.seen = { callback, disconnected: false };
    ((g.__resizes ??= []) as Seen[]).push(this.seen);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.seen.disconnected = true;
  }
}
class FakeIntersectionObserver {
  private seen: Seen;
  constructor(callback: (entries: unknown[]) => void, options?: { rootMargin?: string }) {
    this.seen = { callback, options, disconnected: false };
    ((g.__intersections ??= []) as Seen[]).push(this.seen);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.seen.disconnected = true;
  }
}
g.ResizeObserver ??= FakeResizeObserver;
g.IntersectionObserver ??= FakeIntersectionObserver;
