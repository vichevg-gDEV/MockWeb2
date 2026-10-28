import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product, CartItem, PriceItem, SalonService, Catalog } from './types';
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
import * as api from './api';

// Old versions kept the shop in each visitor's browser. Clear it so nothing stale
// (including the old admin PIN) stays behind.
const LEGACY_STORAGE_KEYS = [
  'vip_salon_products_full',
  'vip_salon_inventory_stock',
  'vip_salon_pricelist_data',
  'vip_salon_services_cards',
  'vip_admin_pin'
];

const CATALOG_REFRESH_MS = 30_000;

export default function App() {
  // The server is the single source of truth for products, stock, prices and services.
  // The bundled data is only shown until the first answer arrives (or if the server is unreachable).
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [priceList, setPriceList] = useState<PriceItem[]>(PRICE_LIST);
  const [salonServices, setSalonServices] = useState<SalonService[]>(SALON_SERVICES);

  // CART AND CHECKOUT STATE
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedServicePreload, setSelectedServicePreload] = useState<string>('');

  // Used to ignore a slow background refresh that finished after a newer change was applied.
  const changeCounter = useRef(0);
  const lastSeenVersion = useRef<string | null>(null);

  const applyCatalog = useCallback((catalog: Catalog) => {
    setProducts(catalog.products);
    setPriceList(catalog.priceList);
    setSalonServices(catalog.salonServices);

    // Keep the cart in line with what is really on the shelf (stock, price, removed items).
    setCartItems((prev) =>
      prev
        .map((item) => {
          const fresh = catalog.products.find((p) => p.id === item.product.id);
          if (!fresh || fresh.stock <= 0) return null;
          return { product: fresh, quantity: Math.min(item.quantity, fresh.stock) };
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const refreshCatalog = useCallback(async () => {
    const startedAt = changeCounter.current;
    try {
      const data = await api.getCatalog();
      if (startedAt !== changeCounter.current) return;
      if (data.updatedAt && data.updatedAt === lastSeenVersion.current) return;
      lastSeenVersion.current = data.updatedAt || null;
      applyCatalog(data);
    } catch {
      /* server unreachable: keep showing what we have */
    }
  }, [applyCatalog]);

  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem('vip_admin_auth');
    } catch {
      /* storage not available */
    }

    refreshCatalog();
    const timer = window.setInterval(refreshCatalog, CATALOG_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCatalog();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshCatalog);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshCatalog);
    };
  }, [refreshCatalog]);

  // HIDDEN ADMIN PANEL ACCESS STATE
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

  // ADMIN ACTIONS: every change is saved on the server first, then shown to everyone.
  const runAdmin = async <T,>(action: () => Promise<T>): Promise<T | null> => {
    try {
      return await action();
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 401) {
        window.dispatchEvent(new Event('vip-admin-unauthorized'));
        return null;
      }
      window.alert(err instanceof Error ? err.message : 'Неуспешно записване. Опитайте отново.');
      refreshCatalog();
      return null;
    }
  };

  const applyAdminResult = (result: { catalog: Catalog } | null): boolean => {
    if (!result) return false;
    changeCounter.current += 1;
    lastSeenVersion.current = null;
    applyCatalog(result.catalog);
    return true;
  };

  // INVENTORY PRODUCT HANDLERS
  const handleAddProduct = async (newProduct: Product) =>
    applyAdminResult(await runAdmin(() => api.adminAddProduct(newProduct)));

  const handleUpdateProduct = async (updatedProduct: Product) =>
    applyAdminResult(await runAdmin(() => api.adminUpdateProduct(updatedProduct)));

  const handleDeleteProduct = async (productId: string) =>
    applyAdminResult(await runAdmin(() => api.adminDeleteProduct(productId)));

  const handleUpdateStock = async (productId: string, newStock: number) =>
    applyAdminResult(await runAdmin(() => api.adminSetStock(productId, Math.max(0, Math.floor(newStock)))));

  // SERVICE & PRICING HANDLERS
  const savePriceList = async (next: PriceItem[]) =>
    applyAdminResult(await runAdmin(() => api.adminSavePriceList(next)));

  const handleAddPriceItem = (item: PriceItem) => savePriceList([...priceList, item]);

  const handleUpdatePriceItem = (index: number, updatedItem: PriceItem) =>
    savePriceList(priceList.map((item, idx) => (idx === index ? updatedItem : item)));

  const handleDeletePriceItem = (index: number) =>
    savePriceList(priceList.filter((_, idx) => idx !== index));

  const saveSalonServices = async (next: SalonService[]) =>
    applyAdminResult(await runAdmin(() => api.adminSaveServices(next)));

  const handleAddSalonService = (newService: SalonService) =>
    saveSalonServices([...salonServices, newService]);

  const handleUpdateSalonService = (id: string, updated: Partial<SalonService>) =>
    saveSalonServices(salonServices.map((srv) => (srv.id === id ? { ...srv, ...updated } : srv)));

  const handleDeleteSalonService = (id: string) =>
    saveSalonServices(salonServices.filter((srv) => srv.id !== id));

  const handleImportCatalog = async (data: Partial<Catalog>) =>
    applyAdminResult(await runAdmin(() => api.adminImportCatalog(data)));

  const handleResetAllData = async () =>
    applyAdminResult(await runAdmin(() => api.adminResetCatalog()));

  // Called by the admin panel after it changed an order (cancelling puts stock back).
  const handleCatalogFromServer = (catalog: Catalog) => applyAdminResult({ catalog });

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

  // The server already deducted the stock when it accepted the order.
  const handleOrderComplete = () => {
    setCartItems([]);
    lastSeenVersion.current = null;
    refreshCatalog();
  };

  const handleCatalogOutdated = () => {
    lastSeenVersion.current = null;
    refreshCatalog();
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
        onCatalogOutdated={handleCatalogOutdated}
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
        onImportCatalog={handleImportCatalog}
        onResetAllData={handleResetAllData}
        onCatalogChanged={handleCatalogFromServer}
      />
    </div>
  );
}
