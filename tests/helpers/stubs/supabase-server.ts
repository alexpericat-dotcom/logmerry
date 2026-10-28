import { client, fake } from "../harness.ts";

export async function createClient() {
  if (fake.failCreate) throw new Error("harnais : createClient en échec");
  return client;
}
