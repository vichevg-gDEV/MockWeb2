import React, { useState } from 'react';

export const Contact: React.FC = () => {
  const [formSent, setFormSent] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !msg) return;
    setFormSent(true);
  };

  return (
    <section id="contact" className="py-24 bg-[#0a0a0a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
              Локация & Връзка
            </span>
            <h2 className="font-cinzel text-3xl sm:text-4xl text-white font-bold" style={{ textWrap: 'balance' }}>
              Посетете <span className="gold-gradient-text">Салона</span>
            </h2>
            <p className="text-gray-300 text-sm font-light leading-relaxed">
              Разположен в сърцето на Варна (до Морската градина), VIP Beauty House ви очаква в уютна, изискана атмосфера за вашата пълна трансформация и професионална грижа за косата.
            </p>

            <div className="space-y-4 pt-4 text-sm">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65] shrink-0">
                  <i className="fa-solid fa-location-dot"></i>
                </div>
                <div>
                  <strong className="text-white block font-medium">Адрес:</strong>
                  <span className="text-gray-400 text-xs">България, гр. Варна 9000, бул. „Княз Борис I“ № 48 (в центъра, до Морската градина)</span>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65] shrink-0">
                  <i className="fa-solid fa-phone"></i>
                </div>
                <div>
                  <strong className="text-white block font-medium">Телефон:</strong>
                  <a href="tel:+359888889999" className="text-[#E6CA65] text-xs hover:underline tabular-nums">
                    +359 88 888 9999
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65] shrink-0">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <strong className="text-white block font-medium">Имейл:</strong>
                  <span className="text-gray-400 text-xs">info@vipbeautyhouse.bg / sales@vipbeautyhouse.bg</span>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65] shrink-0">
                  <i className="fa-regular fa-clock"></i>
                </div>
                <div>
                  <strong className="text-white block font-medium">Работно време:</strong>
                  <span className="text-gray-400 text-xs block">Понеделник – Събота: 10:00 – 20:00 ч.</span>
                  <span className="text-gray-400 text-xs block">Неделя: 11:00 – 18:00 ч. (с предварително записване)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Google Maps & Quick Message */}
          <div className="lg:col-span-7 space-y-6">
            <div className="w-full h-72 rounded-2xl overflow-hidden gold-border relative shadow-xl">
              <iframe
                title="VIP Beauty House Varna Location Map"
                className="w-full h-full border-0 filter invert contrast-125 brightness-90"
                src="https://maps.google.com/maps?q=bul.+Knyaz+Boris+I+48,+Varna,+Bulgaria&t=&z=15&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
              ></iframe>
            </div>

            {/* Quick Inquiry Form */}
            <div className="bg-[#101010] p-6 sm:p-7 rounded-2xl gold-border">
              {formSent ? (
                <div className="text-center py-6 space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] mx-auto text-xl">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h4 className="font-cinzel text-lg font-bold text-white">Благодарим Ви, {name}!</h4>
                  <p className="text-xs text-gray-300">
                    Съобщението Ви е получено. Наш стилист ще се свърже с Вас в най-кратък срок.
                  </p>
                  <button
                    onClick={() => {
                      setFormSent(false);
                      setName('');
                      setPhone('');
                      setMsg('');
                    }}
                    className="px-5 py-2 rounded-full text-xs font-semibold text-black gold-btn-gradient"
                  >
                    Изпрати друго съобщение
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h4 className="font-cinzel text-base font-bold text-white uppercase tracking-wider">
                    Бързо запитване / Консултация
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Вашето име *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#161616] border border-[#D4AF37]/20 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Телефон за връзка *"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#161616] border border-[#D4AF37]/20 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Вашето съобщение или въпрос относно удължаване, наличност на коси и цветове..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="w-full bg-[#161616] border border-[#D4AF37]/20 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                  ></textarea>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient cursor-pointer shadow"
                  >
                    Изпрати съобщение
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
