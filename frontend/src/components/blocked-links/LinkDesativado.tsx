import imagemDesativado from "../../assets/link-desativado.jpeg";
import { BlockedLinkLayout } from "./BlockedLinkLayout";

export function LinkDesativado() {
  return (
    <BlockedLinkLayout
      theme="desativado"
      image={imagemDesativado}
      imageAlt="Portal mágico selado pelo seu guardião"
    >
      <h1 className="blocked-title">O Portal foi Selado!</h1>

      <p className="blocked-description">
        O guardião deste portal suspendeu sua magia. O acesso ao destino foi
        bloqueado e o caminho permanecerá fechado enquanto o link estiver
        desativado.
      </p>
    </BlockedLinkLayout>
  );
}
