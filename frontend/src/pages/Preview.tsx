import { useParams } from "react-router-dom";
import { BadgePill, PreviewShell } from "../components/preview/PreviewShell";
import { PasswordForm } from "../components/preview/PasswordForm";
import { RedirectCountdown } from "../components/preview/RedirectCountdown";
import { useLinkPreview } from "../hooks/useLinkPreview";

export default function Preview() {
  const { code } = useParams<{ code: string }>();

  const {
    preview,
    isLoading,
    isError,
    password,
    setPassword,
    passwordError,
    unlockedUrl,
    isUnlocking,
    submitPassword,
  } = useLinkPreview(code);

  if (!code) {
    return (
      <PreviewShell>
        <BadgePill color="yellow">Pergaminho inválido 🔮</BadgePill>
        <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
          Não encontramos este pergaminho.
        </h2>
        <p className="text-sm text-slate-400">
          O código do link não foi informado.
        </p>
      </PreviewShell>
    );
  }

  if (isLoading) {
    return (
      <PreviewShell>
        <BadgePill color="yellow">A consultar os Deuses... 🔮</BadgePill>
        <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
          A verificar pergaminho...
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Aguarde enquanto o Sir Curty interroga a base de dados do castelo.
        </p>
      </PreviewShell>
    );
  }

  if (isError || !preview) {
    return null;
  }

  if (preview.requiresPassword && !unlockedUrl) {
    return (
      <PreviewShell>
        <BadgePill color="blue">Acesso Trancado 🔒</BadgePill>

        <PasswordForm
          isSingleUse={preview.isSingleUse}
          password={password}
          error={passwordError}
          isSubmitting={isUnlocking}
          onPasswordChange={setPassword}
          onSubmit={submitPassword}
        />
      </PreviewShell>
    );
  }

  const destinationUrl = unlockedUrl ?? preview.originalUrl;

  if (!destinationUrl) {
    return null;
  }

  return (
    <RedirectCountdown
      key={`${code}:${destinationUrl}`}
      code={code}
      destinationUrl={destinationUrl}
      unlockedUrl={unlockedUrl}
      isSingleUse={preview.isSingleUse}
    />
  );
}
