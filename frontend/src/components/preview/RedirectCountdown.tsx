import { useEffect, useState } from "react";
import { BadgePill, PreviewShell } from "./PreviewShell";

interface RedirectCountdownProps {
  code: string;
  destinationUrl: string;
  unlockedUrl: string | null;
  isSingleUse: boolean;
}

export function RedirectCountdown({
  code,
  destinationUrl,
  unlockedUrl,
  isSingleUse,
}: RedirectCountdownProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 1) {
      const timeoutId = window.setTimeout(() => {
        if (unlockedUrl) {
          // Link protegido por senha já desbloqueado.
          window.location.assign(unlockedUrl);
          return;
        }

        // Direciona o acesso ao backend para processar o link.
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

        const backendBaseUrl = apiBaseUrl.startsWith("http")
          ? new URL(apiBaseUrl).origin
          : window.location.origin;

        window.location.assign(
          `${backendBaseUrl}/s/${encodeURIComponent(code)}`,
        );
      }, 1000);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [countdown, code, unlockedUrl]);

  return (
    <PreviewShell>
      <BadgePill color="yellow">Inspeção Realizada 🛡️</BadgePill>

      <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
        Aguarde, cavaleiro!
      </h2>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">
        O destino do pergaminho{" "}
        <strong className="text-purple-400">({code})</strong> é seguro:
      </p>

      <div className="bg-[#0B0D14] border border-slate-700 p-3 rounded-xl mb-6 truncate text-xs text-slate-400 font-mono shadow-inner">
        {destinationUrl}
      </div>

      {isSingleUse && (
        <p className="text-xs text-orange-400 font-bold mb-4">
          🔥 Este pergaminho será destruído após este acesso!
        </p>
      )}

      <div className="text-sm text-slate-400 font-medium">
        A abrir os portões em{" "}
        <span className="text-yellow-500 font-black text-xl mx-1">
          {countdown}
        </span>{" "}
        segundos...
      </div>
    </PreviewShell>
  );
}
