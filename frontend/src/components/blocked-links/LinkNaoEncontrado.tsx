import mascotImage from "../../assets/SirCurtyMascot.png";
import { BlockedLinkLayout } from "./BlockedLinkLayout";

export function LinkNaoEncontrado() {
  return (
    <BlockedLinkLayout
      theme="nao-encontrado"
      image={mascotImage}
      imageAlt="Sir Curty procurando um pergaminho que não existe"
    >
      <h1 className="blocked-title">Pergaminho não Encontrado!</h1>

      <p className="blocked-description">
        O Sir Curty vasculhou todo o castelo, mas este link não existe ou foi
        removido. Confira o endereço e tente novamente.
      </p>
    </BlockedLinkLayout>
  );
}
