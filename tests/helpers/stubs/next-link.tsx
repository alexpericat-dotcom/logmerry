import type { AnchorHTMLAttributes, ReactNode } from "react";

/** `next/link` hors de Next : un simple lien (aucune navigation dans un test). */
export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
