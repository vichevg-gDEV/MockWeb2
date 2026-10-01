import React from 'react';
import { HairModelsScroll } from './HairModelsScroll';

interface HeroProps {
  onOpenBooking: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section id="home" className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden bg-black py-16 sm:py-20 lg:py-24">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 text-center">
        
        {/* Official VIP Beauty House Logo Emblem (Pure transparent cutout, seamlessly melting into pure black background) */}
        <div className="relative mx-auto my-3 flex items-center justify-center">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-[420px] md:h-[420px] transition-transform duration-700 hover:scale-[1.01] select-none [mask-image:radial-gradient(circle_at_center,black_75%,transparent_98%)]">
            <img
              src="/logo.png"
              alt="VIP Beauty House Official Logo"
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_25px_rgba(212,175,55,0.35)]"
              loading="eager"
            />
          </div>
        </div>

        {/* Scrolling pictures of hair models underneath the logo */}
        <div className="w-full my-4">
          <HairModelsScroll onBookLook={onOpenBooking} />
        </div>

        {/* Quiet Kicker (Zero-Pill discipline: unboxed metadata) */}
        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-[#E6CA65] mb-3 font-semibold mt-4">
          <span>Славянска Коса</span>
          <span aria-hidden="true">·</span>
          <span>Висша Колористика</span>
          <span aria-hidden="true">·</span>
          <span>Салон Варна</span>
        </div>

        {/* Display Headline */}
        <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4" style={{ textWrap: 'balance' }}>
          <span className="gold-gradient-text">VIP BEAUTY HOUSE</span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-300 font-light mb-8 leading-relaxed">
          Съвършенство, стил и първокласни удължения за коса в сърцето на Варна. Потопете се в свят на неподражаем лукс и персонална естетична грижа.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <a
            href="#book"
            onClick={onOpenBooking}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest text-black gold-btn-gradient shadow-2xl flex items-center justify-center"
          >
            <i className="fa-regular fa-calendar-check mr-2 text-sm" aria-hidden="true"></i>
            Запази посещение
          </a>
          <a
            href="#shop"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#E6CA65] border border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition flex items-center justify-center"
          >
            <i className="fa-solid fa-crown mr-2 text-xs" aria-hidden="true"></i>
            Онлайн Магазин
          </a>
        </div>

        {/* Quick Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 pt-8 border-t border-[#D4AF37]/15 text-left max-w-5xl mx-auto">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <i className="fa-solid fa-check-double text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-wider">100% Remy Коса</h4>
              <p className="text-[11px] text-gray-400">Славянски & Европейски клас</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <i className="fa-solid fa-wand-magic-sparkles text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-wider">Консултация</h4>
              <p className="text-[11px] text-gray-400">Безплатна с мостри на живо</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <i className="fa-solid fa-award text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-wider">Топ Колористи</h4>
              <p className="text-[11px] text-gray-400">AirTouch, Балеаж, Тониране</p>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <i className="fa-solid fa-truck-fast text-base" aria-hidden="true"></i>
            </div>
            <div>
              <h4 className="text-xs uppercase font-bold text-white tracking-wider">Бърза Доставка</h4>
              <p className="text-[11px] text-gray-400">1-2 дни за цяла България</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

