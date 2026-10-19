import { useEffect, useState } from "react";

import Navbar from "./components/NavBar";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import { useLinkCreator } from "./hooks/useLinkCreator";

const frasesAoClicar = [
  "Saudações, futuro cavaleiro! Bem-vindo ao meu castelo! 🏰",
  "⚔️ A minha espada é afiada, mas os teus links serão imbatíveis!",
  "⚙️ Clica no menu de opções para configurar feitiços avançados no teu link!",
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fraseClickIndex, setFraseClickIndex] = useState(0);

  const [mensagemMascote, setMensagemMascote] = useState<string | null>(
    frasesAoClicar[0],
  );

  const creator = useLinkCreator((message) => {
    setMensagemMascote(message);
  });

  useEffect(() => {
    if (!mensagemMascote) return;

    const timer = window.setTimeout(() => {
      setMensagemMascote(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [mensagemMascote]);

  function toggleTheme() {
    const nextDarkMode = !isDarkMode;

    setIsDarkMode(nextDarkMode);

    setMensagemMascote(
      nextDarkMode
        ? "As tochas estão acesas! A noite cai sobre a fortaleza... 🌙🔥"
        : "O sol ergue-se! Um excelente dia para forjar links! ☀️🏰",
    );
  }

  function falarComMascote() {
    const nextIndex = (fraseClickIndex + 1) % frasesAoClicar.length;

    setFraseClickIndex(nextIndex);
    setMensagemMascote(frasesAoClicar[nextIndex]);
  }

  return (
    <>
      <style>{`
        @keyframes slice {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(60deg) scale(1.3) translateY(-2px); }
          100% { transform: rotate(0deg) scale(1); }
        }

        .animate-slice {
          animation: slice 0.3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes fadeInDrop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-drop {
          animation: fadeInDrop 0.25s ease-out forwards;
        }
      `}</style>

      <div
        className={`relative min-h-screen font-sans transition-colors duration-500 ${
          isDarkMode
            ? "bg-[#0B0D14] text-slate-200"
            : "bg-[#FDF8EE] text-slate-800"
        }`}
      >
        <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        <Hero
          isDarkMode={isDarkMode}
          mensagemMascote={mensagemMascote}
          falarComMascote={falarComMascote}
          linkInput={creator.linkInput}
          setLinkInput={creator.setLinkInput}
          vanityUrl={creator.vanityUrl}
          setVanityUrl={creator.setVanityUrl}
          handleEncurtar={creator.handleEncurtar}
          isLoading={creator.isLoading}
          linkGerado={creator.linkGerado}
          copiarLink={creator.copiarLink}
          copiado={creator.copiado}
          erroValidacao={creator.erroValidacao}
          isPersonalizado={creator.isPersonalizado}
          setIsPersonalizado={creator.setIsPersonalizado}
          isUnica={creator.isUnica}
          setIsUnica={creator.setIsUnica}
          isSenha={creator.isSenha}
          setIsSenha={creator.setIsSenha}
          senhaInput={creator.senhaInput}
          setSenhaInput={creator.setSenhaInput}
        />

        <Dashboard isDarkMode={isDarkMode} />
      </div>
    </>
  );
}
