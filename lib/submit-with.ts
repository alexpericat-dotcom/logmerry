import type { FormEvent } from "react";
import { startTransition } from "react";

/**
 * React 19 réinitialise un formulaire après chaque action (un menu retomberait sur sa valeur d'origine alors que l'état local dit autre chose).
 * On envoie donc le FormData nous-mêmes, sans `action=` : les champs gardent ce que l'utilisateur a saisi.
 */
export const submitWith = (formAction: (data: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
  startTransition(() => formAction(data));
};
