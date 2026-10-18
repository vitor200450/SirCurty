import React from 'react';
import { Link } from 'react-router-dom';

export function LinkDestruido() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-8xl mb-6 animate-pulse">🔥📜🔥</div>
      <h1 className="text-4xl text-purple-400 font-bold mb-4 text-center">
        O Feitiço foi Quebrado!
      </h1>
      <p className="text-slate-300 text-lg mb-10 text-center max-w-lg leading-relaxed">
        Este pergaminho continha uma magia poderosa de visualização única. As palavras viraram cinzas assim que foram lidas e o destino foi trancado para sempre.
      </p>
      
      <Link 
        to="/" 
        className="px-8 py-4 bg-purple-600 hover:bg-purple-700 shadow-[0_0_15px_rgba(147,51,234,0.5)] text-white rounded-lg font-bold text-lg transition-all duration-300 flex items-center gap-2 hover:scale-105"
      >
        <span>🛡️</span> Voltar ao Castelo Seguro
      </Link>
    </div>
  );
}