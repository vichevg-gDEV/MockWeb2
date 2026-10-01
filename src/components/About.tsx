import React from 'react';
import { getAssetUrl } from '../utils/assetPath';

export const About: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-[#0d0d0d] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#E6CA65]">
              <span className="w-8 h-[1px] bg-[#E6CA65]"></span>
              <span>За нашия салон</span>
            </div>

            <h2 className="font-cinzel text-3xl sm:text-4xl text-white font-bold leading-tight" style={{ textWrap: 'balance' }}>
              Където красотата среща <span className="gold-gradient-text">висшия професионализъм</span>
            </h2>

            <p className="text-gray-300 leading-relaxed font-light text-sm sm:text-base">
              Добре дошли в <strong>VIP Beauty House</strong> — мястото, където Вашата коса получава грижата, която заслужава. Ние сме специализиран салон за красота, утвърден като лидер в областта на удължаването и сгъстяването на коса, висшата колористика и цялостната естетична грижа във Варна.
            </p>

            <p className="text-gray-400 leading-relaxed font-light text-sm">
              При нас всеки детайл е от значение. Използваме единствено 100% естествена славянска и европейска коса от най-висок клас (Remy коса с ненарушена кутикула) и световно признати брандове за козметика с предпазващи технологии. Вярваме, че косата е най-красивата корона, която всяка дама носи всеки ден!
            </p>

            <div className="pt-4 border-t border-[#D4AF37]/20 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-[#141414] rounded-lg gold-border">
                <span className="font-cinzel text-2xl sm:text-3xl font-bold text-[#E6CA65] block tabular-nums">10+</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">Години Опит</span>
              </div>
              <div className="p-4 bg-[#141414] rounded-lg gold-border">
                <span className="font-cinzel text-2xl sm:text-3xl font-bold text-[#E6CA65] block tabular-nums">4500+</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">Доволни Клиенти</span>
              </div>
              <div className="p-4 bg-[#141414] rounded-lg gold-border">
                <span className="font-cinzel text-2xl sm:text-3xl font-bold text-[#E6CA65] block tabular-nums">100%</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">Remy Косъм</span>
              </div>
            </div>
          </div>

          {/* Luxury Visual Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#161616] to-[#0a0a0a] gold-border shadow-2xl overflow-hidden group">
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="text-center py-6">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none"></div>
                  <img
                    src={getAssetUrl('logo.png')}
                    alt="VIP Beauty House Official Logo"
                    className="w-full h-full object-contain mix-blend-screen filter drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:scale-105 transition duration-500"
                  />
                </div>
                
                <h3 className="font-cinzel text-2xl text-white font-bold tracking-wider mb-2">
                  Ексклузивно изживяване
                </h3>
                <p className="text-xs text-[#E6CA65] uppercase tracking-[0.3em] font-light mb-6">
                  Варна • бул. Княз Борис I 48
                </p>

                <div className="inline-block text-xs text-gray-300 italic border-l-2 border-[#D4AF37] pl-4 text-left max-w-xs sm:max-w-sm">
                  „Създаваме не просто прически, а самочувствие, женственост и неподправен лукс.“
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
