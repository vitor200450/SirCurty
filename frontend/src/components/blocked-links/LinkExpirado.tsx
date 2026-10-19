import imagemExpirado from "../../assets/link-expirado.jpg";
import { BlockedLinkLayout } from "./BlockedLinkLayout";

export function LinkExpirado() {
  return (
    <BlockedLinkLayout
      theme="expirado"
      image={imagemExpirado}
      imageAlt="Ampulheta representando uma magia que perdeu sua força"
    >
      <h1 className="blocked-title">O Encanto Perdeu sua Força!</h1>

      <p className="blocked-description">
        O tempo concedido a este pergaminho chegou ao fim. A magia expirou e o
        caminho para o destino foi selado.
      </p>
    </BlockedLinkLayout>
  );
}
