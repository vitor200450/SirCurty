import type { HeroThemeProps } from "./hero.types";

export default function HeroIntro({ isDarkMode }: HeroThemeProps) {
  return (
    <div className="space-y-6 -mt-8 md:-mt-12">
      <div className="flex items-center gap-2 text-yellow-600 justify-start">
        <span className="w-12 h-[2px] bg-yellow-600" />
        <span className="text-base">⚜️</span>
        <span className="w-12 h-[2px] bg-yellow-600" />
      </div>

      <h2
        className={`text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] ${
          isDarkMode ? "text-white" : "text-[#1F1B38]"
        }`}
      >
        Encurte seus links <br />
        com estilo{" "}
        <span className={isDarkMode ? "text-purple-400" : "text-[#4B3B88]"}>
          épico.
        </span>
      </h2>

      <p
        className={`text-base md:text-lg max-w-md leading-relaxed font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] ${
          isDarkMode ? "text-slate-100" : "text-[#1F1B38]"
        }`}
      >
        Transforme links longos em curtos e poderosos. Rápido, seguro e feito
        para conquistar.
      </p>
    </div>
  );
}
