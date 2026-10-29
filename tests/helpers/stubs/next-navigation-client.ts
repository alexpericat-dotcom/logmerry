// Composants client testés hors de Next : `useRouter` sans routeur monté (aucune navigation dans un test).
export const useRouter = () => ({ refresh() {}, push() {}, replace() {}, back() {} });
