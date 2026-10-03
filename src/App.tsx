import React, { useState, useEffect } from 'react';
import { Product, CartItem } from './types';
import { PRODUCTS } from './data/salonData';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Services } from './components/Services';
import { Shop } from './components/Shop';
import { Gallery } from './components/Gallery';
import { Booking } from './components/Booking';
import { Faq } from './components/Faq';
import { Contact } from './components/Contact';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { Footer } from './components/Footer';

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('vip_salon_inventory_stock');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const stockMap = new Map<string, number>();
            parsed.forEach((p: any) => {
              if (p && p.id && typeof p.stock === 'number') {
                stockMap.set(p.id, p.stock);
              }
            });

            return PRODUCTS.map((prod) => ({
              ...prod,
              stock: stockMap.has(prod.id) ? (stockMap.get(prod.id) as number) : prod.stock
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Storage read skipped:', e);
    }
    return PRODUCTS;
  });

  // Automatically sync when PRODUCTS list in salonData.ts is modified or updated
  useEffect(() => {
    setProducts((prev) => {
      const prevStockMap = new Map(prev.map((p) => [p.id, p.stock]));
      return PRODUCTS.map((prod) => ({
        ...prod,
        stock: prevStockMap.has(prod.id) ? (prevStockMap.get(prod.id) as number) : prod.stock
      }));
    });
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedServicePreload, setSelectedServicePreload] = useState<string>('');

  // Persist stock inventory updates to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('vip_salon_inventory_stock', JSON.stringify(products));
      }
    } catch (e) {
      console.warn('Storage write skipped:', e);
    }
  }, [products]);

  const handleResetStock = () => {
    setProducts(PRODUCTS);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('vip_salon_inventory_stock');
      }
    } catch (e) {
      console.warn('Storage remove skipped:', e);
    }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    const currentProduct = products.find((p) => p.id === product.id) || product;
    if (currentProduct.stock <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= currentProduct.stock) {
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, product: currentProduct }
            : item
        );
      }
      return [...prev, { product: currentProduct, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const currentProduct = products.find((p) => p.id === productId);
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const maxStock = currentProduct ? currentProduct.stock : item.product.stock;
            const newQty = item.quantity + delta;
            if (newQty > maxStock) {
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSelectServiceForBooking = (serviceName: string) => {
    setSelectedServicePreload(serviceName);
    const bookElem = document.getElementById('book');
    if (bookElem) {
      bookElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenBooking = () => {
    const bookElem = document.getElementById('book');
    if (bookElem) {
      bookElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderComplete = () => {
    // Automatically deduct purchased quantities from inventory!
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const purchasedItem = cartItems.find((ci) => ci.product.id === p.id);
        if (purchasedItem) {
          const remainingStock = Math.max(0, p.stock - purchasedItem.quantity);
          return {
            ...p,
            stock: remainingStock
          };
        }
        return p;
      })
    );
    setCartItems([]);
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Header with Topbar */}
      <Header
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenBooking={handleOpenBooking}
      />

      <main>
        {/* Hero Section */}
        <Hero onOpenBooking={handleOpenBooking} />

        {/* About Section */}
        <About />

        {/* Salon Services & Price List */}
        <Services onSelectServiceForBooking={handleSelectServiceForBooking} />

        {/* Online Shop / Boutique */}
        <Shop
          products={products}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onResetStock={handleResetStock}
        />

        {/* Transformations Gallery */}
        <Gallery />

        {/* Online Booking */}
        <Booking
          selectedServicePreload={selectedServicePreload}
          onClearPreload={() => setSelectedServicePreload('')}
        />

        {/* FAQ Accordion */}
        <div id="faq">
          <Faq />
        </div>

        {/* Contact & Map */}
        <Contact />
      </main>

      {/* Cart Slide-over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderComplete={handleOrderComplete}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
