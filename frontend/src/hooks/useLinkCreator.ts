import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createLink } from "../lib/api";
import { linkSchema } from "../lib/linkValidation";

export function useLinkCreator(setMascotMessage: (message: string) => void) {
  const [linkInput, setLinkInput] = useState("");
  const [vanityUrl, setVanityUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const [isPersonalizado, setIsPersonalizado] = useState(false);
  const [isUnica, setIsUnica] = useState(false);
  const [isSenha, setIsSenha] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");

  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const queryClient = useQueryClient();

  async function handleEncurtar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroValidacao(null);

    if (isLoading) return;

    if (isSenha && senhaInput.trim() === "") {
      setErroValidacao(
        "Ativaste a proteção com senha, mas esqueceste-te de a preencher!",
      );
      setMascotMessage("Cuidado! Um cadeado sem chave não tranca nada! 🔑");
      return;
    }

    const customSlug =
      isPersonalizado && vanityUrl.trim() !== "" ? vanityUrl.trim() : undefined;

    const validation = linkSchema.safeParse({
      urlOriginal: linkInput.trim(),
      urlPersonalizada: customSlug,
    });

    if (!validation.success) {
      setErroValidacao(
        validation.error.issues[0]?.message ?? "Formato de link inválido!",
      );
      setMascotMessage(
        "Atenção! O pergaminho não parece estar bem escrito! 🛑",
      );
      return;
    }

    setIsLoading(true);
    setLinkGerado(null);
    setCopiado(false);

    try {
      const response = await createLink({
        url: validation.data.urlOriginal,
        customSlug: validation.data.urlPersonalizada || undefined,
        password: isSenha ? senhaInput : undefined,
        singleUse: isUnica || undefined,
      });

      // A API determina a URL pública definitiva.
      setLinkGerado(response.shortUrl);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["links"] }),
        queryClient.invalidateQueries({ queryKey: ["topLinks"] }),
      ]);

      let successMessage = "Pergaminho forjado com perfeição! ✨";

      if (isUnica) {
        successMessage = "Link criado! Ele arderá após ser lido! 🔥";
      } else if (isSenha) {
        successMessage = "Link criado e trancado a sete chaves! 🔒";
      }

      setMascotMessage(successMessage);

      setLinkInput("");
      setVanityUrl("");
      setSenhaInput("");
      setIsPersonalizado(false);
      setIsUnica(false);
      setIsSenha(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro desconhecido.";

      setErroValidacao(message);
      setMascotMessage(
        "Uma tempestade impediu-me de forjar o pergaminho. Tenta novamente! ⛈️",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copiarLink() {
    if (!linkGerado) return;

    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);

      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErroValidacao(
        "Não foi possível copiar o link. Verifica as permissões do navegador.",
      );
    }
  }

  return {
    linkInput,
    setLinkInput,
    vanityUrl,
    setVanityUrl,
    isLoading,
    erroValidacao,
    setErroValidacao,
    isPersonalizado,
    setIsPersonalizado,
    isUnica,
    setIsUnica,
    isSenha,
    setIsSenha,
    senhaInput,
    setSenhaInput,
    linkGerado,
    copiado,
    handleEncurtar,
    copiarLink,
  };
}
