import imagemConsumido from "../../assets/link-consumido.jpg";
import { BlockedLinkLayout } from "./BlockedLinkLayout";

export function LinkConsumido() {
  return (
    <BlockedLinkLayout
      theme="consumido"
      image={imagemConsumido}
      imageAlt="Pergaminho consumido por uma magia"
    >
      <h1 className="blocked-title">O Feitiço foi Quebrado!</h1>

      <p className="blocked-description">
        Este pergaminho continha uma magia de uso único. Suas palavras já foram
        reveladas e, como prometido, o feitiço se desfez para sempre.
      </p>
    </BlockedLinkLayout>
  );
}
