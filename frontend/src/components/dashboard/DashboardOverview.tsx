import type { LinkResponse } from "../../types/link";

interface DashboardOverviewProps {
  links: LinkResponse[];
  topLinks: LinkResponse[];
  isDarkMode: boolean;
  onViewStats: (slug: string) => void;
}

export default function DashboardOverview({
  links,
  topLinks,
  isDarkMode,
  onViewStats,
}: DashboardOverviewProps) {
  const totalLinks = links.length;
  const singleUseLinks = links.filter((link) => link.isSingleUse).length;
  const passwordLinks = links.filter((link) => link.hasPassword).length;

  const panelClass = isDarkMode
    ? "bg-[#151828] border-[#2A2E45] shadow-black/50"
    : "bg-[#E4CE9B] border-[#C8AF73] shadow-[#E8DCC2]/50";

  const cardClass = isDarkMode
    ? "bg-[#1A1D2E]"
    : "bg-[#F9F1E2] border border-[#C8AF73]/40";

  const titleClass = isDarkMode ? "text-slate-200" : "text-[#3A3022]";
  const mutedClass = isDarkMode ? "text-slate-500" : "text-[#6B5A40]";

  const metrics = [
    { icon: "🏆", value: topLinks.length, label: "Top links" },
    { icon: "🔗", value: totalLinks, label: "Criados" },
    { icon: "🔥", value: singleUseLinks, label: "Uso único" },
    { icon: "🔒", value: passwordLinks, label: "Com senha" },
  ];

  return (
    <aside
      className={`rounded-xl p-6 border-2 shadow-lg relative ${panelClass}`}
    >
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl">
        👑
      </div>

      <h3 className={`text-center font-bold text-lg mt-2 mb-6 ${titleClass}`}>
        Estatísticas gerais
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm ${cardClass}`}
          >
            <span className="text-2xl">{metric.icon}</span>
            <span className={`text-xl font-black ${titleClass}`}>
              {metric.value}
            </span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider text-center ${mutedClass}`}
            >
              {metric.label}
            </span>
          </div>
        ))}
      </div>

      {topLinks.length > 0 && (
        <div className="mt-6">
          <p
            className={`text-xs uppercase font-bold tracking-wider mb-3 ${
              isDarkMode ? "text-slate-400" : "text-[#6B5A40]"
            }`}
          >
            🏅 Mais clicados
          </p>

          <ul className="flex flex-col gap-2">
            {topLinks.slice(0, 5).map((link, index) => (
              <li
                key={link.id}
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${cardClass}`}
              >
                <span
                  className={`font-black w-4 ${
                    isDarkMode ? "text-purple-400" : "text-[#3B2A6B]"
                  }`}
                >
                  {index + 1}.
                </span>

                <button
                  type="button"
                  onClick={() => onViewStats(link.slug)}
                  className={`font-semibold hover:underline truncate flex-1 text-left ${
                    isDarkMode ? "text-purple-300" : "text-[#3B2A6B]"
                  }`}
                >
                  {link.slug}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`absolute -bottom-4 -right-4 w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transform rotate-12 ${
          isDarkMode
            ? "bg-[#2A1D52] border-purple-500/50"
            : "bg-[#3B2A6B] border-[#2A1D52]"
        }`}
      >
        <span className="text-yellow-500 text-xl">⚜️</span>
      </div>
    </aside>
  );
}
