import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./blocked-links.css";

interface BlockedLinkLayoutProps {
  children: ReactNode;
  image: string;
  imageAlt: string;
  theme: "consumido" | "expirado" | "desativado" | "nao-encontrado";
}

export function BlockedLinkLayout({
  children,
  image,
  imageAlt,
  theme,
}: BlockedLinkLayoutProps) {
  return (
    <main
      className={`blocked-page blocked-page--${theme} flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center`}
    >
      <div className="blocked-content flex w-full max-w-2xl flex-col items-center">
        <img
          src={image}
          alt={imageAlt}
          className={`blocked-image blocked-image--${theme} mb-8`}
        />

        {children}

        <Link to="/" className="blocked-home-button mt-10">
          <span aria-hidden="true">🛡️</span>
          <span>Voltar ao Castelo Seguro</span>
        </Link>
      </div>
    </main>
  );
}
