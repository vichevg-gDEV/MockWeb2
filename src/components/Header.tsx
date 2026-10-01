import React, { useState } from 'react';
import { getAssetUrl } from '../utils/assetPath';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenBooking: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, onOpenBooking }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Utility Bar */}
      <div className="bg-black/95 border-b border-[#D4AF37]/20 text-xs py-2 px-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-6 text-gray-300">
            <span className="flex items-center">
              <i className="fa-solid fa-location-dot text-[#D4AF37] mr-2" aria-hidden="true"></i>
              бул. „Княз Борис I“ 48, гр. Варна
            </span>
            <span className="hidden md:inline-flex items-center text-gray-400">
              <i className="fa-regular fa-clock text-[#D4AF37] mr-2" aria-hidden="true"></i>
              Пон - Съб: 10:00 - 20:00
            </span>
          </div>

          <div className="flex items-center space-x-5">
            <a
              href="tel:+359888889999"
              className="text-[#E6CA65] font-semibold hover:text-white transition flex items-center"
            >
              <i className="fa-solid fa-phone text-xs mr-2" aria-hidden="true"></i>
              +359 88 888 9999
            </a>
            <div className="flex items-center space-x-3 text-[#D4AF37] text-sm pl-4 border-l border-[#D4AF37]/20">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-white transition">
                <i className="fa-brands fa-tiktok"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Header (Strict 3-zone contract) */}
      <header className="bg-black/95 border-b border-[#D4AF37]/15 sticky top-[37px] z-40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          
          {/* Zone 1: Brand Wordmark & Emblem */}
          <a href="#home" className="flex items-center gap-3.5 group">
            <div className="relative w-11 h-11 flex items-center justify-center overflow-hidden">
              <img
                src={getAssetUrl('logo.png')}
                alt="VIP Beauty House Logo"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-cinzel text-lg sm:text-xl font-bold tracking-[0.2em] gold-gradient-text">
                VIP BEAUTY HOUSE
              </span>
              <span className="text-[9px] tracking-[0.35em] text-gray-400 uppercase font-light">
                Beauty • Luxury • Confidence
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links (single line text links) */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs uppercase tracking-widest font-medium">
            <a href="#home" className="text-white hover:text-[#E6CA65] transition py-1">
              Начало
            </a>
            <a href="#about" className="text-gray-300 hover:text-[#E6CA65] transition py-1">
              За нас
            </a>
            <a href="#services" className="text-gray-300 hover:text-[#E6CA65] transition py-1">
              Услуги
            </a>
            <a href="#shop" className="text-gray-300 hover:text-[#E6CA65] transition py-1">
              Онлайн Магазин
            </a>
            <a href="#gallery" className="text-gray-300 hover:text-[#E6CA65] transition py-1">
              Галерия
            </a>
            <a href="#contact" className="text-gray-300 hover:text-[#E6CA65] transition py-1">
              Контакти
            </a>
          </nav>

          {/* Zone 3: Interactive Actions */}
          <div className="flex items-center space-x-3.5">
            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              aria-label="Отвори кошница"
              className="relative p-2.5 text-gray-200 hover:text-[#E6CA65] transition rounded-full hover:bg-neutral-900 border border-neutral-800 focus:outline-none"
            >
              <i className="fa-solid fa-bag-shopping text-base" aria-hidden="true"></i>
              <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            </button>

            {/* Book Appointment CTA */}
            <a
              href="#book"
              onClick={onOpenBooking}
              className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-black gold-btn-gradient shadow-lg whitespace-nowrap"
            >
              <i className="fa-regular fa-calendar-check mr-2" aria-hidden="true"></i>
              Запази час
            </a>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Мобилно меню"
              className="lg:hidden text-gray-300 hover:text-[#E6CA65] p-2 focus:outline-none"
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-2xl`}></i>
            </button>
          </div>

        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0c0c0c]/98 border-b border-[#D4AF37]/20 px-6 py-5 space-y-3.5 text-center transition-all animate-fadeIn">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-white hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              Начало
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              За нас
            </a>
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              Услуги & Ценоразпис
            </a>
            <a
              href="#shop"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              Онлайн Бутик
            </a>
            <a
              href="#gallery"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              Галерия
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-[#E6CA65] text-xs font-semibold uppercase tracking-widest"
            >
              Контакти
            </a>
            <a
              href="#book"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="inline-block w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient mt-2"
            >
              Запази час сега
            </a>
          </div>
        )}
      </header>
    </>
  );
};
