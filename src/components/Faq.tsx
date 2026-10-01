import React, { useState } from 'react';
import { FAQS } from '../data/salonData';

export const Faq: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(1);

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-20 bg-[#070707] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
            Полезна Информация
          </span>
          <h2 className="font-cinzel text-3xl sm:text-4xl text-white font-bold mt-2 mb-4" style={{ textWrap: 'balance' }}>
            Често Задавани Въпроси
          </h2>
          <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto"></div>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-[#0f0f0f] rounded-xl gold-border overflow-hidden transition"
              >
                <button
                  onClick={() => toggle(faq.id)}
                  className="w-full py-4 px-6 text-left flex justify-between items-center text-sm font-semibold text-white focus:outline-none"
                >
                  <span className="pr-4">{faq.question}</span>
                  <i
                    className={`fa-solid fa-chevron-down text-[#E6CA65] text-xs transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  ></i>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 text-xs sm:text-sm text-gray-300 leading-relaxed font-light border-t border-[#D4AF37]/10 pt-3.5 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
