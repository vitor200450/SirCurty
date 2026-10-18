import React from 'react';
import mascotImage from '../assets/SirCurtyMascot.png';
import mascotImageDark from '../assets/SirCurtyMascotDark.png';
import bgDia from '../assets/CastleLightTheme.png';  
import bgNoite from '../assets/CastleDarkTheme.png'; 

export default function Hero({ 
  isDarkMode, mensagemMascote, falarComMascote, 
  linkInput, setLinkInput, vanityUrl, setVanityUrl, handleEncurtar, isLoading, linkGerado, copiarLink, copiado, erroValidacao,
  isPersonalizado, setIsPersonalizado, isUnica, setIsUnica, isSenha, setIsSenha, senhaInput, setSenhaInput 
}: any) {
  
  return (
    <main className="max-w-7xl mx-auto px-8 py-4">
      <div className="relative p-8 md:p-12 md:pb-16 grid md:grid-cols-2 gap-8 items-center z-0">
        
        {/*//////////////////
               Fundo
        ////////////////// */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${isDarkMode ? bgNoite : bgDia})`,
            maskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)'
          }}
        ></div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 text-yellow-600 justify-start">
            <span className="w-12 h-[2px] bg-yellow-600"></span>
            <span className="text-base">⚜️</span>
            <span className="w-12 h-[2px] bg-yellow-600"></span>
          </div>
          
          <h2 className={`text-4xl md:text-5xl font-extrabold leading-tight ${isDarkMode ? 'text-white' : 'text-[#1F1B38]'}`}>
            Encurte seus links <br /> com estilo <span className={isDarkMode ? 'text-purple-400' : 'text-[#4B3B88]'}>épico.</span>
          </h2>
          
          <p className={`text-base md:text-lg max-w-md leading-relaxed font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Transforme links longos em curtos e poderosos. Rápido, seguro e feito para conquistar.
          </p>

          <form onSubmit={handleEncurtar} noValidate className="flex flex-col gap-3 mt-6">
            
            {/* //////////////////
                 Barra principal 
            ///////////////////////*/}
            <div className={`backdrop-blur-md p-2 rounded-2xl border flex items-center gap-3 transition-colors ${
              isDarkMode 
                ? 'bg-[#1D172A]/90 border-purple-900/60 shadow-[0_4px_30px_rgba(88,28,135,0.15)]' 
                : 'bg-[#FAF3E0] border-[#E5D5B3] shadow-[0_4px_25px_rgba(139,94,26,0.12)]'
            }`}>
              <span className={`pl-4 text-xl ${isDarkMode ? 'text-purple-400/70' : 'text-[#8B5E34]/70'}`}>🔗</span>
              <input 
                type="text" value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Cole o seu link longo aqui..." 
                className={`flex-1 bg-transparent outline-none py-3 text-base font-medium ${
                  isDarkMode ? 'text-purple-200 placeholder-purple-800/70' : 'text-[#4E3629] placeholder-[#8B5E34]/60'
                }`} 
              />
              <button 
                type="submit" disabled={isLoading}
                className={`px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-all cursor-pointer text-base disabled:opacity-70 ${
                isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-[#4B3B88] hover:bg-[#3B2A6B] text-white'
              }`}>
                <span className={`inline-block origin-bottom-left ${isLoading ? 'animate-slice' : ''}`}>🗡️</span>
                {isLoading ? 'A Cortar...' : 'Encurtar'}
              </button>
            </div>

            {/* /////////////////////
                Tabela de Opções
            ///////////////////////*/}
            <div className={`mt-2 rounded-2xl border overflow-hidden transition-all backdrop-blur-md ${
              isDarkMode 
                ? 'bg-[#1D172A]/90 border-purple-900/60 shadow-[0_4px_30px_rgba(88,28,135,0.15)]' 
                : 'bg-[#FAF3E0] border-[#E5D5B3] shadow-[0_4px_25px_rgba(139,94,26,0.12)]'
            }`}>
              {/* Cabeçalho da Tabela */}
              <div className={`px-5 py-2.5 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDarkMode 
                  ? 'border-purple-900/40 text-purple-300 bg-[#161122]/80' 
                  : 'border-[#E5D5B3] text-[#4E3629] bg-[#EFE2C2]'
              }`}>
                <span>✨</span> Feitiços Avançados
              </div>

              {/* //////////////////
                    Corpo da Tabela 
              ////////////////////*/}
              <div className="flex flex-col">
                
                {/* //////////////////
                    Nome Personalizado 
                 ///////////////////////*/}
                <div className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between border-b transition-colors gap-3 ${
                  isDarkMode ? 'border-purple-900/30 hover:bg-[#1A1424]/40' : 'border-[#E5D5B3]/50 hover:bg-[#F3E6C7]'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isPersonalizado} 
                      onChange={() => setIsPersonalizado(!isPersonalizado)}
                      className={`w-4 h-4 rounded cursor-pointer accent-purple-700`}
                    />
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-purple-200' : 'text-[#4E3629]'}`}>
                      ✏️ Nome Personalizado
                    </span>
                  </label>
                  
                  {isPersonalizado && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border flex-1 max-w-xs sm:max-w-[220px] transition-all animate-fade-in ${
                      isDarkMode 
                        ? 'bg-[#110D1B] border-purple-900/50 text-purple-300' 
                        : 'bg-[#FDF8EE] border-[#D4BC8C] text-[#4E3629]'
                    }`}>
                      <span className="text-xs font-bold opacity-60">http://localhost:5173/s/</span>
                      <input 
                        type="text" value={vanityUrl} onChange={(e) => setVanityUrl(e.target.value)}
                        placeholder="nome-epico" 
                        className={`flex-1 bg-transparent outline-none text-xs font-bold w-full ${
                          isDarkMode ? 'text-purple-200 placeholder-purple-800' : 'text-[#4E3629] placeholder-amber-800/40'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* ///////////////////////////
                        Visualização Única 
                ////////////////////////////////*/}
                <div className={`px-5 py-3.5 flex items-center justify-between border-b transition-colors ${
                  isDarkMode ? 'border-purple-900/30 hover:bg-[#1A1424]/40' : 'border-[#E5D5B3]/50 hover:bg-[#F3E6C7]'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                    <input 
                      type="checkbox" 
                      checked={isUnica} 
                      onChange={() => setIsUnica(!isUnica)}
                      className={`w-4 h-4 rounded cursor-pointer accent-orange-600`}
                    />
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-300' : 'text-[#4E3629]'}`}>
                      🔥 Visualização Única <span className={`text-[10px] font-normal ml-1 ${isDarkMode ? 'text-slate-400' : 'text-amber-800/75'}`}>(Destrói após leitura)</span>
                    </span>
                  </label>
                </div>

                {/* Linha 3: Senha */}
                <div className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-3 ${
                  isDarkMode ? 'hover:bg-[#1A1424]/40' : 'hover:bg-[#F3E6C7]'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isSenha} 
                      onChange={() => setIsSenha(!isSenha)}
                      className={`w-4 h-4 rounded cursor-pointer accent-amber-700`}
                    />
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-[#4E3629]'}`}>
                      🔒 Protegido com Senha
                    </span>
                  </label>
                  
                  {isSenha && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border flex-1 max-w-xs sm:max-w-[220px] transition-all animate-fade-in ${
                      isDarkMode 
                        ? 'bg-[#110D1B] border-blue-900/40' 
                        : 'bg-[#FDF8EE] border-[#D4BC8C]'
                    }`}>
                      <span className="text-xs">🔑</span>
                      <input 
                        type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)}
                        placeholder="Digite a senha..." 
                        className={`flex-1 bg-transparent outline-none text-xs font-bold w-full ${
                          isDarkMode ? 'text-blue-300 placeholder-blue-900/60' : 'text-[#4E3629] placeholder-amber-800/40'
                        }`}
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Erro */}
            {erroValidacao && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border mt-1 text-sm font-bold animate-pulse shadow-lg ${
                isDarkMode ? 'bg-red-900/30 border-red-500/50 text-red-400' : 'bg-red-100 border-red-300 text-red-700'
              }`}>
                <span>🛑</span> {erroValidacao}
              </div>
            )}
          </form>

          {/* //////////////////////////////
               Sucesso da criação de link 
          //////////////////////////////// */}
          {linkGerado && !erroValidacao && (
            <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between shadow-lg animate-fade-in ${
              isDarkMode ? 'bg-[#2A1D52]/80 border-purple-500/50' : 'bg-[#E3C896] border-[#D4BC8C]'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-300' : 'text-[#6B5A40]'}`}>
                    Pergaminho Forjado! {isUnica && '🔥'} {isSenha && '🔒'}
                  </p>
                  <p className={`text-lg font-bold hover:underline cursor-pointer ${isDarkMode ? 'text-white' : 'text-[#3B2A6B]'}`}>
                    {linkGerado}
                  </p>
                </div>
              </div>
              <button 
                onClick={copiarLink}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  copiado ? 'bg-green-500 text-white border-green-600' : isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/50 hover:bg-white border border-[#D4BC8C] text-[#3B2A6B]'
                }`}
              >
                {copiado ? '✅ Copiado' : '📋 Copiar'}
              </button>
            </div>
          )}
          
          <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm backdrop-blur-sm ${
            isDarkMode ? 'bg-[#151828]/60 text-slate-300' : 'bg-white/60 text-[#3B2A6B]'
          }`}>
            <span>🛡️</span> Links seguros e protegidos
          </div>
        </div>
        
        {/* Sir Curty */}
        <div className="relative h-[400px] md:h-[480px] lg:h-[520px] flex items-end justify-center md:justify-end z-10 md:translate-y-12 md:pr-4">
          
          {/* Balão de fala */}
          {mensagemMascote && (
            <div className={`absolute top-0 md:top-4 left-2 md:right-[340px] lg:right-[400px] z-20 w-[190px] md:w-[210px] p-5 rounded-[2.3rem] rounded-br-none shadow-xl border transition-all animate-bounce duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-[#2A1D52]/50 border-purple-500/30 text-white' : 'bg-[#FAF3E0] border-[#E5D5B3] text-[#4E3629]'
            }`}>
              <p className="text-xs md:text-[13px] font-bold leading-relaxed text-center drop-shadow-md">
                {mensagemMascote}
              </p>
              <div className={`absolute -bottom-2 right-4 w-4 h-4 transform rotate-45 border-b border-r ${
                isDarkMode ? 'bg-[#2A1D52]/80 border-purple-500/30' : 'bg-[#FAF3E0] border-[#E5D5B3]'
              }`}></div>
            </div>
          )}

          <img 
            src={isDarkMode ? mascotImageDark : mascotImage} alt="Sir Curty Mascote" onClick={falarComMascote}
            className="h-[280px] md:h-[380px] lg:h-[440px] w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-105 transition-transform duration-300 z-10"
            title="Clica-me para falar!"
          />
        </div>

      </div>
    </main>
  );
}