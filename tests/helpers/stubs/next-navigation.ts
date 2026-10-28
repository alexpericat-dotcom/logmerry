import { Redirect } from "../harness.ts";

/** Comme Next : `redirect` ne revient jamais (il lève). */
export function redirect(url: string): never {
  throw new Redirect(url);
}
export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}
