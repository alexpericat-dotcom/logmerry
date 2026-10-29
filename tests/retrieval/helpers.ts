import type { TestContext } from "node:test";

/** Vecteur de 1 024 valeurs dont la première porte `tag` : permet de vérifier l'ordre des vecteurs rendus. */
export const vec = (tag: number) => [tag, ...new Array<number>(1023).fill(0)];

/** Remplace `fetch` : chaque appel répond ce que `reply(corps)` rend. Rend la liste des corps envoyés. */
export function mockFetch(t: TestContext, reply: (body: { model: string; input: string[] }, init: RequestInit) => Response) {
  const calls: { url: string; input: string[]; init: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url: String(url), input: body.input, init });
    return reply(body, init);
  });
  return calls;
}

/** Réponse « embeddings » valide : le vecteur d'un texte « t7 » porte 7. */
export const embeddingsOk = (body: { input: string[] }) =>
  Response.json({ data: body.input.map((text, index) => ({ index, embedding: vec(/^t\d+$/.test(text) ? Number(text.slice(1)) : 0) })) });

/** Clé factice le temps d'un test. */
export function withFakeKey(t: TestContext, value = "cle-factice-SECRETE") {
  const before = process.env.MISTRAL_API_KEY;
  process.env.MISTRAL_API_KEY = value;
  t.after(() => {
    if (before === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = before;
  });
}
