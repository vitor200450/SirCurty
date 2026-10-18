import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import mascotImage from '../assets/SirCurtyMascot.png';
import { getLinkPreview, unlockLink } from '../lib/api';

/**
 * Fluxos suportados:
 *
 * 1. Link normal          → Preview (contagem) → redirect
 * 2. Link com senha         → Form senha → Preview (contagem) → redirect
 * 3. Link uso único (1ª)   → Preview (contagem) → redirect  [API consome atomicamente]
 * 4. Link uso único (2ª+)  → API retorna 410 → /link-destruido
 * 5. Link senha+único (1ª) → Form senha → unlock → Preview → redirect
 * 6. Link senha+único (2ª) → Form senha → unlock retorna 410 → /link-destruido
 * 7. Link inexistente/del. → API retorna 404 → /link-destruido
 */
export default function Preview() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [contador, setContador] = useState(3);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroClave, setErroClave] = useState<string | null>(null);

  // After a successful unlock, we store the destination URL here
  const [urlDesbloqueada, setUrlDesbloqueada] = useState<string | null>(null);

  // ── Fetch preview ──────────────────────────────────────────────────────
  const {
    data: preview,
    isLoading,
    isError,
    error: previewError,
  } = useQuery({
    queryKey: ['linkPreview', code],
    queryFn: () => getLinkPreview(code!),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ── Unlock mutation (password-protected links) ─────────────────────────
  const unlockMutation = useMutation({
    mutationFn: (password: string) => unlockLink(code!, password),
    onSuccess: (data) => {
      setErroClave(null);
      setUrlDesbloqueada(data.url);
    },
    onError: (err: Error) => {
      const msg = err.message;
      if (msg.includes('410') || msg.toLowerCase().includes('gone') || msg.toLowerCase().includes('already been used')) {
        navigate('/link-destruido', { replace: true });
        return;
      }
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid password')) {
        setErroClave('Senha incorreta! A chave não abre este cadeado. 🔑');
        return;
      }
      setErroClave(msg);
    },
  });

  // ── Redirect to /link-destruido on fatal preview errors ───────────────
  useEffect(() => {
    if (!isError || !previewError) return;
    const msg = (previewError as Error).message ?? '';
    if (
      msg.includes('404') ||
      msg.includes('410') ||
      msg.toLowerCase().includes('not found') ||
      msg.toLowerCase().includes('gone') ||
      msg.toLowerCase().includes('expired') ||
      msg.toLowerCase().includes('disabled') ||
      msg.toLowerCase().includes('already been used')
    ) {
      navigate('/link-destruido', { replace: true });
    }
  }, [isError, previewError, navigate]);

  // ── Final destination URL ──────────────────────────────────────────────
  const urlDestino =
    urlDesbloqueada ?? (preview?.requiresPassword ? null : (preview?.originalUrl ?? null));

  // ── Countdown + redirect Limpo (Sem OpenTelemetry) ─────────────────────
  useEffect(() => {
    if (!urlDestino) return;
    setContador(3);

    const intervalo = setInterval(() => {
      setContador((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo);
          
          // Redireciona via porta 3000 para a API consumir o uso único se não foi desbloqueado localmente
          window.location.href = urlDesbloqueada ? urlDesbloqueada : `http://localhost:3000/s/${code}`;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [urlDestino, urlDesbloqueada, code]);

  // ── Render: Loading ────────────────────────────────────────────────────
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

  if (isError) return null;

  // ── Render: Password form ──────────────────────────────────────────────
  if (preview?.requiresPassword && !urlDesbloqueada) {
    return (
      <PreviewShell>
        <BadgePill color="blue">Acesso Trancado 🔒</BadgePill>
        <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
          Pergaminho Protegido!
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Este link está protegido com senha. Insere a chave para abrir os portões.
        </p>
        {preview.isSingleUse && (
          <p className="text-xs text-orange-400 font-bold mb-4">
            🔥 Atenção: este pergaminho será destruído após a primeira leitura!
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (senhaInput.trim()) unlockMutation.mutate(senhaInput);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            placeholder="🔑 Senha secreta..."
            autoFocus
            className="w-full bg-[#0B0D14] border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors"
          />
          {erroClave && (
            <p className="text-red-400 text-xs font-bold">{erroClave}</p>
          )}
          <button
            type="submit"
            disabled={unlockMutation.isPending || !senhaInput.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-xl font-bold transition-all"
          >
            {unlockMutation.isPending ? 'A verificar...' : '⚔️ Abrir Portões'}
          </button>
        </form>
      </PreviewShell>
    );
  }

  // ── Render: Countdown ──────────────────────────────────────────────────
  if (urlDestino) {
    return (
      <PreviewShell>
        <BadgePill color="yellow">Inspeção Realizada 🛡️</BadgePill>
        <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
          Aguarde, cavaleiro!
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          O destino do pergaminho{' '}
          <strong className="text-purple-400">({code})</strong> é seguro:
        </p>
        <div className="bg-[#0B0D14] border border-slate-700 p-3 rounded-xl mb-6 truncate text-xs text-slate-400 font-mono shadow-inner">
          {urlDestino}
        </div>
        {preview?.isSingleUse && (
          <p className="text-xs text-orange-400 font-bold mb-4">
            🔥 Este pergaminho será destruído após este acesso!
          </p>
        )}
        <div className="text-sm text-slate-400 font-medium">
          A abrir os portões em{' '}
          <span className="text-yellow-500 font-black text-xl mx-1">{contador}</span>{' '}
          segundos...
        </div>
      </PreviewShell>
    );
  }

  return null;
}

// ── Shared layout shell ────────────────────────────────────────────────────
function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0D14] text-slate-200 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0B0D14] to-[#0B0D14] z-0" />
      <div className="max-w-md w-full bg-[#151828]/90 backdrop-blur-sm border-2 border-purple-900/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(88,28,135,0.3)] text-center relative z-10">
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
          <img
            src={mascotImage}
            alt="Sir Curty Mascote"
            className="h-36 object-contain animate-bounce duration-1000 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative z-10"
          />
        </div>
        {children}
      </div>
    </div>
  );
}

function BadgePill({ children, color }: { children: React.ReactNode; color: 'yellow' | 'blue' }) {
  const cls = color === 'yellow' ? 'bg-[#2A1D52] text-yellow-500 border-yellow-600/30' : 'bg-[#1A1D2E] text-blue-400 border-blue-600/30';
  return (
    <span className={`${cls} border text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm`}>
      {children}
    </span>
  );
}