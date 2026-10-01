import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { PRODUCTS } from '../data/salonData';

interface ShopProps {
  products?: Product[];
  cartItems?: CartItem[];
  onAddToCart: (product: Product) => void;
  onResetStock?: () => void;
}

export const Shop: React.FC<ShopProps> = ({
  products = PRODUCTS,
  cartItems = [],
  onAddToCart,
  onResetStock
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedToast, setAddedToast] = useState<{ title: string; type: 'added' | 'max' } | null>(null);

  const categories = [
    { id: 'all', label: 'Всички' },
    { id: 'extensions', label: 'Екстеншъни' },
    { id: 'cosmetics', label: 'Козметика' },
    { id: 'tools', label: 'Уреди' },
    { id: 'accessories', label: 'Аксесоари' }
  ];

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter((p) => p.category === activeCategory);

  const handleAdd = (product: Product) => {
    const inCart = cartItems.find((ci) => ci.product.id === product.id)?.quantity || 0;
    if (product.stock <= 0) return;

    if (inCart >= product.stock) {
      setAddedToast({ title: product.title, type: 'max' });
      setTimeout(() => setAddedToast(null), 3000);
      return;
    }

    onAddToCart(product);
    setAddedToast({ title: product.title, type: 'added' });
    setTimeout(() => {
      setAddedToast(null);
    }, 2800);
  };

  return (
    <section id="shop" className="py-24 bg-[#0a0a0a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Toast Notification */}
        {addedToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#161616] border border-[#D4AF37]/50 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-slideUp">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              addedToast.type === 'max'
                ? 'bg-amber-950/50 border border-amber-500 text-amber-400'
                : 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#E6CA65]'
            }`}>
              <i className={`fa-solid ${addedToast.type === 'max' ? 'fa-triangle-exclamation' : 'fa-check'}`}></i>
            </div>
            <div>
              <p className="text-xs font-semibold">{addedToast.title}</p>
              <p className="text-[11px] text-gray-400">
                {addedToast.type === 'max'
                  ? 'Достигнахте максималното налично количество!'
                  : 'е добавен в кошницата!'}
              </p>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E6CA65]">
            Ексклузивна Селекция
          </span>
          <h2 className="font-cinzel text-3xl sm:text-5xl text-white font-bold mt-2 mb-4" style={{ textWrap: 'balance' }}>
            Онлайн <span className="gold-gradient-text">Бутик</span>
          </h2>
          <div className="w-20 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-400 text-sm sm:text-base font-light">
            Поръчайте 100% сертифицирана славянска и европейска естествена коса, професионална козметика и салонни уреди с експресна доставка до всяка точка на България.
          </p>

          {/* Quick status & tester reset helper */}
          {onResetStock && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onResetStock}
                className="text-[11px] text-neutral-400 hover:text-[#E6CA65] transition inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-neutral-900 border border-neutral-800 hover:border-[#D4AF37]/40"
                title="Възстановява първоначалните наличности на всички продукти за повторно тестване"
              >
                <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                <span>Възстанови тестови наличности</span>
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Controls */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                activeCategory === cat.id
                  ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'bg-[#141414] text-gray-300 border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => {
            const isSoldOut = prod.stock <= 0;
            const inCartQty = cartItems.find((ci) => ci.product.id === prod.id)?.quantity || 0;
            const isMaxInCart = !isSoldOut && inCartQty >= prod.stock;

            return (
              <div
                key={prod.id}
                className={`bg-[#111111] rounded-xl p-5 gold-border flex flex-col justify-between group transition-all duration-300 ${
                  isSoldOut
                    ? 'border-neutral-800 opacity-85 hover:border-neutral-700'
                    : 'gold-border-glow'
                }`}
              >
                <div>
                  {/* Product Image Container */}
                  <div
                    onClick={() => setSelectedProduct(prod)}
                    className="relative h-48 bg-[#181818] rounded-lg mb-4 text-center overflow-hidden cursor-pointer"
                  >
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className={`w-full h-full object-cover transition-transform duration-500 filter ${
                        isSoldOut
                          ? 'grayscale brightness-75 contrast-125 opacity-60'
                          : 'brightness-95 group-hover:scale-105'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Standard Badge */}
                    {prod.badge && !isSoldOut && (
                      <span className="absolute top-2.5 left-2.5 bg-[#D4AF37] text-black text-[9px] font-bold px-2 py-0.5 rounded tracking-wider shadow">
                        {prod.badge}
                      </span>
                    )}

                    {/* Prominent SOLD OUT Overlay Badge */}
                    {isSoldOut ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-3">
                        <span className="bg-red-950/90 text-red-300 border border-red-500/60 text-xs font-bold px-3 py-1.5 rounded-lg tracking-widest shadow-2xl backdrop-blur-md uppercase flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-xmark text-red-400"></i>
                          Изчерпан
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-[#141414]/90 text-[#E6CA65] text-xs px-3 py-1.5 rounded-full border border-[#D4AF37]/40 flex items-center gap-1.5 shadow-lg">
                          <i className="fa-solid fa-eye text-[11px]" aria-hidden="true"></i> Бърз преглед
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#E6CA65] uppercase tracking-widest font-semibold block">
                      {prod.categoryLabel}
                    </span>

                    {/* Stock Status Indicator */}
                    {isSoldOut ? (
                      <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-950/50 px-2 py-0.5 rounded border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Няма наличност
                      </span>
                    ) : prod.stock <= 2 ? (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                        <i className="fa-solid fa-fire text-amber-500 text-[10px]"></i>
                        Остават {prod.stock} бр.!
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        На склад ({prod.stock} бр.)
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => setSelectedProduct(prod)}
                    className="font-cinzel text-base font-bold text-white mb-2 cursor-pointer hover:text-[#E6CA65] transition line-clamp-1"
                  >
                    {prod.title}
                  </h3>

                  <p className="text-xs text-gray-400 font-light mb-4 line-clamp-2">
                    {prod.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between my-3 pt-3 border-t border-[#D4AF37]/15">
                    <span className="text-xs text-gray-400 truncate max-w-[140px]">{prod.specs}</span>
                    <span className={`font-cinzel font-bold text-base tabular-nums ${isSoldOut ? 'text-gray-500 line-through' : 'text-[#E6CA65]'}`}>
                      {prod.price} лв.
                    </span>
                  </div>

                  {/* Dynamic Action Button based on Stock */}
                  {isSoldOut ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed flex items-center justify-center gap-2 select-none"
                    >
                      <i className="fa-solid fa-ban text-xs"></i>
                      <span>Изчерпана наличност</span>
                    </button>
                  ) : isMaxInCart ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-amber-950/40 text-amber-300 border border-amber-500/40 cursor-not-allowed flex items-center justify-center gap-1.5 shadow select-none"
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Всички {prod.stock} бр. са в количката</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdd(prod)}
                      className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-transform"
                    >
                      <i className="fa-solid fa-cart-plus text-xs" aria-hidden="true"></i> Добави в количка
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Product Quick-View Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] border border-[#D4AF37]/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-neutral-900 border border-[#D4AF37]/40 text-[#E6CA65] hover:text-black hover:bg-[#D4AF37] flex items-center justify-center transition shadow cursor-pointer"
              aria-label="Затвори"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="h-64 rounded-xl overflow-hidden bg-[#181818] border border-[#D4AF37]/20 relative">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className={`w-full h-full object-cover ${
                    selectedProduct.stock <= 0 ? 'grayscale brightness-75 opacity-70' : ''
                  }`}
                />
                {selectedProduct.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-950/90 text-red-300 border border-red-500/50 text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider">
                      ИЗЧЕРПАНО КОЛИЧЕСТВО
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#E6CA65] uppercase tracking-widest font-semibold">
                    {selectedProduct.categoryLabel}
                  </span>

                  {selectedProduct.stock <= 0 ? (
                    <span className="text-[11px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-500/30">
                      Изчерпан
                    </span>
                  ) : selectedProduct.stock <= 2 ? (
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      Остават {selectedProduct.stock} бр.!
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      В наличност ({selectedProduct.stock} бр.)
                    </span>
                  )}
                </div>

                <h3 className="font-cinzel text-xl font-bold text-white">
                  {selectedProduct.title}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed font-light">
                  {selectedProduct.description}
                </p>

                {selectedProduct.details && (
                  <div className="bg-[#181818] p-3 rounded-lg border border-[#D4AF37]/15">
                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider mb-2">
                      Характеристики:
                    </h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {selectedProduct.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#D4AF37]">·</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className={`font-cinzel text-2xl font-bold tabular-nums ${
                    selectedProduct.stock <= 0 ? 'text-gray-500 line-through' : 'text-[#E6CA65]'
                  }`}>
                    {selectedProduct.price} лв.
                  </span>

                  {selectedProduct.stock <= 0 ? (
                    <button
                      disabled
                      className="px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed select-none"
                    >
                      Изчерпана наличност
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleAdd(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black gold-btn-gradient shadow cursor-pointer active:scale-95 transition-transform"
                    >
                      Добави в количка
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
