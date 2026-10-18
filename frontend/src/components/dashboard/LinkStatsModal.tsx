import { useQuery } from "@tanstack/react-query";
import { getLinkStats } from "../../lib/api";
import type { ClickStats } from "../../types/link";

interface LinkStatsModalProps {
  slug: string;
  isDarkMode: boolean;
  onClose: () => void;
}

export default function LinkStatsModal({
  slug,
  isDarkMode,
  onClose,
}: LinkStatsModalProps) {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<ClickStats>({
    queryKey: ["linkStats", slug],
    queryFn: () => getLinkStats(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const maxCount = stats
    ? Math.max(...stats.dailyClicks.map((day) => day.count), 1)
    : 1;

  const secondaryText = isDarkMode ? "text-slate-400" : "text-[#6B5A40]";

  const closeButtonClass = isDarkMode
    ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
    : "bg-[#E4CE9B] hover:bg-[#D9C490] text-[#4E3629]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-stats-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl p-6 ${
          isDarkMode
            ? "bg-[#151828] border-[#2A2E45]"
            : "bg-[#FDF8EE] border-[#C8AF73]"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              id="link-stats-title"
              className={`font-bold text-lg ${
                isDarkMode ? "text-white" : "text-[#3A3022]"
              }`}
            >
              📊 Estatísticas
            </h2>

            <p
              className={`text-xs font-mono ${
                isDarkMode ? "text-purple-400" : "text-[#3B2A6B]"
              }`}
            >
              /{slug}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar estatísticas"
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-[#E4CE9B] text-[#6B5A40]"
            }`}
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div
            className={`flex flex-col items-center gap-3 py-10 opacity-70 ${secondaryText}`}
          >
            <span className="text-3xl animate-spin">⚙️</span>
            <p className="text-sm">A consultar os pergaminhos...</p>
          </div>
        ) : isError || !stats ? (
          <p className={`text-center py-8 text-sm ${secondaryText}`}>
            Não foi possível carregar as estatísticas.
          </p>
        ) : (
          <>
            <div
              className={`rounded-xl p-4 mb-6 text-center ${
                isDarkMode
                  ? "bg-[#1A1D2E]"
                  : "bg-[#F9F1E2] border border-[#C8AF73]/40"
              }`}
            >
              <p
                className={`text-xs uppercase font-bold tracking-wider mb-1 ${
                  isDarkMode ? "text-slate-500" : "text-[#6B5A40]"
                }`}
              >
                Total de cliques
              </p>

              <p
                className={`text-4xl font-black ${
                  isDarkMode ? "text-white" : "text-[#3A3022]"
                }`}
              >
                {stats.total}
              </p>
            </div>

            {stats.dailyClicks.length === 0 ? (
              <p
                className={`text-center text-sm py-4 ${
                  isDarkMode ? "text-slate-500" : "text-[#8C7A5B]"
                }`}
              >
                Ainda não há cliques registados.
              </p>
            ) : (
              <>
                <p
                  className={`text-xs uppercase font-bold tracking-wider mb-3 ${
                    isDarkMode ? "text-slate-400" : "text-[#6B5A40]"
                  }`}
                >
                  Cliques por dia
                </p>

                <div
                  className="flex items-end gap-1.5 h-32 overflow-x-auto pb-2"
                  role="img"
                  aria-label="Gráfico de cliques por dia"
                >
                  {stats.dailyClicks.map((day) => {
                    const heightPct = Math.max((day.count / maxCount) * 100, 4);

                    const dateLabel = new Date(
                      `${day.day}T00:00:00`,
                    ).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                    });

                    return (
                      <div
                        key={day.day}
                        className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group"
                        title={`${dateLabel}: ${day.count} cliques`}
                      >
                        <span
                          className={`text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                            isDarkMode ? "text-purple-300" : "text-[#3B2A6B]"
                          }`}
                        >
                          {day.count}
                        </span>

                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${heightPct}%`,
                            background: isDarkMode
                              ? "linear-gradient(to top, #7c3aed, #a855f7)"
                              : "linear-gradient(to top, #3B2A6B, #6D5AC9)",
                          }}
                        />

                        <span
                          className={`text-[8px] whitespace-nowrap rotate-45 origin-left mt-1 ${
                            isDarkMode ? "text-slate-500" : "text-[#8C7A5B]"
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
          type="button"
          onClick={onClose}
          className={`w-full mt-6 py-2.5 rounded-xl font-bold text-sm transition-colors ${closeButtonClass}`}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
