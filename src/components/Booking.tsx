import React, { useState, useEffect } from 'react';
import { STYLISTS, SALON_SERVICES } from '../data/salonData';
import { BookingFormState } from '../types';

interface BookingProps {
  selectedServicePreload?: string;
  onClearPreload?: () => void;
}

export const Booking: React.FC<BookingProps> = ({ selectedServicePreload, onClearPreload }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<BookingFormState>({
    service: '',
    stylist: 'any',
    date: todayStr,
    time: '11:00',
    name: '',
    phone: '',
    notes: '',
    agreedToTerms: false
  });

  const [submittedData, setSubmittedData] = useState<{
    code: string;
    date: string;
    time: string;
    service: string;
    stylistName: string;
    name: string;
    phone: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedServicePreload) {
      setForm((prev) => ({ ...prev, service: selectedServicePreload }));
    }
  }, [selectedServicePreload]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service || !form.name || !form.phone || !form.agreedToTerms) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const selectedStylistObj = STYLISTS.find(s => s.id === form.stylist) || STYLISTS[0];
      const reservationCode = 'VIP-' + Math.floor(100000 + Math.random() * 900000);
      setSubmittedData({
        code: reservationCode,
        date: form.date,
        time: form.time,
        service: form.service,
        stylistName: selectedStylistObj.name,
        name: form.name,
        phone: form.phone
      });
      setLoading(false);
      if (onClearPreload) onClearPreload();
    }, 700);
  };

  const handleReset = () => {
    setSubmittedData(null);
    setForm({
      service: '',
      stylist: 'any',
      date: todayStr,
      time: '11:00',
      name: '',
      phone: '',
      notes: '',
      agreedToTerms: false
    });
  };

  return (
    <section id="book" className="py-24 bg-[#0a0a0a] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
            Онлайн Резервация
          </span>
          <h2 className="font-cinzel text-3xl sm:text-5xl text-white font-bold mt-2 mb-4" style={{ textWrap: 'balance' }}>
            Запазете <span className="gold-gradient-text">Вашия Час</span>
          </h2>
          <div className="w-20 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-400 text-sm font-light">
            Попълнете формата и наш администратор ще се свърже с Вас за потвърждение на часа до 2 работни часа.
          </p>
        </div>

        <div className="bg-[#101010] rounded-2xl p-6 sm:p-12 gold-border shadow-2xl relative">
          
          {submittedData ? (
            /* Confirmation View */
            <div className="text-center py-6 space-y-6 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] text-3xl mx-auto shadow-lg">
                <i className="fa-solid fa-check" aria-hidden="true"></i>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#E6CA65] uppercase tracking-widest block mb-1">
                  Резервацията е регистрирана успешно
                </span>
                <h3 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
                  Благодарим Ви, {submittedData.name}!
                </h3>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-[#171717] rounded-xl p-6 border border-[#D4AF37]/25 max-w-lg mx-auto text-left space-y-3 text-xs">
                <div className="flex justify-between border-b border-[#D4AF37]/15 pb-2">
                  <span className="text-gray-400">Номер на заявка:</span>
                  <span className="font-mono text-[#E6CA65] font-bold text-sm">{submittedData.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Процедура:</span>
                  <span className="text-white font-medium text-right">{submittedData.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Специалист:</span>
                  <span className="text-white font-medium">{submittedData.stylistName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Дата и час:</span>
                  <span className="text-white font-medium tabular-nums">{submittedData.date} в {submittedData.time} ч.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Телефон за контакт:</span>
                  <span className="text-white font-medium tabular-nums">{submittedData.phone}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#D4AF37]/15 text-[11px] text-gray-400">
                  <span>Адрес на салона:</span>
                  <span className="text-gray-300">Варна, бул. „Княз Борис I“ 48</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 max-w-md mx-auto font-light leading-relaxed">
                Записахме часа Ви в системата на VIP Beauty House. Ще получите SMS и обаждане за потвърждение.
              </p>

              <button
                onClick={handleReset}
                className="px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient shadow"
              >
                Направи нова резервация
              </button>
            </div>
          ) : (
            /* Reservation Form */
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* 1. Избор на услуга */}
              <div>
                <label htmlFor="service-select" className="block font-cinzel text-sm font-bold text-[#E6CA65] mb-2 uppercase tracking-wider">
                  1. Изберете желана услуга *
                </label>
                <select
                  id="service-select"
                  required
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                >
                  <option value="" disabled>-- Моля, изберете процедура --</option>
                  <option value="Безплатна консултация за удължаване на коса (20 мин.)">
                    Безплатна консултация за удължаване на коса с мостри (20 мин. - БЕЗПЛАТНО)
                  </option>
                  <option value="Поставяне на треси с микропръстени">
                    Поставяне на треси с микропръстени (от 60 лв. / ред)
                  </option>
                  <option value="Поставяне на стикери (Tape-In)">
                    Поставяне на стикери (Tape-In пакет - 120 лв.)
                  </option>
                  <option value="Поставяне на кератинови кичури">
                    Поставяне на кератинови кичури (2.50 лв. / кичур)
                  </option>
                  <option value="Поддръжка на екстеншъни (сваляне и монтаж)">
                    Поддръжка на екстеншъни / Сваляне (от 50 лв.)
                  </option>
                  <option value="Балеаж / AirTouch / Тониране">
                    Балеаж / AirTouch / Тониране със защитна терапия (220 - 350 лв.)
                  </option>
                  <option value="Боядисване с луксозна безамонячна боя">
                    Боядисване с луксозна боя (80 - 130 лв.)
                  </option>
                  <option value="Ботокс за коса / Кератинова терапия">
                    Ботокс за коса / Кератиново възстановяване (130 - 220 лв.)
                  </option>
                  <option value="Дамско подстригване + Сешоар">
                    Дамско подстригване + Оформяне със сешоар (60 - 70 лв.)
                  </option>
                  <option value="Професионален вечерен VIP грим">
                    Професионален вечерен VIP грим (90 лв.)
                  </option>
                </select>
              </div>

              {/* 2. Избор на специалист */}
              <div>
                <label className="block font-cinzel text-sm font-bold text-[#E6CA65] mb-3 uppercase tracking-wider">
                  2. Изберете стилист (опционално)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {STYLISTS.map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition ${
                        form.stylist === s.id
                          ? 'bg-[#181818] border-[#D4AF37]'
                          : 'bg-[#141414] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="stylist"
                        value={s.id}
                        checked={form.stylist === s.id}
                        onChange={(e) => setForm({ ...form, stylist: e.target.value })}
                        className="accent-[#D4AF37] mt-0.5"
                      />
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-xs sm:text-sm">{s.name}</span>
                        <span className="text-[11px] text-[#E6CA65]">{s.role}</span>
                        <span className="text-[10px] text-gray-400">{s.experience}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Дата и час */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="book-date-input" className="block font-cinzel text-xs font-bold text-[#E6CA65] mb-2 uppercase tracking-wider">
                    Желана Дата *
                  </label>
                  <input
                    id="book-date-input"
                    type="date"
                    required
                    min={todayStr}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="book-time-input" className="block font-cinzel text-xs font-bold text-[#E6CA65] mb-2 uppercase tracking-wider">
                    Час (10:00 - 19:00) *
                  </label>
                  <input
                    id="book-time-input"
                    type="time"
                    min="10:00"
                    max="19:00"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* 4. Лични данни */}
              <div className="space-y-4">
                <label className="block font-cinzel text-sm font-bold text-[#E6CA65] uppercase tracking-wider">
                  3. Вашите координати
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Вашето име и фамилия *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none placeholder-gray-500 transition"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Телефон за връзка (напр. 0888 123 456) *"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none placeholder-gray-500 transition"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Допълнителни бележки (желана дължина на коса, текущ цвят, предварително боядисвана ли е и др.)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#161616] border border-[#D4AF37]/30 rounded-lg py-3 px-4 text-white text-sm focus:border-[#D4AF37] focus:outline-none placeholder-gray-500 transition"
                ></textarea>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <input
                  type="checkbox"
                  id="book-terms"
                  required
                  checked={form.agreedToTerms}
                  onChange={(e) => setForm({ ...form, agreedToTerms: e.target.checked })}
                  className="accent-[#D4AF37] w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="book-terms" className="cursor-pointer">
                  Съгласен съм с политиката за поверителност на VIP Beauty House и условията за резервация.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-black gold-btn-gradient shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Обработка на резервацията...
                  </>
                ) : (
                  <>
                    <i className="fa-regular fa-paper-plane text-sm" aria-hidden="true"></i>
                    Потвърди резервацията
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>
    </section>
  );
};
