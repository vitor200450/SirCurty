import type { HeroThemeProps } from "./hero.types";

interface AdvancedOptionsProps extends HeroThemeProps {
  isPersonalizado: boolean;
  setIsPersonalizado: (value: boolean) => void;
  vanityUrl: string;
  setVanityUrl: (value: string) => void;

  isUnica: boolean;
  setIsUnica: (value: boolean) => void;

  isSenha: boolean;
  setIsSenha: (value: boolean) => void;
  senhaInput: string;
  setSenhaInput: (value: string) => void;
}

export default function AdvancedOptions({
  isDarkMode,
  isPersonalizado,
  setIsPersonalizado,
  vanityUrl,
  setVanityUrl,
  isUnica,
  setIsUnica,
  isSenha,
  setIsSenha,
  senhaInput,
  setSenhaInput,
}: AdvancedOptionsProps) {
  const panelClass = `mt-2 rounded-2xl border overflow-hidden transition-all backdrop-blur-md ${
    isDarkMode
      ? "bg-[#1D172A]/90 border-purple-900/60 shadow-[0_4px_30px_rgba(88,28,135,0.15)]"
      : "bg-[#FAF3E0] border-[#E5D5B3] shadow-[0_4px_25px_rgba(139,94,26,0.12)]"
  }`;

  const rowClass = `px-5 py-3.5 transition-colors ${
    isDarkMode
      ? "border-purple-900/30 hover:bg-[#1A1424]/40"
      : "border-[#E5D5B3]/50 hover:bg-[#F3E6C7]"
  }`;

  const labelClass = `text-sm font-bold ${
    isDarkMode ? "text-purple-200" : "text-[#4E3629]"
  }`;

  return (
    <div className={panelClass}>
      <div
        className={`px-5 py-2.5 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
          isDarkMode
            ? "border-purple-900/40 text-purple-300 bg-[#161122]/80"
            : "border-[#E5D5B3] text-[#4E3629] bg-[#EFE2C2]"
        }`}
      >
        <span aria-hidden="true">✨</span>
        Feitiços Avançados
      </div>

      <div className="flex flex-col">
        {/* Nome personalizado */}
        <div
          className={`${rowClass} flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3`}
        >
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPersonalizado}
              onChange={(event) => setIsPersonalizado(event.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-purple-700"
            />
            <span className={labelClass}>✏️ Nome Personalizado</span>
          </label>

          {isPersonalizado && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border flex-1 max-w-xs sm:max-w-[220px] transition-all animate-fade-in ${
                isDarkMode
                  ? "bg-[#110D1B] border-purple-900/50 text-purple-300"
                  : "bg-[#FDF8EE] border-[#D4BC8C] text-[#4E3629]"
              }`}
            >
              <span className="text-xs font-bold opacity-60 whitespace-nowrap">
                {window.location.host}/s/
              </span>

              <input
                type="text"
                value={vanityUrl}
                onChange={(event) => setVanityUrl(event.target.value)}
                placeholder="nome-epico"
                aria-label="Nome personalizado do link"
                className={`flex-1 min-w-0 bg-transparent outline-none text-xs font-bold w-full ${
                  isDarkMode
                    ? "text-purple-200 placeholder-purple-800"
                    : "text-[#4E3629] placeholder-amber-800/40"
                }`}
              />
            </div>
          )}
        </div>

        {/* Visualização única */}
        <div
          className={`${rowClass} flex items-center justify-between border-b`}
        >
          <label className="flex items-center gap-3 cursor-pointer select-none w-full">
            <input
              type="checkbox"
              checked={isUnica}
              onChange={(event) => setIsUnica(event.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-orange-600"
            />

            <span
              className={`text-sm font-bold ${
                isDarkMode ? "text-orange-300" : "text-[#4E3629]"
              }`}
            >
              🔥 Visualização Única{" "}
              <span
                className={`text-[10px] font-normal ml-1 ${
                  isDarkMode ? "text-slate-400" : "text-amber-800/75"
                }`}
              >
                (Destrói após leitura)
              </span>
            </span>
          </label>
        </div>

        {/* Proteção por senha */}
        <div
          className={`${rowClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
        >
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSenha}
              onChange={(event) => setIsSenha(event.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-amber-700"
            />

            <span
              className={`text-sm font-bold ${
                isDarkMode ? "text-blue-300" : "text-[#4E3629]"
              }`}
            >
              🔒 Protegido com Senha
            </span>
          </label>

          {isSenha && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border flex-1 max-w-xs sm:max-w-[220px] transition-all animate-fade-in ${
                isDarkMode
                  ? "bg-[#110D1B] border-blue-900/40"
                  : "bg-[#FDF8EE] border-[#D4BC8C]"
              }`}
            >
              <span className="text-xs" aria-hidden="true">
                🔑
              </span>

              <input
                type="password"
                value={senhaInput}
                onChange={(event) => setSenhaInput(event.target.value)}
                placeholder="Digite a senha..."
                aria-label="Senha para proteger o link"
                autoComplete="new-password"
                className={`flex-1 min-w-0 bg-transparent outline-none text-xs font-bold w-full ${
                  isDarkMode
                    ? "text-blue-300 placeholder-blue-900/60"
                    : "text-[#4E3629] placeholder-amber-800/40"
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
