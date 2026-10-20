import { useSearchParams } from "react-router-dom";
import { LinkConsumido } from "../components/blocked-links/LinkConsumido";
import { LinkExpirado } from "../components/blocked-links/LinkExpirado";
import { LinkDesativado } from "../components/blocked-links/LinkDesativado";
import { LinkNaoEncontrado } from "../components/blocked-links/LinkNaoEncontrado";

export function BlockedLinkPage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");

  switch (reason) {
    case "consumido":
      return <LinkConsumido />;

    case "expirado":
      return <LinkExpirado />;

    case "desativado":
      return <LinkDesativado />;

    case "nao-encontrado":
      return <LinkNaoEncontrado />;

    default:
      return <LinkDesativado />;
  }
}
