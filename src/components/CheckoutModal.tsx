import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderComplete: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderComplete
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [courier, setCourier] = useState<'econt' | 'speedy'>('econt');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    total: number;
    name: string;
    phone: string;
    courier: string;
  } | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = subtotal >= 150 ? 0 : 7;
  const total = subtotal + shipping;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && city && address) {
      setIsSubmitting(true);
      setTimeout(() => {
        const fakeOrderId = 'VIP-ORD-' + Math.floor(10000 + Math.random() * 90000);
        setOrderSuccess({
          orderId: fakeOrderId,
          total: total,
          name: name,
          phone: phone,
          courier: courier === 'econt' ? 'Еконт' : 'Спиди'
        });
        setIsSubmitting(false);
        onOrderComplete();
      }, 800);
    }
  };

  const handleCloseAfterSuccess = () => {
    setOrderSuccess(null);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-10 sm:pt-16 pb-12 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111111] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-4 sm:p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] my-auto cursor-default"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/95 border-2 border-[#D4AF37]/70 text-[#E6CA65] hover:text-black hover:bg-[#D4AF37] hover:border-[#D4AF37] flex items-center justify-center transition-all duration-300 shadow-xl group cursor-pointer z-30"
          aria-label="Затвори и продължи с пазаруването"
          title="Затвори (Върни се към продуктите)"
        >
          <i className="fa-solid fa-xmark text-base sm:text-lg font-bold group-hover:scale-110 transition-transform"></i>
        </button>

        {orderSuccess ? (
          <div className="text-center py-4 space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] text-xl mx-auto">
              <i className="fa-solid fa-check"></i>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#E6CA65] font-semibold block mb-0.5">
                Поръчката е приета успешно
              </span>
              <h3 className="font-cinzel text-xl font-bold text-white">
                Благодарим Ви, {orderSuccess.name}!
              </h3>
            </div>
            <div className="bg-[#181818] p-4 rounded-xl border border-[#D4AF37]/20 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-[#D4AF37]/15 pb-1.5">
                <span className="text-gray-400">Номер на поръчка:</span>
                <span className="font-mono text-[#E6CA65] font-bold">{orderSuccess.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Куриер за доставка:</span>
                <span className="text-white font-medium">{orderSuccess.courier} (с опция Преглед)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Телефон за връзка:</span>
                <span className="text-white font-medium tabular-nums">{orderSuccess.phone}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#D4AF37]/15 font-semibold">
                <span className="text-white">Крайна сума за плащане:</span>
                <span className="font-cinzel text-[#E6CA65] text-sm tabular-nums">{orderSuccess.total} лв.</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-light leading-relaxed">
              Наш оператор ще се свърже с Вас за потвърждение на адреса за доставка в рамките на 2 работни часа. Пратката ще бъде изпратена с опция за преглед.
            </p>
            <button
              onClick={handleCloseAfterSuccess}
              className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient shadow"
            >
              Затвори и се върни в магазина
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="pr-10">
              <span className="text-[11px] text-[#E6CA65] font-semibold uppercase tracking-widest block mb-0.5">
                Бърза Поръчка
              </span>
              <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white">
                Данни за доставка
              </h3>
            </div>

            {/* Compact items preview */}
            <div className="bg-[#181818] p-2.5 rounded-xl border border-[#D4AF37]/15 max-h-24 overflow-y-auto space-y-1.5 text-xs">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center text-gray-300">
                  <span className="truncate max-w-[220px] text-white text-[11px]">
                    {item.quantity}x {item.product.title}
                  </span>
                  <span className="font-cinzel text-[#E6CA65] font-bold text-xs tabular-nums">
                    {item.product.price * item.quantity} лв.
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Име и фамилия *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                />
                <input
                  type="tel"
                  required
                  placeholder="Телефон за контакт *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="email"
                  placeholder="Имейл (за потвърждение)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Град / Населено място *"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <input
                type="text"
                required
                placeholder="Точен адрес за доставка или офис на куриер *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
              />

              {/* Courier selection */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#E6CA65] font-semibold mb-1.5">
                  Избор на куриер
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                      courier === 'econt'
                        ? 'bg-[#202020] border-[#D4AF37]'
                        : 'bg-[#181818] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={courier === 'econt'}
                      onChange={() => setCourier('econt')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="text-white text-[11px] font-medium">Еконт Експрес</span>
                  </label>
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                      courier === 'speedy'
                        ? 'bg-[#202020] border-[#D4AF37]'
                        : 'bg-[#181818] border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      checked={courier === 'speedy'}
                      onChange={() => setCourier('speedy')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="text-white text-[11px] font-medium">Спиди (Speedy)</span>
                  </label>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#E6CA65] font-semibold mb-1.5">
                  Начин на плащане
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'bg-[#202020] border-[#D4AF37]'
                        : 'bg-[#181818] border-[#D4AF37]/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="text-white text-[10px] sm:text-[11px]">
                      Наложен платеж (в брой/карта)
                    </span>
                  </label>
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'card'
                        ? 'bg-[#202020] border-[#D4AF37]'
                        : 'bg-[#181818] border-[#D4AF37]/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="text-white text-[10px] sm:text-[11px]">Банкова карта онлайн</span>
                  </label>
                </div>
              </div>

              <textarea
                rows={1}
                placeholder="Забележка към куриера (код за вход, звънец и др.)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#181818] border border-[#D4AF37]/25 rounded-lg py-1.5 px-3 text-xs text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            {/* Order totals summary */}
            <div className="pt-2 border-t border-[#D4AF37]/20 space-y-1 text-xs text-gray-300">
              <div className="flex justify-between text-[11px]">
                <span>Междинна сума:</span>
                <span className="tabular-nums font-medium text-white">{subtotal} лв.</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Доставка:</span>
                <span className="tabular-nums text-white">
                  {shipping === 0 ? <strong className="text-[#E6CA65]">БЕЗПЛАТНА</strong> : `${shipping} лв.`}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-800 text-xs sm:text-sm font-semibold text-white">
                <span>Общо за плащане:</span>
                <span className="font-cinzel text-[#E6CA65] text-sm sm:text-base tabular-nums">{total} лв.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Изпращане на поръчката...
                </>
              ) : (
                <>
                  <span>Потвърди Поръчката ({total} лв.)</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
