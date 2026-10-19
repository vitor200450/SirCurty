import mascotImage from "../../assets/SirCurtyMascot.png";
import mascotImageDark from "../../assets/SirCurtyMascotDark.png";
import type { HeroThemeProps } from "./hero.types";

interface MascotProps extends HeroThemeProps {
  mensagemMascote: string | null;
  falarComMascote: () => void;
}

export default function Mascot({
  isDarkMode,
  mensagemMascote,
  falarComMascote,
}: MascotProps) {
  return (
    <div className="relative h-[400px] md:h-[480px] lg:h-[520px] flex items-end justify-center md:justify-end z-10 md:translate-y-12 md:pr-4">
      {mensagemMascote && (
        <div
          className={`absolute top-0 md:top-4 left-2 md:right-[340px] lg:right-[400px] z-20 w-[190px] md:w-[210px] p-5 rounded-[2.3rem] rounded-br-none shadow-xl border transition-all animate-bounce duration-300 backdrop-blur-sm ${
            isDarkMode
              ? "bg-[#2A1D52]/50 border-purple-500/30 text-white"
              : "bg-[#FAF3E0] border-[#E5D5B3] text-[#4E3629]"
          }`}
        >
          <p className="text-xs md:text-[13px] font-bold leading-relaxed text-center drop-shadow-md">
            {mensagemMascote}
          </p>

          <div
            className={`absolute -bottom-2 right-4 w-4 h-4 transform rotate-45 border-b border-r ${
              isDarkMode
                ? "bg-[#2A1D52]/80 border-purple-500/30"
                : "bg-[#FAF3E0] border-[#E5D5B3]"
            }`}
            aria-hidden="true"
          />
        </div>
      )}

      <button
        type="button"
        onClick={falarComMascote}
        aria-label="Conversar com Sir Curty"
        title="Clica-me para falar!"
        className="contents"
      >
        <img
          src={isDarkMode ? mascotImageDark : mascotImage}
          alt="Sir Curty, o mascote do encurtador"
          className="h-[280px] md:h-[380px] lg:h-[440px] w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-105 transition-transform duration-300 z-10"
        />
      </button>
    </div>
  );
}
