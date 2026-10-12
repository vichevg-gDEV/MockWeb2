import React, { useState, useEffect } from 'react';
import { Product, CartItem, PriceItem, SalonService } from './types';
import { PRODUCTS, PRICE_LIST, SALON_SERVICES } from './data/salonData';
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
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  // 1. PRODUCTS STATE WITH PERSISTENCE
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('vip_salon_products_full');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse full products list', e);
      }
    }

    // Fallback: check older stock map
    const stockSaved = localStorage.getItem('vip_salon_inventory_stock');
    if (stockSaved) {
      try {
        const parsed = JSON.parse(stockSaved);
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
      } catch (e) {
        console.error('Failed to parse legacy stock', e);
      }
    }

    return PRODUCTS;
  });

  // Save products whenever updated
  useEffect(() => {
    localStorage.setItem('vip_salon_products_full', JSON.stringify(products));
    localStorage.setItem('vip_salon_inventory_stock', JSON.stringify(products));
  }, [products]);

  // 2. PRICE LIST (SERVICES) STATE WITH PERSISTENCE
  const [priceList, setPriceList] = useState<PriceItem[]>(() => {
    const saved = localStorage.getItem('vip_salon_pricelist_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse price list', e);
      }
    }
    return PRICE_LIST;
  });

  useEffect(() => {
    localStorage.setItem('vip_salon_pricelist_data', JSON.stringify(priceList));
  }, [priceList]);

  // 3. MAIN SALON SERVICE CARDS WITH PERSISTENCE
  const [salonServices, setSalonServices] = useState<SalonService[]>(() => {
    const saved = localStorage.getItem('vip_salon_services_cards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse salon services', e);
      }
    }
    return SALON_SERVICES;
  });

  useEffect(() => {
    localStorage.setItem('vip_salon_services_cards', JSON.stringify(salonServices));
  }, [salonServices]);

  // 4. HIDDEN ADMIN PANEL ACCESS STATE
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.hash === '#admin';
  });

  // Listen for Ctrl+Shift+A / Cmd+Shift+A and #admin hash
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret key combination: Ctrl+Shift+A or Cmd+Shift+A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash === '#admin') {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  // CART AND CHECKOUT STATE
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedServicePreload, setSelectedServicePreload] = useState<string>('');

  // INVENTORY PRODUCT HANDLERS
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCartItems((prev) => prev.filter((ci) => ci.product.id !== productId));
  };

  const handleUpdateStock = (productId: string, newStock: number) => {
    const safeStock = Math.max(0, newStock);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: safeStock } : p))
    );

    // Sync cart quantities if higher than new stock
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            if (safeStock === 0) return null;
            if (item.quantity > safeStock) {
              return { ...item, quantity: safeStock };
            }
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleResetStock = () => {
    setProducts(PRODUCTS);
    localStorage.removeItem('vip_salon_products_full');
    localStorage.removeItem('vip_salon_inventory_stock');
  };

  // SERVICE & PRICING HANDLERS
  const handleAddPriceItem = (item: PriceItem) => {
    setPriceList((prev) => [...prev, item]);
  };

  const handleUpdatePriceItem = (index: number, updatedItem: PriceItem) => {
    setPriceList((prev) => prev.map((item, idx) => (idx === index ? updatedItem : item)));
  };

  const handleDeletePriceItem = (index: number) => {
    setPriceList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSalonService = (newService: SalonService) => {
    setSalonServices((prev) => [...prev, newService]);
  };

  const handleUpdateSalonService = (id: string, updated: Partial<SalonService>) => {
    setSalonServices((prev) =>
      prev.map((srv) => (srv.id === id ? { ...srv, ...updated } : srv))
    );
  };

  const handleDeleteSalonService = (id: string) => {
    setSalonServices((prev) => prev.filter((srv) => srv.id !== id));
  };

  const handleResetAllData = () => {
    setProducts(PRODUCTS);
    setPriceList(PRICE_LIST);
    setSalonServices(SALON_SERVICES);
    localStorage.removeItem('vip_salon_products_full');
    localStorage.removeItem('vip_salon_inventory_stock');
    localStorage.removeItem('vip_salon_pricelist_data');
    localStorage.removeItem('vip_salon_services_cards');
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
        <Services
          salonServices={salonServices}
          priceList={priceList}
          onSelectServiceForBooking={handleSelectServiceForBooking}
        />

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
          priceList={priceList}
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

      {/* Footer with subtle admin trigger */}
      <Footer onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Hidden Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateStock={handleUpdateStock}
        priceList={priceList}
        onAddPriceItem={handleAddPriceItem}
        onUpdatePriceItem={handleUpdatePriceItem}
        onDeletePriceItem={handleDeletePriceItem}
        salonServices={salonServices}
        onAddSalonService={handleAddSalonService}
        onUpdateSalonService={handleUpdateSalonService}
        onDeleteSalonService={handleDeleteSalonService}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
}
