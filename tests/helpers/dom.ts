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
// jsdom n'a ni ResizeObserver ni IntersectionObserver : doublures sans effet ; les rappels des IntersectionObserver sont gardés dans `globalThis.__intersections`
// pour qu'un test simule l'entrée d'un élément à l'écran.
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class FakeIntersectionObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    ((g.__intersections ??= []) as unknown[]).push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
g.ResizeObserver ??= FakeResizeObserver;
g.IntersectionObserver ??= FakeIntersectionObserver;
