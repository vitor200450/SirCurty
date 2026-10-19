import bgDia from "../assets/CastleLightTheme.png";
import bgNoite from "../assets/CastleDarkTheme.png";

import AdvancedOptions from "./hero/AdvancedOptions";
import GeneratedLink from "./hero/GeneratedLink";
import HeroIntro from "./hero/HeroIntro";
import LinkForm from "./hero/LinkForm";
import Mascot from "./hero/Mascot";
import ValidationError from "./hero/ValidationError";

import type { HeroProps } from "./hero/hero.types";

export default function Hero({
  isDarkMode,
  mensagemMascote,
  falarComMascote,
  linkInput,
  setLinkInput,
  vanityUrl,
  setVanityUrl,
  handleEncurtar,
  isLoading,
  linkGerado,
  copiarLink,
  copiado,
  erroValidacao,
  isPersonalizado,
  setIsPersonalizado,
  isUnica,
  setIsUnica,
  isSenha,
  setIsSenha,
  senhaInput,
  setSenhaInput,
}: HeroProps) {
  return (
    <main className="max-w-7xl mx-auto px-8 py-4">
      <div className="relative p-8 md:p-12 md:pb-16 grid md:grid-cols-2 gap-8 items-center z-0">
        {/* Fundo temático */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${isDarkMode ? bgNoite : bgDia})`,
            maskImage:
              "radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Conteúdo principal */}
        <div className="relative z-10 space-y-6">
          <HeroIntro isDarkMode={isDarkMode} />

          <LinkForm
            isDarkMode={isDarkMode}
            linkInput={linkInput}
            setLinkInput={setLinkInput}
            handleEncurtar={handleEncurtar}
            isLoading={isLoading}
          >
            <AdvancedOptions
              isDarkMode={isDarkMode}
              isPersonalizado={isPersonalizado}
              setIsPersonalizado={setIsPersonalizado}
              vanityUrl={vanityUrl}
              setVanityUrl={setVanityUrl}
              isUnica={isUnica}
              setIsUnica={setIsUnica}
              isSenha={isSenha}
              setIsSenha={setIsSenha}
              senhaInput={senhaInput}
              setSenhaInput={setSenhaInput}
            />

            <ValidationError
              isDarkMode={isDarkMode}
              message={erroValidacao ?? ""}
            />
          </LinkForm>

          {/* Resultado da criação */}
          {linkGerado && !erroValidacao && (
            <GeneratedLink
              isDarkMode={isDarkMode}
              linkGerado={linkGerado}
              isUnica={isUnica}
              isSenha={isSenha}
              copiarLink={copiarLink}
              copiado={copiado}
            />
          )}

          {/* Indicador de segurança */}
          <div
            className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm backdrop-blur-sm ${
              isDarkMode
                ? "bg-[#151828]/60 text-slate-300"
                : "bg-white/60 text-[#3B2A6B]"
            }`}
          >
            <span aria-hidden="true">🛡️</span>
            Links seguros e protegidos
          </div>
        </div>

        {/* Mascote */}
        <Mascot
          isDarkMode={isDarkMode}
          mensagemMascote={mensagemMascote}
          falarComMascote={falarComMascote}
        />
      </div>
    </main>
  );
}
