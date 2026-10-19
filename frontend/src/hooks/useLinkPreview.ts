import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getLinkPreview, unlockLink } from "../lib/api";

type BlockReason =
  | "consumido"
  | "expirado"
  | "desativado"
  | "nao-encontrado";

const BLOCKED_LINK_ROUTE = "/link-bloqueado";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

function getUnavailableReason(message: string): BlockReason | null {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already been used") ||
    normalized.includes("already used") ||
    normalized.includes("já foi utilizado") ||
    normalized.includes("ja foi utilizado") ||
    normalized.includes("já foi usado") ||
    normalized.includes("ja foi usado") ||
    normalized.includes("consumido") ||
    normalized.includes("consumed")
  ) {
    return "consumido";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("expirado") ||
    normalized.includes("expirada") ||
    normalized.includes("expirou") ||
    normalized.includes("expira") ||
    normalized.includes("expiry")
  ) {
    return "expirado";
  }

  if (
    normalized.includes("disabled") ||
    normalized.includes("desativado") ||
    normalized.includes("desativada")
  ) {
    return "desativado";
  }

  // Código inexistente (404) ou removido (410).
  if (
    /\b(404|410)\b/.test(normalized) ||
    normalized.includes("not found") ||
    normalized.includes("não encontrado") ||
    normalized.includes("nao encontrado") ||
    normalized.includes("gone") ||
    normalized.includes("no longer available") ||
    normalized.includes("indisponível") ||
    normalized.includes("indisponivel")
  ) {
    return "nao-encontrado";
  }

  return null;
}

function isInvalidPasswordError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    /\b401\b/.test(normalized) ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid password") ||
    normalized.includes("senha incorreta") ||
    normalized.includes("senha inválida") ||
    normalized.includes("senha invalida")
  );
}

function getUnavailableReasonFromPreview(preview: {
  status: string;
  expiresAt: Date | string | null;
  isSingleUse: boolean;
  isConsumed: boolean;
}): BlockReason | null {
  // Um link de uso único já utilizado tem prioridade.
  if (preview.isSingleUse && preview.isConsumed) {
    return "consumido";
  }

  if (preview.status === "DISABLED") {
    return "desativado";
  }

  if (
    preview.status === "EXPIRED" ||
    (preview.expiresAt !== null &&
      new Date(preview.expiresAt).getTime() <= Date.now())
  ) {
    return "expirado";
  }

  if (preview.status !== "ACTIVE") {
    return "desativado";
  }

  return null;
}

export function useLinkPreview(code: string | undefined) {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [unlockedUrl, setUnlockedUrl] = useState<string | null>(null);

  const previewQuery = useQuery({
    queryKey: ["linkPreview", code],
    queryFn: () => {
      if (!code) {
        throw new Error("HTTP 404: Link não encontrado.");
      }

      return getLinkPreview(code);
    },
    enabled: Boolean(code),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const preview = previewQuery.data;

  const blockReason = preview ? getUnavailableReasonFromPreview(preview) : null;

  const isUnavailable = blockReason !== null;

  const navigateToBlockedPage = (reason: BlockReason) => {
    navigate(`${BLOCKED_LINK_ROUTE}?reason=${reason}`, {
      replace: true,
    });
  };

  const unlockMutation = useMutation({
    mutationFn: (submittedPassword: string) => {
      if (!code) {
        throw new Error("Código do link não informado.");
      }

      return unlockLink(code, submittedPassword);
    },

    onSuccess: (data) => {
      setPasswordError(null);
      setUnlockedUrl(data.url);
    },

    onError: (error: Error) => {
      const message = getErrorMessage(error);
      const reason = getUnavailableReason(message);

      if (reason) {
        navigateToBlockedPage(reason);
        return;
      }

      if (isInvalidPasswordError(message)) {
        setPasswordError("Senha incorreta! A chave não abre este cadeado. 🔑");
        return;
      }

      setPasswordError(message);
    },
  });

  // Redireciona de acordo com o estado real recebido na prévia.
  useEffect(() => {
    if (blockReason) {
      navigateToBlockedPage(blockReason);
    }
  }, [blockReason]);

  // Trata erros de consulta cuja mensagem identifica o motivo do bloqueio.
  useEffect(() => {
    if (!previewQuery.isError || !previewQuery.error) {
      return;
    }

    const message = getErrorMessage(previewQuery.error);
    const reason = getUnavailableReason(message);

    if (reason) {
      navigateToBlockedPage(reason);
    }
  }, [previewQuery.isError, previewQuery.error]);

  function submitPassword() {
    if (!password.trim() || unlockMutation.isPending || isUnavailable) {
      return;
    }

    setPasswordError(null);
    unlockMutation.mutate(password);
  }

  return {
    preview,
    isLoading: previewQuery.isLoading,
    isError: previewQuery.isError,
    isUnavailable,
    blockReason,
    password,
    setPassword,
    passwordError,
    unlockedUrl,
    isUnlocking: unlockMutation.isPending,
    submitPassword,
  };
}
