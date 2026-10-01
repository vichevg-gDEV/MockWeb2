import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-[#D4AF37]/20 text-gray-400 text-xs py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-[#D4AF37]/30 flex items-center justify-center bg-black/40 overflow-hidden shrink-0 p-0.5 shadow-md">
                <img
                  src="/logo.png"
                  alt="VIP Beauty House Logo"
                  className="w-full h-full object-contain mix-blend-screen"
                />
              </div>
              <span className="font-cinzel text-lg font-bold text-white tracking-widest">
                VIP BEAUTY
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400 font-light">
              Луксозен салон за удължаване на коса, балеаж и естетика в гр. Варна. Доверете се на съвършенството на естествената славянска коса.
            </p>
            <div className="flex space-x-3 text-[#E6CA65] text-sm">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-[#161616] border border-[#D4AF37]/20 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition"
              >
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-[#161616] border border-[#D4AF37]/20 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition"
              >
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-8 h-8 rounded-full bg-[#161616] border border-[#D4AF37]/20 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition"
              >
                <i className="fa-brands fa-tiktok"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-cinzel text-white text-xs font-bold uppercase tracking-widest mb-4">
              Бързи Връзки
            </h5>
            <ul className="space-y-2.5 text-[11px]">
              <li><a href="#about" className="hover:text-[#E6CA65] transition">За Салона</a></li>
              <li><a href="#services" className="hover:text-[#E6CA65] transition">Ценоразпис Услуги</a></li>
              <li><a href="#shop" className="hover:text-[#E6CA65] transition">Славянска Коса Онлайн</a></li>
              <li><a href="#gallery" className="hover:text-[#E6CA65] transition">Галерия Трансформации</a></li>
              <li><a href="#book" className="hover:text-[#E6CA65] transition">Запазване на час</a></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h5 className="font-cinzel text-white text-xs font-bold uppercase tracking-widest mb-4">
              Информация & Условия
            </h5>
            <ul className="space-y-2.5 text-[11px]">
              <li><a href="#faq" className="hover:text-[#E6CA65] transition">Често Задавани Въпроси</a></li>
              <li><a href="#about" className="hover:text-[#E6CA65] transition">Политика за поверителност (GDPR)</a></li>
              <li><a href="#shop" className="hover:text-[#E6CA65] transition">Общи условия за ползване</a></li>
              <li><a href="#shop" className="hover:text-[#E6CA65] transition">Доставка и плащане с Еконт/Спиди</a></li>
              <li><a href="#contact" className="hover:text-[#E6CA65] transition">Връщане и рекламация</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h5 className="font-cinzel text-white text-xs font-bold uppercase tracking-widest mb-4">
              Контакт с нас
            </h5>
            <p className="text-[11px] text-gray-400 mb-2">Варна, бул. „Княз Борис I“ 48 (до Морската градина)</p>
            <p className="text-[11px] text-[#E6CA65] font-semibold mb-2 tabular-nums">
              <a href="tel:+359888889999">+359 88 888 9999</a>
            </p>
            <p className="text-[11px] text-gray-400 mb-2">info@vipbeautyhouse.bg</p>
            <p className="text-[10px] text-gray-500">Пон - Съб: 10:00 - 20:00 ч. | Нед: С предварително записване</p>
          </div>

        </div>

        <div className="pt-8 border-t border-[#D4AF37]/15 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
          <span>VIP BEAUTY HOUSE © 2026. Всички права запазени.</span>
          <span>Първокласен луксозен стандарт за удължаване на коса.</span>
        </div>

      </div>
    </footer>
  );
};
