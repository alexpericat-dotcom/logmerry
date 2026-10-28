import { fake } from "../harness.ts";

export function revalidatePath(path: string, type?: "page" | "layout") {
  fake.revalidated.push(type ? `${path}#${type}` : path);
}
export function revalidateTag() {}
