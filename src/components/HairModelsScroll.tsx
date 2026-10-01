import React, { useRef, useState, useEffect } from 'react';
import { getAssetUrl, handleImageError } from '../utils/assetPath';

interface HairModel {
  id: string;
  image: string;
  title: string;
  length: string;
  technique: string;
}

const HAIR_MODELS: HairModel[] = [
  {
    id: 'hm-1',
    image: './src/assets/images/model_blonde_balayage_1790363897560.jpg',
    title: 'Платинен Шампан Балеаж',
    length: '60 см • Славянски клас',
    technique: 'AirTouch + Премиум Треси'
  },
  {
    id: 'hm-2',
    image: './src/assets/images/model_brunette_volume_1790363910076.jpg',
    title: 'Шоколадов Обем & Карамел',
    length: '55 см • Плътен край',
    technique: 'Холивудски Вълни & Сгъстяване'
  },
  {
    id: 'hm-3',
    image: './src/assets/images/model_honey_extensions_1790363921271.jpg',
    title: 'Медено Златист Блясък',
    length: '65 см • Екстра Дължина',
    technique: 'Славянска Коса Remy'
  },
  {
    id: 'hm-4',
    image: './src/assets/images/model_copper_waves_1790363930930.jpg',
    title: 'Меден Бронзов Меланж',
    length: '50 см • Натурална чупка',
    technique: 'Тониране + Микропръстени'
  },
  {
    id: 'hm-5',
    image: './src/assets/images/model_sleek_black_1790363938545.jpg',
    title: 'Огледално Гладка Glass Hair',
    length: '70 см • Копринена мекота',
    technique: 'Италиански Кератинов Монтаж'
  },
  {
    id: 'hm-6',
    image: './src/assets/images/hero_luxury_hair_1790362385902.jpg',
    title: 'Пшенично Русо с Обем',
    length: '50 см • Ултралек монтаж',
    technique: 'VIP Seamless Tape-In'
  },
  {
    id: 'hm-7',
    image: './src/assets/images/transformation_balayage_1790362416484.jpg',
    title: 'Скандинавско Пепеляво Русо',
    length: '60 см • Пълна трансформация',
    technique: '3 реда ръчно шити треси'
  }
];

export const HairModelsScroll: React.FC<{ onBookLook?: (lookName: string) => void }> = ({ onBookLook }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<HairModel | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!selectedModel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedModel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedModel]);

  // We duplicate array for continuous seamless infinite loop
  const displayModels = [...HAIR_MODELS, ...HAIR_MODELS];

  return (
    <div className="relative w-full my-8 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Title / Cue */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#E6CA65]">
          <span className="w-6 h-[1px] bg-[#E6CA65]"></span>
          <span>Галерия модели • Реални визии VIP Beauty House</span>
        </div>

        {/* Manual Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-[#141414] border border-[#D4AF37]/30 text-[#E6CA65] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center transition shadow-md"
            aria-label="Предишна визия"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-[#141414] border border-[#D4AF37]/30 text-[#E6CA65] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center transition shadow-md"
            aria-label="Следваща визия"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      {/* Marquee Container with edge fades */}
      <div className="relative overflow-hidden rounded-2xl py-2">
        {/* Left edge shadow fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
        {/* Right edge shadow fade */}
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

        {/* Scrolling track */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-none flex gap-4 sm:gap-5 py-2 select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="animate-marquee flex gap-4 sm:gap-5">
            {displayModels.map((model, index) => (
              <div
                key={`${model.id}-${index}`}
                onClick={() => setSelectedModel(model)}
                className="group relative w-48 sm:w-56 md:w-60 h-64 sm:h-72 md:h-80 rounded-xl overflow-hidden gold-border bg-[#121212] cursor-pointer shrink-0 transition-transform duration-300 hover:scale-[1.03] hover:border-[#D4AF37] shadow-lg"
              >
                <img
                  src={getAssetUrl(model.image)}
                  alt={model.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                  loading="lazy"
                  onError={handleImageError}
                />

                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>

                {/* Tag at top */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-black bg-[#D4AF37] px-2 py-0.5 rounded shadow">
                    VIP Look
                  </span>
                </div>

                {/* Content at bottom */}
                <div className="absolute bottom-3 left-3 right-3 z-10 text-left">
                  <h4 className="font-cinzel text-xs sm:text-sm font-bold text-white group-hover:text-[#E6CA65] transition line-clamp-1">
                    {model.title}
                  </h4>
                  <p className="text-[11px] text-gray-300 font-light mt-0.5 truncate">
                    {model.length}
                  </p>
                  <p className="text-[10px] text-[#E6CA65] font-medium mt-0.5 truncate">
                    {model.technique}
                  </p>
                </div>

                {/* Hover affordance */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-semibold text-[#E6CA65] bg-black/80 px-3 py-1.5 rounded-full border border-[#D4AF37]/50 shadow-lg">
                    <i className="fa-solid fa-magnifying-glass-plus mr-1"></i> Преглед
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox / Model Details Modal */}
      {selectedModel && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedModel(null);
          }}
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md flex justify-center items-start pt-24 sm:pt-28 md:pt-32 pb-16 px-4 animate-fadeIn"
        >
          <div className="bg-[#121212] border-2 border-[#D4AF37]/60 rounded-2xl max-w-lg w-full p-5 sm:p-7 relative shadow-[0_20px_60px_rgba(0,0,0,0.95)] my-auto sm:my-0">
            {/* Prominent Visible X Close Button */}
            <button
              onClick={() => setSelectedModel(null)}
              className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black border-2 border-[#D4AF37] text-[#E6CA65] hover:bg-[#D4AF37] hover:text-black hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-200 shadow-2xl z-30 cursor-pointer group"
              aria-label="Затвори прегледа"
              title="Затвори (Esc)"
            >
              <i className="fa-solid fa-xmark text-base sm:text-lg group-hover:rotate-90 transition-transform duration-200"></i>
            </button>

            <div className="space-y-4">
              <div className="w-full h-72 sm:h-80 max-h-[50vh] rounded-xl overflow-hidden bg-black gold-border relative">
                <img
                  src={getAssetUrl(selectedModel.image)}
                  alt={selectedModel.title}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>

              <div>
                <span className="text-[10px] text-[#E6CA65] uppercase tracking-widest font-semibold block mb-1">
                  VIP Beauty House Варна
                </span>
                <h3 className="font-cinzel text-xl font-bold text-white">
                  {selectedModel.title}
                </h3>
              </div>

              <div className="bg-[#181818] p-3.5 rounded-lg border border-[#D4AF37]/20 text-xs space-y-1.5 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Дължина & Коса:</span>
                  <span className="text-white font-medium">{selectedModel.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Техника на работа:</span>
                  <span className="text-[#E6CA65] font-medium">{selectedModel.technique}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Произход:</span>
                  <span className="text-white font-medium">100% Естествена Remy коса</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <a
                  href="#book"
                  onClick={() => {
                    if (onBookLook) onBookLook(selectedModel.title);
                    setSelectedModel(null);
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient text-center shadow cursor-pointer active:scale-95 transition-transform"
                >
                  <i className="fa-regular fa-calendar-check mr-2"></i> Запази час за тази визия
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-700 transition cursor-pointer"
                >
                  Затвори
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
