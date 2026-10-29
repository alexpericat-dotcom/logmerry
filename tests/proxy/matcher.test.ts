import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

/**
 * Le `matcher` de proxy.ts est un littéral que Next analyse : on le LIT dans le fichier (jamais d'import ailleurs). Next le traite comme un motif de chemin ;
 * ici, comme une expression régulière ancrée (approximation suffisante pour ce motif : un seul groupe avec anticipation négative).
 */
const source = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
const literal = /matcher:\s*\[\s*(?:\/\*[\s\S]*?\*\/\s*)?"((?:[^"\\]|\\.)+)"/.exec(source)?.[1];
if (!literal) throw new Error("matcher introuvable dans proxy.ts : ce test ne prouverait rien");
const pattern = new RegExp(`^${JSON.parse(`"${literal}"`) as string}$`);
const matched = (path: string) => pattern.test(path);

describe("matcher de proxy.ts", () => {
  test("le littéral est trouvé dans le fichier", () => {
    assert.ok(literal, "matcher introuvable dans proxy.ts");
  });

  test("traité : pages, connexion, API", () => {
    for (const path of ["/", "/clients", "/missions/abc", "/auth/login", "/auth/confirm", "/api/chat", "/aujourd-hui"]) assert.equal(matched(path), true, path);
  });

  test("non traité : fichiers statiques de Next, favicon et images (svg, png, jpg, jpeg, gif, webp)", () => {
    for (const path of ["/_next/static/chunks/a.js", "/_next/image", "/_next/image?url=x", "/favicon.ico", "/icon.svg", "/opengraph-image.png", "/images/logo.png", "/a/b.jpg", "/a.jpeg", "/a.gif", "/a.webp"]) {
      assert.equal(matched(path.split("?")[0]), false, path);
    }
  });

  test("limites connues (figées) : une image en majuscules ou un autre type (ico hors favicon, pdf) est traité par le proxy", () => {
    for (const path of ["/LOGO.PNG", "/doc.pdf", "/autre.ico"]) assert.equal(matched(path), true, path);
  });
});
