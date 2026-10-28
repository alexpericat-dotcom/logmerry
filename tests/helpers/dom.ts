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
g.IS_REACT_ACT_ENVIRONMENT = true; // React : les mises à jour passent par act() (Testing Library s'en charge)
