import { useSearchParams } from "react-router-dom";
import { LinkConsumido } from "../components/blocked-links/LinkConsumido";
import { LinkExpirado } from "../components/blocked-links/LinkExpirado";
import { LinkDesativado } from "../components/blocked-links/LinkDesativado";

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

    default:
      return <LinkDesativado />;
  }
}
