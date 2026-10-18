import type { HeroThemeProps } from "./hero.types";

interface GeneratedLinkProps extends HeroThemeProps {
  linkGerado: string;
  isUnica: boolean;
  isSenha: boolean;
  copiarLink: () => void;
  copiado: boolean;
}

export default function GeneratedLink({
  isDarkMode,
  linkGerado,
  isUnica,
  isSenha,
  copiarLink,
  copiado,
}: GeneratedLinkProps) {
  return (
    <div
      className={`mt-4 p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg animate-fade-in ${
        isDarkMode
          ? "bg-[#2A1D52]/80 border-purple-500/50"
          : "bg-[#E3C896] border-[#D4BC8C]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl" aria-hidden="true">
          ✨
        </span>

        <div className="min-w-0">
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? "text-purple-300" : "text-[#6B5A40]"
            }`}
          >
            Pergaminho Forjado! {isUnica && "🔥"} {isSenha && "🔒"}
          </p>

          <p
            className={`text-lg font-bold break-all ${
              isDarkMode ? "text-white" : "text-[#3B2A6B]"
            }`}
          >
            {linkGerado}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={copiarLink}
        className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
          copiado
            ? "bg-green-500 text-white border-green-600"
            : isDarkMode
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-white/50 hover:bg-white border border-[#D4BC8C] text-[#3B2A6B]"
        }`}
      >
        {copiado ? "✅ Copiado" : "📋 Copiar"}
      </button>
    </div>
  );
}
