import React from 'react';
import { TRANSFORMATIONS } from '../data/salonData';
import { getAssetUrl, handleImageError } from '../utils/assetPath';

export const Gallery: React.FC = () => {
  return (
    <section id="gallery" className="py-24 bg-[#070707] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
            Реални Резултати
          </span>
          <h2 className="font-cinzel text-3xl sm:text-5xl text-white font-bold mt-2 mb-4" style={{ textWrap: 'balance' }}>
            Галерия <span className="gold-gradient-text">Трансформации</span>
          </h2>
          <div className="w-20 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-400 text-sm sm:text-base font-light">
            Вижте трансформацията на нашите клиентки и конкретните продукти от нашия бутик, използвани за всяка визия.
          </p>
        </div>

        {/* Transformation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TRANSFORMATIONS.map((tr) => (
            <div
              key={tr.id}
              className="bg-[#0f0f0f] rounded-xl overflow-hidden gold-border gold-border-glow group flex flex-col justify-between"
            >
              <div>
                <div className="h-64 bg-[#181818] relative overflow-hidden">
                  <img
                    src={getAssetUrl(tr.image)}
                    alt={tr.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 filter brightness-95"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent z-10"></div>
                  
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <span className="text-[11px] text-[#E6CA65] font-semibold uppercase tracking-wider block">
                      {tr.client}
                    </span>
                    <h3 className="font-cinzel text-base sm:text-lg font-bold text-white line-clamp-1">
                      {tr.title}
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="text-xs text-[#E6CA65] uppercase tracking-wider font-semibold">
                    {tr.technique}
                  </div>

                  <p className="text-xs text-gray-300 font-light leading-relaxed">
                    {tr.description}
                  </p>

                  <div className="p-3.5 bg-[#141414] rounded-lg border border-[#D4AF37]/20 text-[11px] text-gray-400">
                    <strong className="text-white block mb-1.5 font-medium">
                      Използвани продукти:
                    </strong>
                    <ul className="space-y-1">
                      {tr.productsUsed.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-[#D4AF37]">·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href="#book"
                  className="w-full py-2.5 rounded-lg border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                >
                  Искам същия резултат
                  <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
