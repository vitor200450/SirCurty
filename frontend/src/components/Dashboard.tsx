import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLinks, deleteLink, getTopLinks, getLinkStats, updateLink, getLink } from '../lib/api';
import type { LinkResponse, ClickStats, UpdateLinkBody } from '../types/link';

interface DashboardProps {
  isDarkMode: boolean;
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  link: LinkResponse;
  isDarkMode: boolean;
  onClose: () => void;
}

function EditModal({ link, isDarkMode, onClose }: EditModalProps) {
  const queryClient = useQueryClient();

  // Pre-fill form with current values
  const [url, setUrl] = useState(link.originalUrl);
  const [expiresAt, setExpiresAt] = useState(
    link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : '',
  );
  const [singleUse, setSingleUse] = useState(link.isSingleUse);
  const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>(
    link.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
  );
  const [erro, setErro] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (body: UpdateLinkBody) => updateLink(link.slug, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['links'] });
      void queryClient.invalidateQueries({ queryKey: ['topLinks'] });
      onClose();
    },
    onError: (err: Error) => setErro(err.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const body: UpdateLinkBody = {};
    if (url !== link.originalUrl) body.url = url;
    if (singleUse !== link.isSingleUse) body.singleUse = singleUse;
    if (status !== (link.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED')) body.status = status;

    // expiresAt: empty string = clear, otherwise set new date
    const newExpiry = expiresAt ? new Date(expiresAt).toISOString() : null;
    const oldExpiry = link.expiresAt ? new Date(link.expiresAt).toISOString() : null;
    if (newExpiry !== oldExpiry) body.expiresAt = newExpiry;

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    updateMutation.mutate(body);
  };

  const inputCls = `w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors ${
    isDarkMode
      ? 'bg-[#0B0D14] border-slate-700 text-white focus:border-purple-500'
      : 'bg-white border-[#D4BC8C] text-[#4E3629] focus:border-[#3B2A6B]'
  }`;

  const labelCls = `text-xs font-bold uppercase tracking-wider mb-1 block ${
    isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border-2 shadow-2xl p-6 ${
          isDarkMode
            ? 'bg-[#151828] border-[#2A2E45]'
            : 'bg-[#FDF8EE] border-[#C8AF73]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
            ✏️ Editar Pergaminho
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-[#E4CE9B] text-[#6B5A40]'
            }`}
          >
            ✕
          </button>
        </div>

        <p className={`text-xs mb-4 font-mono ${isDarkMode ? 'text-purple-400' : 'text-[#3B2A6B]'}`}>
          /{link.slug}
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* URL */}
          <div>
            <label className={labelCls}>🔗 URL destino</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Expiry */}
          <div>
            <label className={labelCls}>⏳ Expiração (opcional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls}
            />
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt('')}
                className="text-xs text-red-400 mt-1 hover:underline"
              >
                Remover expiração
              </button>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singleUse}
                onChange={(e) => setSingleUse(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-300' : 'text-[#4E3629]'}`}>
                🔥 Uso único
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={status === 'ACTIVE'}
                onChange={(e) => setStatus(e.target.checked ? 'ACTIVE' : 'DISABLED')}
                className="w-4 h-4 accent-green-500 cursor-pointer"
              />
              <span className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-[#4E3629]'}`}>
                ✅ Ativo (desmarcar para desativar)
              </span>
            </label>
          </div>

          {erro && (
            <p className="text-red-400 text-xs font-bold bg-red-900/20 rounded-lg px-3 py-2">
              🛑 {erro}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-[#E4CE9B] hover:bg-[#D9C490] text-[#4E3629]'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-colors"
            >
              {updateMutation.isPending ? 'A guardar...' : '⚔️ Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stats Modal ────────────────────────────────────────────────────────────

interface StatsModalProps {
  slug: string;
  isDarkMode: boolean;
  onClose: () => void;
}

function StatsModal({ slug, isDarkMode, onClose }: StatsModalProps) {
  const { data: stats, isLoading } = useQuery<ClickStats>({
    queryKey: ['linkStats', slug],
    queryFn: () => getLinkStats(slug),
    throwOnError: false,
  });

  const maxCount = stats ? Math.max(...stats.dailyClicks.map((d) => d.count), 1) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl p-6 ${
          isDarkMode
            ? 'bg-[#151828] border-[#2A2E45]'
            : 'bg-[#FDF8EE] border-[#C8AF73]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
              📊 Estatísticas
            </h2>
            <p className={`text-xs font-mono ${isDarkMode ? 'text-purple-400' : 'text-[#3B2A6B]'}`}>
              /{slug}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-[#E4CE9B] text-[#6B5A40]'
            }`}
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-10 opacity-70">
            <span className="text-3xl animate-spin">⚙️</span>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'}`}>
              A consultar os pergaminhos...
            </p>
          </div>
        ) : !stats ? (
          <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'}`}>
            Não foi possível carregar as estatísticas.
          </p>
        ) : (
          <>
            {/* Total */}
            <div
              className={`rounded-xl p-4 mb-6 text-center ${
                isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/40'
              }`}
            >
              <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-slate-500' : 'text-[#6B5A40]'}`}>
                Total de cliques
              </p>
              <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
                {stats.total}
              </p>
            </div>

            {/* Bar chart */}
            {stats.dailyClicks.length === 0 ? (
              <p className={`text-center text-sm py-4 ${isDarkMode ? 'text-slate-500' : 'text-[#8C7A5B]'}`}>
                Ainda não há cliques registados.
              </p>
            ) : (
              <>
                <p className={`text-xs uppercase font-bold tracking-wider mb-3 ${isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'}`}>
                  Cliques por dia
                </p>
                <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-2">
                  {stats.dailyClicks.map((d) => {
                    const heightPct = Math.max((d.count / maxCount) * 100, 4);
                    const dateLabel = new Date(d.day + 'T00:00:00').toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                    });
                    return (
                      <div
                        key={d.day}
                        className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group"
                        title={`${dateLabel}: ${d.count} cliques`}
                      >
                        <span
                          className={`text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDarkMode ? 'text-purple-300' : 'text-[#3B2A6B]'
                          }`}
                        >
                          {d.count}
                        </span>
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${heightPct}%`,
                            background: isDarkMode
                              ? 'linear-gradient(to top, #7c3aed, #a855f7)'
                              : 'linear-gradient(to top, #3B2A6B, #6D5AC9)',
                          }}
                        />
                        <span
                          className={`text-[8px] whitespace-nowrap rotate-45 origin-left mt-1 ${
                            isDarkMode ? 'text-slate-500' : 'text-[#8C7A5B]'
                          }`}
                        >
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className={`w-full mt-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${
            isDarkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              : 'bg-[#E4CE9B] hover:bg-[#D9C490] text-[#4E3629]'
          }`}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard({ isDarkMode }: DashboardProps) {
  const queryClient = useQueryClient();

  const [editingLink, setEditingLink] = useState<LinkResponse | null>(null);
  const [statsSlug, setStatsSlug] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery<LinkResponse[]>({
    queryKey: ['links'],
    queryFn: getLinks,
    throwOnError: false,
  });

  const { data: topLinks = [] } = useQuery<LinkResponse[]>({
    queryKey: ['topLinks'],
    queryFn: () => getTopLinks(10),
    throwOnError: false,
  });

  // getTopLinks returns LinkResponse[] — the API sorts by click count but doesn't
  // expose the count on the DTO. We show the count of top-linked entries as a proxy.
  const totalClicks = topLinks.length;

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteLink(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['links'] });
      void queryClient.invalidateQueries({ queryKey: ['topLinks'] });
    },
  });

  const queimarPergaminho = (slug: string) => {
    if (window.confirm(`🔥 Tens a certeza que queres queimar o pergaminho "${slug}"?`)) {
      deleteMutation.mutate(slug);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

  const totalLinks = links.length;

  return (
    <>
      {/* ── Edit Modal ── */}
      {editingLink && (
        <EditModal
          link={editingLink}
          isDarkMode={isDarkMode}
          onClose={() => setEditingLink(null)}
        />
      )}

      {/* ── Stats Modal ── */}
      {statsSlug && (
        <StatsModal
          slug={statsSlug}
          isDarkMode={isDarkMode}
          onClose={() => setStatsSlug(null)}
        />
      )}

      <section className="max-w-7xl mx-auto px-8 pb-20 mt-12">
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── Links table ── */}
          <div
            className={`lg:col-span-2 rounded-xl p-6 border-2 shadow-lg relative min-h-[300px] flex flex-col ${
              isDarkMode
                ? 'bg-[#151828] border-[#2A2E45] shadow-black/50'
                : 'bg-[#E4CE9B] border-[#C8AF73] shadow-[#E8DCC2]/50'
            }`}
          >
            <div
              className={`absolute -top-4 left-6 px-4 py-1 rounded-md border-2 font-bold text-sm flex items-center gap-2 ${
                isDarkMode
                  ? 'bg-[#151828] border-[#2A2E45] text-slate-300'
                  : 'bg-[#E4CE9B] border-[#C8AF73] text-[#5A4A32]'
              }`}
            >
              ⚜️ Links recentes
            </div>

            <div className="mt-4 overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b-2 text-sm ${
                      isDarkMode ? 'border-[#2A2E45] text-slate-400' : 'border-[#A3884D] text-[#5A4A32]'
                    }`}
                  >
                    <th className="pb-3 font-semibold w-[22%]">Link curto</th>
                    <th className="pb-3 font-semibold w-[30%]">Link original</th>
                    <th className="pb-3 font-semibold text-center w-[13%]">Estado</th>
                    <th className="pb-3 font-semibold text-center w-[13%]">Data</th>
                    <th className="pb-3 font-semibold text-center w-[22%]">Ações</th>
                  </tr>
                </thead>
                <tbody className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-[#4A3D22]'}`}>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className={`flex flex-col items-center gap-2 opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'}`}>
                          <span className="text-3xl animate-spin">⚙️</span>
                          <p className="text-sm">A consultar o castelo...</p>
                        </div>
                      </td>
                    </tr>
                  ) : links.length > 0 ? (
                    links.map((link) => (
                      <tr
                        key={link.id}
                        className={`border-b border-dashed transition-colors ${
                          isDarkMode
                            ? 'border-[#2A2E45] hover:bg-[#1A1D2E]'
                            : 'border-[#C8AF73] hover:bg-[#D9C490]'
                        }`}
                      >
                        {/* Slug */}
                        <td className="py-3 flex items-center gap-1.5">
                          <span className={isDarkMode ? 'text-slate-500' : 'text-[#8C7A5B]'}>🔗</span>
                          <a
                            href={`/s/${link.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`font-semibold hover:underline truncate max-w-[90px] ${
                              isDarkMode ? 'text-purple-400' : 'text-[#3B2A6B]'
                            }`}
                          >
                            {link.slug}
                          </a>
                          {link.hasPassword && <span title="Com senha" className="text-xs">🔒</span>}
                          {link.isSingleUse && <span title="Uso único" className="text-xs">🔥</span>}
                        </td>

                        {/* Original URL */}
                        <td className="py-3 truncate max-w-[180px]" title={link.originalUrl}>
                          {link.originalUrl}
                        </td>

                        {/* Status badge */}
                        <td className="py-3 text-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              link.status === 'ACTIVE'
                                ? isDarkMode
                                  ? 'bg-green-900/40 text-green-400'
                                  : 'bg-green-100 text-green-700'
                                : isDarkMode
                                ? 'bg-red-900/40 text-red-400'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {link.status === 'ACTIVE' ? 'Ativo' : link.status === 'DISABLED' ? 'Inativo' : link.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3 text-center">{formatDate(link.createdAt)}</td>

                        {/* Actions */}
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Stats */}
                            <button
                              onClick={() => setStatsSlug(link.slug)}
                              title="Ver estatísticas"
                              className={`p-1.5 rounded-lg transition-all text-sm ${
                                isDarkMode
                                  ? 'hover:bg-purple-900/40 text-slate-400 hover:text-purple-400'
                                  : 'hover:bg-purple-100 text-[#8C7A5B] hover:text-purple-600'
                              }`}
                            >
                              📊
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => setEditingLink(link)}
                              title="Editar pergaminho"
                              className={`p-1.5 rounded-lg transition-all text-sm ${
                                isDarkMode
                                  ? 'hover:bg-blue-900/40 text-slate-400 hover:text-blue-400'
                                  : 'hover:bg-blue-100 text-[#8C7A5B] hover:text-blue-600'
                              }`}
                            >
                              ✏️
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => queimarPergaminho(link.slug)}
                              disabled={deleteMutation.isPending}
                              title="Queimar pergaminho"
                              className={`p-1.5 rounded-lg transition-all text-sm disabled:opacity-50 ${
                                isDarkMode
                                  ? 'hover:bg-red-900/40 text-slate-400 hover:text-red-400'
                                  : 'hover:bg-red-200 text-[#8C7A5B] hover:text-red-600'
                              }`}
                            >
                              🔥
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div
                          className={`flex flex-col items-center justify-center gap-2 opacity-70 ${
                            isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'
                          }`}
                        >
                          <span className="text-4xl drop-shadow-sm mb-2">📜</span>
                          <p className={`font-bold text-base ${isDarkMode ? 'text-slate-400' : 'text-[#5A4A32]'}`}>
                            Nenhum pergaminho criado.
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-[#5A4A32]/80'}`}>
                            Encurta o teu primeiro link ali em cima para registares os teus passos!
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Stats sidebar ── */}
          <div
            className={`rounded-xl p-6 border-2 shadow-lg relative ${
              isDarkMode
                ? 'bg-[#151828] border-[#2A2E45] shadow-black/50'
                : 'bg-[#E4CE9B] border-[#C8AF73] shadow-[#E8DCC2]/50'
            }`}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl">👑</div>

            <h3
              className={`text-center font-bold text-lg mt-2 mb-6 ${
                isDarkMode ? 'text-slate-200' : 'text-[#3A3022]'
              }`}
            >
              Estatísticas gerais
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Top links count (proxy for activity) */}
              <div
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm ${
                  isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/40'
                }`}
              >
                <span className="text-2xl">🏆</span>
                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
                  {totalClicks}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider text-center ${
                    isDarkMode ? 'text-slate-500' : 'text-[#6B5A40]'
                  }`}
                >
                  Top links
                </span>
              </div>

              <div
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm ${
                  isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/40'
                }`}
              >
                <span className="text-2xl">🔗</span>
                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
                  {totalLinks}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isDarkMode ? 'text-slate-500' : 'text-[#6B5A40]'
                  }`}
                >
                  Criados
                </span>
              </div>

              <div
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm ${
                  isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/40'
                }`}
              >
                <span className="text-2xl">🔥</span>
                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
                  {links.filter((l) => l.isSingleUse).length}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isDarkMode ? 'text-slate-500' : 'text-[#6B5A40]'
                  }`}
                >
                  Uso único
                </span>
              </div>

              <div
                className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm ${
                  isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/40'
                }`}
              >
                <span className="text-2xl">🔒</span>
                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#3A3022]'}`}>
                  {links.filter((l) => l.hasPassword).length}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isDarkMode ? 'text-slate-500' : 'text-[#6B5A40]'
                  }`}
                >
                  Com senha
                </span>
              </div>
            </div>

            {/* Top links list */}
            {topLinks.length > 0 && (
              <div className="mt-6">
                <p className={`text-xs uppercase font-bold tracking-wider mb-3 ${isDarkMode ? 'text-slate-400' : 'text-[#6B5A40]'}`}>
                  🏅 Mais clicados
                </p>
                <ul className="flex flex-col gap-2">
                  {topLinks.slice(0, 5).map((l, i) => (
                    <li
                      key={l.id}
                      className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                        isDarkMode ? 'bg-[#1A1D2E]' : 'bg-[#F9F1E2] border border-[#C8AF73]/30'
                      }`}
                    >
                      <span className={`font-black w-4 ${isDarkMode ? 'text-purple-400' : 'text-[#3B2A6B]'}`}>
                        {i + 1}.
                      </span>
                      <button
                        onClick={() => setStatsSlug(l.slug)}
                        className={`font-semibold hover:underline truncate flex-1 text-left ${
                          isDarkMode ? 'text-purple-300' : 'text-[#3B2A6B]'
                        }`}
                      >
                        {l.slug}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={`absolute -bottom-4 -right-4 w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transform rotate-12 ${
                isDarkMode
                  ? 'bg-[#2A1D52] border-purple-500/50'
                  : 'bg-[#3B2A6B] border-[#2A1D52]'
              }`}
            >
              <span className="text-yellow-500 text-xl">⚜️</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div
            className={`inline-block px-8 py-3 rounded-full font-medium shadow-md ${
              isDarkMode
                ? 'bg-[#2A1D52] text-slate-300 border border-[#3B2A6B]'
                : 'bg-[#3B2A6B] text-[#FAF3E0]'
            }`}
          >
            Seja um cavaleiro da internet. Encurte, partilhe e conquiste!
          </div>
        </div>
      </section>
    </>
  );
}
