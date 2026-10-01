import React from 'react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const totalSum = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const freeShippingThreshold = 150;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - totalSum);
  const progressPercent = Math.min(100, Math.round((totalSum / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e0e0e] border-l border-[#D4AF37]/30 p-6 flex flex-col justify-between shadow-2xl animate-slideLeft">
          
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
              <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-bag-shopping text-[#E6CA65]" aria-hidden="true"></i>
                Вашата Количка ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-neutral-900 border border-[#D4AF37]/50 text-[#E6CA65] hover:text-black hover:bg-[#D4AF37] flex items-center justify-center transition shadow cursor-pointer"
                aria-label="Затвори количката"
                title="Затвори количката"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Free Shipping Progress */}
            <div className="py-3 border-b border-[#D4AF37]/10 text-xs">
              {remainingForFreeShipping > 0 ? (
                <p className="text-gray-300">
                  Добавете продукти за още <strong className="text-[#E6CA65]">{remainingForFreeShipping} лв.</strong> за <strong className="text-white">БЕЗПЛАТНА доставка</strong>!
                </p>
              ) : (
                <p className="text-[#E6CA65] font-semibold flex items-center gap-1.5">
                  <i className="fa-solid fa-truck-fast"></i> Поздравления! Поръчката ви е с БЕЗПЛАТНА доставка.
                </p>
              )}
              <div className="w-full bg-[#1b1b1b] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-[#D4AF37] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Items List */}
            <div className="py-4 space-y-3 max-h-[52vh] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#161616] border border-[#D4AF37]/20 flex items-center justify-center text-gray-500 mx-auto text-2xl">
                    <i className="fa-solid fa-bag-shopping"></i>
                  </div>
                  <p className="text-xs text-gray-400 font-light">
                    Вашата количка е празна.
                  </p>
                  <a
                    href="#shop"
                    onClick={onClose}
                    className="inline-block text-xs text-[#E6CA65] hover:underline uppercase font-medium pt-2"
                  >
                    Разгледай магазина &rarr;
                  </a>
                </div>
              ) : (
                items.map((item) => {
                  const lineTotal = item.product.price * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg border border-[#D4AF37]/20 text-xs"
                    >
                      <div className="w-14 h-14 rounded bg-[#1c1c1c] overflow-hidden shrink-0 border border-[#D4AF37]/15">
                        <img
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate text-xs">{item.product.title}</h4>
                        <div className="text-gray-400 text-[11px] mt-0.5">
                          {item.product.price} лв. / бр.
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, -1)}
                            className="w-5 h-5 rounded bg-[#202020] text-gray-300 hover:text-white flex items-center justify-center border border-neutral-700 cursor-pointer"
                            aria-label="Намали количество"
                          >
                            -
                          </button>
                          <span className="text-xs text-white font-medium w-4 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                              item.quantity >= item.product.stock
                                ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                                : 'bg-[#202020] text-gray-300 hover:text-white border-neutral-700 cursor-pointer'
                            }`}
                            aria-label="Увеличи количество"
                            title={item.quantity >= item.product.stock ? `Наличност: само ${item.product.stock} бр.` : undefined}
                          >
                            +
                          </button>
                          {item.quantity >= item.product.stock && (
                            <span className="text-[10px] text-amber-400 font-medium ml-1">
                              Макс ({item.product.stock} бр.)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between h-14">
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-gray-500 hover:text-red-400 p-1 transition"
                          aria-label="Премахни от количката"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                        <span className="font-cinzel text-[#E6CA65] font-bold text-xs tabular-nums">
                          {lineTotal} лв.
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cart Bottom Checkout */}
          <div className="pt-4 border-t border-[#D4AF37]/20 space-y-3.5">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Междинна сума:</span>
              <span className="font-cinzel text-[#E6CA65] font-bold text-base tabular-nums">
                {totalSum} лв.
              </span>
            </div>

            <p className="text-[11px] text-gray-400 italic">
              * Доставка с Еконт или Спиди за 24-48 часа с опция за преглед преди плащане.
            </p>

            <button
              disabled={items.length === 0}
              onClick={onProceedToCheckout}
              className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Към завършване на поръчката</span>
              <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
