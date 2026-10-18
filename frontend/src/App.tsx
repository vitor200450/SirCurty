import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import { createLink } from './lib/api';

// ── Validation schema (client-side) ───────────────────────────────────────
const esquemaPergaminho = z.object({
  urlOriginal: z
    .string()
    .min(1, { message: 'O pergaminho principal não pode estar vazio!' })
    .url({ message: 'Feitiço falhou! Insere um URL válido (ex: https://google.com)' }),
  urlPersonalizada: z
    .string()
    .regex(/^[a-zA-Z0-9_-]*$/, {
      message: 'O link personalizado só pode conter letras, números, hífens e underscores.',
    })
    .min(3, { message: 'O link personalizado precisa de pelo menos 3 caracteres.' })
    .max(32, { message: 'O link personalizado é demasiado longo! (Máx. 32 caracteres)' })
    .optional(),
});

export default function App() {
  const queryClient = useQueryClient();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fraseClickIndex, setFraseClickIndex] = useState(0);

  const [linkInput, setLinkInput] = useState('');
  const [vanityUrl, setVanityUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const [isMenuAberto, setIsMenuAberto] = useState(false);
  const [isPersonalizado, setIsPersonalizado] = useState(false);
  const [isUnica, setIsUnica] = useState(false);
  const [isSenha, setIsSenha] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');

  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const frasesAoClicar = [
    'Saudações, futuro cavaleiro! Bem-vindo ao meu castelo! 🏰',
    '⚔️ A minha espada é afiada, mas os teus links serão imbatíveis!',
    '⚙️ Clica no menu de opções para configurar feitiços avançados no teu link!',
  ];

  const [mensagemMascote, setMensagemMascote] = useState<string | null>(
    frasesAoClicar[0],
  );

  const toggleTheme = () => {
    const vaiMudarParaEscuro = !isDarkMode;
    setIsDarkMode(vaiMudarParaEscuro);
    setMensagemMascote(
      vaiMudarParaEscuro
        ? 'As tochas estão acesas! A noite cai sobre a fortaleza... 🌙🔥'
        : 'O sol ergue-se! Um excelente dia para forjar links! ☀️🏰',
    );
  };

  useEffect(() => {
    if (mensagemMascote) {
      const timer = setTimeout(() => setMensagemMascote(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [mensagemMascote]);

  const falarComMascote = () => {
    const proximoIndex = (fraseClickIndex + 1) % frasesAoClicar.length;
    setFraseClickIndex(proximoIndex);
    setMensagemMascote(frasesAoClicar[proximoIndex]);
  };

  const handleEncurtar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    if (isSenha && senhaInput.trim() === '') {
      setErroValidacao('Ativaste a proteção com senha, mas esqueceste-te de a preencher!');
      setMensagemMascote('Cuidado! Um cadeado sem chave não tranca nada! 🔑');
      return;
    }

    const urlPersFinal =
      isPersonalizado && vanityUrl.trim() !== '' ? vanityUrl.trim() : undefined;

    const resultadoInspecao = esquemaPergaminho.safeParse({
      urlOriginal: linkInput,
      urlPersonalizada: urlPersFinal,
    });

    if (!resultadoInspecao.success) {
      const mensagemDeErro =
        resultadoInspecao.error.issues[0]?.message ?? 'Formato de link inválido!';
      setErroValidacao(mensagemDeErro);
      setMensagemMascote('Atenção! O pergaminho não parece estar bem escrito! 🛑');
      return;
    }

    setIsLoading(true);
    setLinkGerado(null);
    setCopiado(false);

    try {
      const resposta = await createLink({
        url: linkInput,
        customSlug: urlPersFinal,
        password: isSenha && senhaInput.trim() !== '' ? senhaInput : undefined,
        singleUse: isUnica || undefined,
      });

      setLinkGerado(`http://localhost:5173/s/${resposta.code}`);

      let msgSucesso = 'Pergaminho forjado com perfeição! ✨';
      if (isUnica) msgSucesso = 'Link criado! Ele arderá após ser lido! 🔥';
      if (isSenha) msgSucesso = 'Link criado e trancado a sete chaves! 🔒';
      setMensagemMascote(msgSucesso);

      // Refresh the dashboard links list
      void queryClient.invalidateQueries({ queryKey: ['links'] });

      // Reset form
      setLinkInput('');
      setVanityUrl('');
      setSenhaInput('');
      setIsPersonalizado(false);
      setIsUnica(false);
      setIsSenha(false);
      setIsMenuAberto(false);
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'Erro desconhecido';
      setErroValidacao(msg);
      setMensagemMascote('Uma tempestade impediu-me de forjar o pergaminho. Tenta novamente! ⛈️');
    } finally {
      setIsLoading(false);
    }
  };

  const copiarLink = () => {
    if (linkGerado) {
      navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

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
        className={`min-h-screen font-sans transition-colors duration-500 ${
          isDarkMode ? 'bg-[#0B0D14] text-slate-200' : 'bg-[#FDF8EE] text-slate-800'
        }`}
      >
        <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <Hero
          isDarkMode={isDarkMode}
          mensagemMascote={mensagemMascote}
          falarComMascote={falarComMascote}
          linkInput={linkInput}
          setLinkInput={setLinkInput}
          vanityUrl={vanityUrl}
          setVanityUrl={setVanityUrl}
          handleEncurtar={handleEncurtar}
          isLoading={isLoading}
          linkGerado={linkGerado}
          copiarLink={copiarLink}
          copiado={copiado}
          erroValidacao={erroValidacao}
          isMenuAberto={isMenuAberto}
          setIsMenuAberto={setIsMenuAberto}
          isPersonalizado={isPersonalizado}
          setIsPersonalizado={setIsPersonalizado}
          isUnica={isUnica}
          setIsUnica={setIsUnica}
          isSenha={isSenha}
          setIsSenha={setIsSenha}
          senhaInput={senhaInput}
          setSenhaInput={setSenhaInput}
        />
        <Dashboard isDarkMode={isDarkMode} />
      </div>
    </>
  );
}
