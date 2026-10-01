import React, { useState } from 'react';
import { SALON_SERVICES, PRICE_LIST } from '../data/salonData';

interface ServicesProps {
  onSelectServiceForBooking: (serviceName: string) => void;
}

export const Services: React.FC<ServicesProps> = ({ onSelectServiceForBooking }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrices = PRICE_LIST.filter(item =>
    item.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="services" className="py-24 bg-[#070707] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
            Нашето портфолио
          </span>
          <h2 className="font-cinzel text-3xl sm:text-5xl text-white font-bold mt-2 mb-4" style={{ textWrap: 'balance' }}>
            Премиум <span className="gold-gradient-text">Салонни Услуги</span>
          </h2>
          <div className="w-20 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-400 text-sm sm:text-base font-light">
            Всяка процедура започва с персонална консултация, съобразена със структурата на вашата коса и индивидуалните ви естетични желания.
          </p>
        </div>

        {/* 6 Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SALON_SERVICES.map((srv) => (
            <div
              key={srv.id}
              className="bg-[#0f0f0f] p-8 rounded-xl gold-border gold-border-glow transition flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65] text-2xl mb-6">
                  <i className={`fa-solid ${srv.iconClass}`} aria-hidden="true"></i>
                </div>
                <h3 className="font-cinzel text-xl text-white font-bold mb-3">{srv.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 font-light">
                  {srv.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#D4AF37]/20 flex justify-between items-center text-xs">
                <span className="text-[#E6CA65] font-semibold">{srv.startingPrice}</span>
                <button
                  onClick={() => onSelectServiceForBooking(srv.title)}
                  className="text-white hover:text-[#E6CA65] font-medium uppercase tracking-wider flex items-center gap-1 transition"
                >
                  Запази час <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ценоразпис на Салона (Price Table) */}
        <div className="mt-20 bg-[#0e0e0e] rounded-2xl p-6 sm:p-10 gold-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-cinzel text-2xl text-white font-bold">
                Ценоразпис на Салона <span className="gold-gradient-text">(VIP Beauty House)</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">Официални цени за салонни процедури и удължаване в гр. Варна</p>
            </div>
            
            {/* Search filter inside table */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Търси процедура..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161616] border border-[#D4AF37]/25 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <i className="fa-solid fa-magnifying-glass text-gray-400 absolute left-3 top-3 text-xs" aria-hidden="true"></i>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-[#141414] text-[#E6CA65] font-cinzel">
                <tr>
                  <th scope="col" className="py-3.5 px-4 rounded-l-lg">Услуга</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Цена</th>
                  <th scope="col" className="py-3.5 px-4 text-right rounded-r-lg">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {filteredPrices.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#151515] transition">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        {item.service}
                        {item.highlight && (
                          <span className="text-[10px] text-[#E6CA65] uppercase tracking-wider font-bold">
                            · ТОП
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-semibold tabular-nums ${item.highlight ? 'text-[#E6CA65]' : 'text-white'}`}>
                      {item.price}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectServiceForBooking(item.service)}
                        className="text-xs text-[#E6CA65] hover:text-white hover:underline uppercase tracking-wider font-medium cursor-pointer"
                      >
                        Запази
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPrices.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-gray-500">
                      Няма намерени услуги с търсения термин.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
