/** Valeur absente : un tiret à l'œil, « non renseignée » pour les lecteurs d'écran (un `aria-label` sur un `span` n'est pas fiable). */
export function Unset() {
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">non renseignée</span>
    </>
  );
}
