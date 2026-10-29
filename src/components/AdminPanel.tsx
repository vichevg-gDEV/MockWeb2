import React, { useState, useRef, useEffect } from 'react';
import {
  Product,
  PriceItem,
  SalonService,
  Stylist,
  Catalog,
  OrderRecord,
  BookingRecord,
  OrderStatus,
  BookingStatus
} from '../types';
import * as api from '../api';
import { compressImageFile, PRESET_PRODUCT_IMAGES } from '../utils/imageCompressor';
import { getAssetUrl, handleImageError } from '../utils/assetPath';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Нова',
  confirmed: 'Потвърдена',
  shipped: 'Изпратена',
  completed: 'Завършена',
  cancelled: 'Отказана'
};

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: 'Нова',
  confirmed: 'Потвърдена',
  done: 'Изпълнена',
  no_show: 'Неявяване',
  cancelled: 'Отказана'
};

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  confirmed: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  shipped: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  no_show: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/40',
  cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/40'
};

const COURIER_LABELS: Record<string, string> = { econt: 'Еконт', speedy: 'Спиди' };

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' });
};

const INBOX_REFRESH_MS = 30_000;

// A stylist row being edited in the Team tab (_k keeps inputs stable while rows are added or removed).
type TeamRow = Stylist & { _k: string };

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  // Every change below is saved on the server; each returns true when it worked.
  onUpdateProduct: (product: Product) => Promise<boolean>;
  onAddProduct: (product: Product) => Promise<boolean>;
  onDeleteProduct: (productId: string) => Promise<boolean>;
  onUpdateStock: (productId: string, newStock: number) => Promise<boolean>;
  priceList: PriceItem[];
  onAddPriceItem: (item: PriceItem) => Promise<boolean>;
  onUpdatePriceItem: (index: number, updatedItem: PriceItem) => Promise<boolean>;
  onDeletePriceItem: (index: number) => Promise<boolean>;
  salonServices: SalonService[];
  stylists: Stylist[];
  onUpdateSalonService: (id: string, updated: Partial<SalonService>) => Promise<boolean>;
  onAddSalonService: (newService: SalonService) => Promise<boolean>;
  onDeleteSalonService: (id: string) => Promise<boolean>;
  onImportCatalog: (data: Partial<Catalog>) => Promise<boolean>;
  onResetAllData: () => Promise<boolean>;
  /** Shows a catalog the server sent back (e.g. stock restored by cancelling an order). */
  onCatalogChanged: (catalog: Catalog) => boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  products,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdateStock,
  priceList,
  onAddPriceItem,
  onUpdatePriceItem,
  onDeletePriceItem,
  salonServices,
  stylists,
  onUpdateSalonService,
  onAddSalonService,
  onDeleteSalonService,
  onImportCatalog,
  onResetAllData,
  onCatalogChanged
}) => {
  // Authentication: the server decides. Nothing about the passcode lives in this code.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Change-passcode form (Settings tab)
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings' | 'inventory' | 'services' | 'team' | 'settings'>('orders');

  // Team tab: null means "no unsaved edits, show what the server has".
  const [teamDraft, setTeamDraft] = useState<TeamRow[] | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  // Orders & bookings received from customers
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [orderFilter, setOrderFilter] = useState<'open' | 'all' | OrderStatus>('open');
  const [bookingFilter, setBookingFilter] = useState<'open' | 'all' | BookingStatus>('open');

  // Inventory Filters & Search
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<{
    title: string;
    category: string;
    categoryLabel: string;
    badge: string;
    description: string;
    price: string;
    specs: string;
    stock: string;
    image: string;
    details: string[];
  }>({
    title: '',
    category: 'extensions',
    categoryLabel: 'Славянска Коса (100g)',
    badge: 'NEW',
    description: '',
    price: '250',
    specs: '50 см • 100 гр • 100% Remy',
    stock: '5',
    image: PRESET_PRODUCT_IMAGES[0].url,
    details: [
      '100% натурален естествен косъм',
      'Запазена посока на кутикулата (Remy)',
      'Подходяща за изправяне, къдрене и боядисване'
    ]
  });

  // Services Add / Edit State
  const [isPriceItemModalOpen, setIsPriceItemModalOpen] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [priceItemForm, setPriceItemForm] = useState<PriceItem>({
    service: '',
    price: '',
    duration: '60 мин.',
    highlight: false
  });

  // Main Salon Service Card Modal State
  const [isSalonServiceModalOpen, setIsSalonServiceModalOpen] = useState(false);
  const [editingServiceCardId, setEditingServiceCardId] = useState<string | null>(null);
  const [serviceCardForm, setServiceCardForm] = useState<SalonService>({
    id: '',
    title: '',
    startingPrice: '',
    description: '',
    iconClass: 'fa-wand-magic',
    category: 'extensions'
  });

  // Flash / Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ask the server whether this browser already has a valid admin session.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAuthChecked(false);
    api
      .adminSession()
      .then((result) => !cancelled && setIsAuthenticated(result.authenticated))
      .catch(() => !cancelled && setIsAuthenticated(false))
      .finally(() => !cancelled && setAuthChecked(true));
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Any admin request answered with "not logged in" sends us back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      setPinError('Сесията е изтекла. Моля, влезте отново.');
    };
    window.addEventListener('vip-admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('vip-admin-unauthorized', onUnauthorized);
  }, []);

  const loadInbox = async () => {
    try {
      const inbox = await api.adminInbox();
      setOrders(inbox.orders);
      setBookings(inbox.bookings);
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 401) {
        window.dispatchEvent(new Event('vip-admin-unauthorized'));
      }
    }
  };

  // Keep the orders and bookings list fresh while the panel is open.
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    loadInbox();
    const timer = window.setInterval(loadInbox, INBOX_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleAdminError = (err: unknown) => {
    if (err instanceof api.ApiError && err.status === 401) {
      window.dispatchEvent(new Event('vip-admin-unauthorized'));
      return;
    }
    alert(err instanceof Error ? err.message : 'Неуспешна операция. Опитайте отново.');
  };

  // Login
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn || !pinInput) return;
    setIsLoggingIn(true);
    setPinError(null);
    try {
      await api.adminLogin(pinInput);
      setIsAuthenticated(true);
      setPinInput('');
      showToast('Успешен вход в административния панел');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Неуспешен вход. Опитайте отново.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch {
      /* the cookie expires on its own */
    }
    setIsAuthenticated(false);
    setOrders([]);
    setBookings([]);
    onClose();
  };

  const handleChangePin = async () => {
    if (newPinInput !== confirmPinInput) {
      alert('Новият код и потвърждението не съвпадат.');
      return;
    }
    setIsChangingPin(true);
    try {
      await api.adminChangePin(currentPinInput, newPinInput);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      showToast('Новият код беше запазен успешно!');
    } catch (err) {
      handleAdminError(err);
    } finally {
      setIsChangingPin(false);
    }
  };

  // Orders & bookings
  const handleOrderStatus = async (order: OrderRecord, status: OrderStatus) => {
    if (status === order.status) return;
    if (
      status === 'cancelled' &&
      !confirm('Отказването на поръчката връща артикулите в наличност и не може да бъде отменено. Продължавате ли?')
    ) {
      return;
    }
    try {
      const result = await api.adminSetOrderStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? result.order : o)));
      onCatalogChanged(result.catalog);
    } catch (err) {
      handleAdminError(err);
      loadInbox();
    }
  };

  const handleDeleteOrder = async (order: OrderRecord) => {
    if (!confirm(`Да изтрия ли поръчка ${order.id} окончателно?`)) return;
    try {
      await api.adminDeleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      handleAdminError(err);
    }
  };

  const handleBookingStatus = async (booking: BookingRecord, status: BookingStatus) => {
    if (status === booking.status) return;
    try {
      const result = await api.adminSetBookingStatus(booking.id, status);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? result.booking : b)));
    } catch (err) {
      handleAdminError(err);
      loadInbox();
    }
  };

  const handleDeleteBooking = async (booking: BookingRecord) => {
    if (!confirm(`Да изтрия ли резервация ${booking.id} окончателно?`)) return;
    try {
      await api.adminDeleteBooking(booking.id);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (err) {
      handleAdminError(err);
    }
  };

  // Team (stylists)
  const teamRows: TeamRow[] = teamDraft ?? stylists.map((x) => ({ ...x, _k: x.id }));
  const editTeam = (next: TeamRow[]) => setTeamDraft(next);
  const updateTeamRow = (key: string, patch: Partial<Stylist>) =>
    editTeam(teamRows.map((r) => (r._k === key ? { ...r, ...patch } : r)));
  const addTeamRow = () =>
    editTeam([...teamRows, { _k: `new-${Date.now()}-${teamRows.length}`, id: '', name: '', role: '', experience: '' }]);
  const removeTeamRow = (row: TeamRow) => {
    const today = new Date().toLocaleDateString('sv-SE');
    const upcoming = row.id
      ? bookings.filter(
          (b) => b.stylistId === row.id && ['new', 'confirmed'].includes(b.status) && b.date >= today
        ).length
      : 0;
    const warning = upcoming
      ? `${row.name || 'Този стилист'} има ${upcoming} предстоящи резервации. Те остават в календара, но нови не могат да се правят. Премахвате ли го?`
      : `Да премахна ли ${row.name || 'този ред'} от екипа?`;
    if (!confirm(warning)) return;
    editTeam(teamRows.filter((r) => r._k !== row._k));
  };
  const handleSaveTeam = async () => {
    if (!teamDraft || savingTeam) return;
    setSavingTeam(true);
    try {
      const result = await api.adminSaveStylists(teamDraft.map(({ _k, ...rest }) => rest));
      onCatalogChanged(result.catalog);
      setTeamDraft(null);
    } catch (err) {
      handleAdminError(err);
    } finally {
      setSavingTeam(false);
    }
  };

  const OPEN_ORDER = ['new', 'confirmed', 'shipped'];
  const OPEN_BOOKING = ['new', 'confirmed'];
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const newBookingsCount = bookings.filter((b) => b.status === 'new').length;
  const filteredOrders = orders.filter((o) =>
    orderFilter === 'all' ? true : orderFilter === 'open' ? OPEN_ORDER.includes(o.status) : o.status === orderFilter
  );
  const filteredBookings = bookings.filter((b) =>
    bookingFilter === 'all'
      ? true
      : bookingFilter === 'open'
        ? OPEN_BOOKING.includes(b.status)
        : b.status === bookingFilter
  );

  // Filtered Products for Inventory table
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.specs.toLowerCase().includes(productSearch.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'inStock') {
      matchesStock = p.stock > 3;
    } else if (stockFilter === 'lowStock') {
      matchesStock = p.stock > 0 && p.stock <= 3;
    } else if (stockFilter === 'outOfStock') {
      matchesStock = p.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Inventory Metrics
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stock > 3).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);

  // Open Product Modal (New or Edit)
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      title: '',
      category: 'extensions',
      categoryLabel: 'Славянска Коса (100g)',
      badge: 'NEW',
      description: 'Премиум естествена славянска коса със запазена кутикула за съвършен обем и дължина.',
      price: '280',
      specs: '55 см • 100 гр • 100% Remy',
      stock: '6',
      image: PRESET_PRODUCT_IMAGES[0].url,
      details: [
        '100% натурален славянски косъм Remy',
        'Подходяща за стилизиране с преса и маша до 210°C',
        'Без заплитане при правилна салонна поддръжка'
      ]
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({
      title: p.title,
      category: p.category,
      categoryLabel: p.categoryLabel,
      badge: p.badge || '',
      description: p.description,
      price: p.price.toString(),
      specs: p.specs,
      stock: p.stock.toString(),
      image: p.image,
      details: p.details && p.details.length > 0 ? [...p.details] : ['Първокласно салонно качество']
    });
    setIsProductModalOpen(true);
  };

  // Handle Photo Upload with Client-Side Compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, 900, 0.82);
      setProductForm((prev) => ({ ...prev, image: compressedBase64 }));
      showToast('Снимката е заредена и оптимизирана успешно!');
    } catch (err) {
      console.error(err);
      showToast('Грешка при обработка на файла. Опитайте с друг формат.');
    }
  };

  // Save Product (Add or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim()) {
      alert('Моля, въведете заглавие на продукта.');
      return;
    }
    const numPrice = parseFloat(productForm.price) || 0;
    const numStock = parseInt(productForm.stock, 10) || 0;

    if (editingProductId) {
      const updated: Product = {
        id: editingProductId,
        title: productForm.title.trim(),
        category: productForm.category as any,
        categoryLabel: productForm.categoryLabel.trim() || 'Салонен продукт',
        badge: productForm.badge.trim() || undefined,
        description: productForm.description.trim(),
        price: numPrice,
        specs: productForm.specs.trim(),
        stock: Math.max(0, numStock),
        image: productForm.image || PRESET_PRODUCT_IMAGES[0].url,
        details: productForm.details.filter((d) => d.trim().length > 0)
      };
      if (!(await onUpdateProduct(updated))) return;
      showToast(`Продуктът "${updated.title}" е обновен!`);
    } else {
      const newProd: Product = {
        id: 'prod-' + Date.now(),
        title: productForm.title.trim(),
        category: productForm.category as any,
        categoryLabel: productForm.categoryLabel.trim() || 'Екстеншъни',
        badge: productForm.badge.trim() || undefined,
        description: productForm.description.trim(),
        price: numPrice,
        specs: productForm.specs.trim(),
        stock: Math.max(0, numStock),
        image: productForm.image || PRESET_PRODUCT_IMAGES[0].url,
        details: productForm.details.filter((d) => d.trim().length > 0)
      };
      if (!(await onAddProduct(newProd))) return;
      showToast(`Новият продукт "${newProd.title}" е добавен в бутика!`);
    }

    setIsProductModalOpen(false);
  };

  // Add / Remove Detail bullet points
  const handleAddDetail = () => {
    setProductForm((prev) => ({ ...prev, details: [...prev.details, ''] }));
  };

  const handleUpdateDetail = (idx: number, val: string) => {
    setProductForm((prev) => {
      const copy = [...prev.details];
      copy[idx] = val;
      return { ...prev, details: copy };
    });
  };

  const handleRemoveDetail = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== idx)
    }));
  };

  // Price List (Services) Handlers
  const handleOpenAddPriceItem = () => {
    setEditingPriceIndex(null);
    setPriceItemForm({
      service: '',
      price: '80 лв.',
      duration: '60 мин.',
      highlight: false
    });
    setIsPriceItemModalOpen(true);
  };

  const handleOpenEditPriceItem = (index: number) => {
    setEditingPriceIndex(index);
    const item = priceList[index];
    setPriceItemForm({ ...item });
    setIsPriceItemModalOpen(true);
  };

  const handleSavePriceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceItemForm.service.trim() || !priceItemForm.price.trim()) {
      alert('Моля, попълнете наименование и цена на услугата.');
      return;
    }

    if (editingPriceIndex !== null) {
      if (!(await onUpdatePriceItem(editingPriceIndex, priceItemForm))) return;
      showToast(`Услугата "${priceItemForm.service}" е обновена!`);
    } else {
      if (!(await onAddPriceItem({ ...priceItemForm, id: 'price-' + Date.now() }))) return;
      showToast(`Новата услуга "${priceItemForm.service}" е добавена в ценоразписа!`);
    }
    setIsPriceItemModalOpen(false);
  };

  // Main Service Card Handlers
  const handleOpenEditSalonService = (srv: SalonService) => {
    setEditingServiceCardId(srv.id);
    setServiceCardForm({ ...srv });
    setIsSalonServiceModalOpen(true);
  };

  const handleOpenAddSalonService = () => {
    setEditingServiceCardId(null);
    setServiceCardForm({
      id: 'srv-' + Date.now(),
      title: '',
      startingPrice: 'От 70 лв.',
      description: 'Професионална салонна грижа с първокласни продукти и персонално внимание.',
      iconClass: 'fa-wand-magic',
      category: 'extensions'
    });
    setIsSalonServiceModalOpen(true);
  };

  const handleSaveSalonService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceCardForm.title.trim() || !serviceCardForm.startingPrice.trim()) {
      alert('Моля, въведете заглавие и начална цена.');
      return;
    }

    if (editingServiceCardId) {
      if (!(await onUpdateSalonService(editingServiceCardId, serviceCardForm))) return;
      showToast(`Салонната карта "${serviceCardForm.title}" е обновена!`);
    } else {
      if (!(await onAddSalonService(serviceCardForm))) return;
      showToast(`Новата салонна услуга "${serviceCardForm.title}" е добавена!`);
    }
    setIsSalonServiceModalOpen(false);
  };

  // Export / Import Backup Data
  const handleExportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      products,
      priceList,
      salonServices
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vip-beauty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Резервното копие е изтеглено успешно!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const data: Partial<Catalog> = {};
        if (Array.isArray(parsed.products)) data.products = parsed.products;
        if (Array.isArray(parsed.priceList)) data.priceList = parsed.priceList;
        if (Array.isArray(parsed.salonServices)) data.salonServices = parsed.salonServices;
        if (Object.keys(data).length === 0) {
          alert('Файлът не съдържа данни за импорт.');
        } else if (
          confirm('Импортът ще замени текущите продукти, наличности и цени с тези от файла. Продължавате ли?')
        ) {
          if (await onImportCatalog(data)) showToast('Данните бяха импортирани успешно!');
        }
      } catch (err) {
        alert('Невалиден JSON файл.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Toast Notification inside Admin */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] bg-[#161616] border border-[#D4AF37] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slideDown">
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] text-xs">
            <i className="fa-solid fa-check"></i>
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* LOGIN SCREEN IF NOT AUTHENTICATED */}
      {!isAuthenticated ? (
        <div className="bg-[#101010] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition w-8 h-8 rounded-full bg-[#181818] border border-neutral-800 flex items-center justify-center"
            title="Затвори"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#E6CA65] text-2xl mx-auto mb-3 shadow-inner">
              <i className="fa-solid fa-lock"></i>
            </div>
            <span className="text-[11px] font-semibold tracking-[0.25em] text-[#E6CA65] uppercase">
              Скрит Административен Панел
            </span>
            <h2 className="font-cinzel text-2xl font-bold text-white mt-1">
              VIP Beauty House
            </h2>
            <p className="text-xs text-gray-400 mt-2 font-light">
              Въведете вашия секретен ПИН код за достъп до управлението на продукти, наличности и услуги.
            </p>
          </div>

          {!authChecked ? (
            <p className="text-center text-xs text-gray-400">Проверка на сесията...</p>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 text-center">
                  Секретен код
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full bg-[#161616] border text-center text-xl tracking-[0.3em] py-3 px-4 rounded-xl text-white font-mono focus:outline-none transition ${
                    pinError
                      ? 'border-red-500 focus:border-red-400 text-red-400'
                      : 'border-[#D4AF37]/40 focus:border-[#D4AF37]'
                  }`}
                />
                {pinError && (
                  <p role="alert" className="text-xs text-red-400 text-center mt-2 flex items-center justify-center gap-1.5">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !pinInput}
                className="w-full gold-btn py-3 rounded-xl font-cinzel font-bold text-xs uppercase tracking-widest text-black shadow-lg disabled:opacity-60"
              >
                {isLoggingIn ? 'Проверка...' : 'Влез в Панела'}
              </button>

              <p className="text-center text-[11px] text-gray-500">
                Забравен код? Задава се на сървъра с командата <span className="font-mono">npm run set-pin</span>.
              </p>
            </form>
          )}
        </div>
      ) : (
        /* MAIN AUTHENTICATED ADMIN PANEL */
        <div className="bg-[#0c0c0c] border border-[#D4AF37]/40 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
          
          {/* Top Admin Header Bar */}
          <div className="bg-[#121212] border-b border-[#D4AF37]/25 px-5 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black border border-[#D4AF37]/40 p-1 flex items-center justify-center">
                <img
                  src={getAssetUrl('logo.png')}
                  alt="VIP"
                  className="w-full h-full object-contain mix-blend-screen"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-cinzel text-lg font-bold text-white tracking-wide">
                    Административен Панел
                  </h1>
                  <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#E6CA65] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Собственик
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-light">
                  VIP Beauty House Варна • Управление на бутик & услуги
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#171717] p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'orders'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-solid fa-bag-shopping text-xs"></i>
                <span>Поръчки</span>
                {newOrdersCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {newOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'bookings'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-regular fa-calendar-check text-xs"></i>
                <span>Резервации</span>
                {newBookingsCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {newBookingsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'inventory'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-solid fa-boxes-stacked text-xs"></i>
                <span>Склад & Бутик ({totalProducts})</span>
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'services'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-solid fa-scissors text-xs"></i>
                <span>Услуги & Цени ({priceList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'team'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-solid fa-users text-xs"></i>
                <span>Екип ({stylists.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'settings'
                    ? 'bg-[#D4AF37] text-black font-semibold shadow'
                    : 'text-gray-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <i className="fa-solid fa-sliders text-xs"></i>
                <span>Настройки & Експорт</span>
              </button>
            </div>

            {/* Actions: View site / Exit */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37]/50 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                title="Преглед на публичния сайт"
              >
                <i className="fa-solid fa-eye text-[11px] text-[#E6CA65]"></i>
                <span>Към сайта</span>
              </button>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                title="Изход от административния профил"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                <span>Изход</span>
              </button>
            </div>
          </div>

          {/* Panel Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0c0c0c]">
            {/* ========================================================= */}
            {/* TAB: ORDERS FROM THE ONLINE SHOP */}
            {/* ========================================================= */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-cinzel text-xl font-bold text-white">Поръчки от бутика</h2>
                    <p className="text-xs text-gray-400 font-light">
                      Новите поръчки се появяват тук автоматично (обновява се на всеки 30 секунди).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value as 'open' | 'all' | OrderStatus)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="open">Активни</option>
                      <option value="all">Всички</option>
                      {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadInbox}
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs border border-neutral-700"
                    >
                      Обнови
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-10 text-center text-sm text-gray-400">
                    Няма поръчки в този изглед.
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div key={order.id} className="bg-[#121212] border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#E6CA65] text-sm">{order.id}</span>
                          <span className="text-[11px] text-gray-400">{formatDateTime(order.createdAt)}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${
                              STATUS_BADGE[order.status] || ''
                            }`}
                          >
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleOrderStatus(order, e.target.value as OrderStatus)}
                            disabled={order.status === 'cancelled'}
                            className="bg-[#181818] border border-neutral-700 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                          >
                            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
                              <option key={st} value={st}>
                                {ORDER_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                          {(order.status === 'completed' || order.status === 'cancelled') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-xs border border-rose-800/60"
                              title="Изтрий поръчката"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5 text-gray-300">
                          <div className="text-white font-semibold text-sm">{order.customer.name}</div>
                          <div>
                            <i className="fa-solid fa-phone text-[#E6CA65] mr-2"></i>
                            <a href={`tel:${order.customer.phone}`} className="text-white underline">
                              {order.customer.phone}
                            </a>
                          </div>
                          {order.customer.email && (
                            <div>
                              <i className="fa-solid fa-envelope text-[#E6CA65] mr-2"></i>
                              <a href={`mailto:${order.customer.email}`} className="text-white underline">
                                {order.customer.email}
                              </a>
                            </div>
                          )}
                          <div>
                            <i className="fa-solid fa-truck-fast text-[#E6CA65] mr-2"></i>
                            {COURIER_LABELS[order.courier] || order.courier} · {order.customer.city}, {order.customer.address}
                          </div>
                          {order.customer.notes && (
                            <div className="text-gray-400 italic">„{order.customer.notes}“</div>
                          )}
                        </div>

                        <div className="bg-[#181818] rounded-lg p-3 space-y-1.5 text-gray-300">
                          {order.items.map((item) => (
                            <div key={item.productId} className="flex justify-between gap-3">
                              <span className="text-white">
                                {item.quantity} × {item.title}
                              </span>
                              <span className="tabular-nums">{Math.round(item.price * item.quantity * 100) / 100} лв.</span>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-neutral-700 pt-1.5 text-gray-400">
                            <span>Доставка</span>
                            <span className="tabular-nums">{order.shipping === 0 ? 'безплатна' : `${order.shipping} лв.`}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-white">
                            <span>Общо (наложен платеж)</span>
                            <span className="font-cinzel text-[#E6CA65] tabular-nums">{order.total} лв.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: BOOKINGS FROM THE ONLINE FORM */}
            {/* ========================================================= */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-cinzel text-xl font-bold text-white">Резервации за часове</h2>
                    <p className="text-xs text-gray-400 font-light">
                      Свържете се с клиента, за да потвърдите часа, после сменете статуса на „Потвърдена“.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={bookingFilter}
                      onChange={(e) => setBookingFilter(e.target.value as 'open' | 'all' | BookingStatus)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="open">Активни</option>
                      <option value="all">Всички</option>
                      {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {BOOKING_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadInbox}
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs border border-neutral-700"
                    >
                      Обнови
                    </button>
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-10 text-center text-sm text-gray-400">
                    Няма резервации в този изглед.
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-[#121212] border border-neutral-800 rounded-xl p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5 text-xs text-gray-300">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-bold text-[#E6CA65] text-sm">{booking.id}</span>
                            <span className="text-[11px] text-gray-400">подадена {formatDateTime(booking.createdAt)}</span>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${
                                STATUS_BADGE[booking.status] || ''
                              }`}
                            >
                              {BOOKING_STATUS_LABELS[booking.status]}
                            </span>
                          </div>
                          <div className="text-white font-semibold text-sm">
                            {booking.date} в {booking.time} ч. · {booking.service}
                          </div>
                          <div>Стилист: {booking.stylistName}</div>
                          <div>
                            <span className="text-white">{booking.name}</span> ·{' '}
                            <i className="fa-solid fa-phone text-[#E6CA65] mx-1"></i>
                            <a href={`tel:${booking.phone}`} className="text-white underline">
                              {booking.phone}
                            </a>
                          </div>
                          {booking.notes && <div className="text-gray-400 italic">„{booking.notes}“</div>}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={booking.status}
                            onChange={(e) => handleBookingStatus(booking, e.target.value as BookingStatus)}
                            className="bg-[#181818] border border-neutral-700 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                          >
                            {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map((st) => (
                              <option key={st} value={st}>
                                {BOOKING_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                          {['done', 'cancelled', 'no_show'].includes(booking.status) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(booking)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-xs border border-rose-800/60"
                              title="Изтрий резервацията"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 1: INVENTORY & PRODUCTS MANAGEMENT */}
            {/* ========================================================= */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                      <span>Общо Артикули</span>
                      <i className="fa-solid fa-layer-group text-[#E6CA65]"></i>
                    </div>
                    <div className="text-2xl font-cinzel font-bold text-white">{totalProducts}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{totalStockUnits} бр. общо в склада</div>
                  </div>

                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                      <span>В наличност</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <div className="text-2xl font-cinzel font-bold text-emerald-400">{inStockCount}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Оптимално заредени</div>
                  </div>

                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                      <span>Ниска наличност</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    </div>
                    <div className="text-2xl font-cinzel font-bold text-amber-400">{lowStockCount}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Под 3 бройки (поръчай)</div>
                  </div>

                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                      <span>Изчерпани</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    </div>
                    <div className="text-2xl font-cinzel font-bold text-rose-400">{outOfStockCount}</div>
                    <div className="text-[11px] text-gray-500 mt-1">0 бр. налични</div>
                  </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Search and Category Filter */}
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="relative min-w-[220px] flex-1">
                      <i className="fa-solid fa-magnifying-glass text-gray-500 absolute left-3 top-3 text-xs"></i>
                      <input
                        type="text"
                        placeholder="Търси славянска коса, уреди, козметика..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="all">Всички Категории</option>
                      <option value="extensions">Екстеншъни & Коса</option>
                      <option value="cosmetics">Козметика & Грижа</option>
                      <option value="tools">Професионални Уреди</option>
                      <option value="accessories">Аксесоари & Коприна</option>
                    </select>

                    {/* Stock Status Filter Buttons */}
                    <div className="flex items-center bg-[#181818] p-1 rounded-lg border border-neutral-800 text-[11px]">
                      <button
                        onClick={() => setStockFilter('all')}
                        className={`px-2.5 py-1 rounded transition ${
                          stockFilter === 'all' ? 'bg-[#D4AF37] text-black font-semibold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Всички ({totalProducts})
                      </button>
                      <button
                        onClick={() => setStockFilter('inStock')}
                        className={`px-2.5 py-1 rounded transition ${
                          stockFilter === 'inStock' ? 'bg-emerald-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        В наличност
                      </button>
                      <button
                        onClick={() => setStockFilter('lowStock')}
                        className={`px-2.5 py-1 rounded transition ${
                          stockFilter === 'lowStock' ? 'bg-amber-600 text-white font-semibold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Ниска (&le;3)
                      </button>
                      <button
                        onClick={() => setStockFilter('outOfStock')}
                        className={`px-2.5 py-1 rounded transition ${
                          stockFilter === 'outOfStock' ? 'bg-rose-700 text-white font-semibold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Изчерпани
                      </button>
                    </div>
                  </div>

                  {/* Primary Add Product Button */}
                  <button
                    onClick={handleOpenAddProduct}
                    className="gold-btn px-4 py-2.5 rounded-lg text-xs font-cinzel font-bold text-black flex items-center justify-center gap-2 shadow-lg shrink-0 cursor-pointer"
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>+ Нов Продукт & Снимка</span>
                  </button>
                </div>

                {/* Stock Table */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-[#181818] text-[#E6CA65] font-cinzel text-[11px] uppercase tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="py-3 px-4">Снимка & Продукт</th>
                          <th className="py-3 px-3">Категория</th>
                          <th className="py-3 px-3">Цена</th>
                          <th className="py-3 px-4 text-center">Наличност в Склада</th>
                          <th className="py-3 px-4 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {filteredProducts.map((p) => {
                          const isOutOfStock = p.stock === 0;
                          const isLowStock = p.stock > 0 && p.stock <= 3;

                          return (
                            <tr key={p.id} className="hover:bg-[#161616] transition group">
                              {/* Product Info & Photo */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-black border border-neutral-800 overflow-hidden shrink-0 relative group/thumb">
                                    <img
                                      src={getAssetUrl(p.image)}
                                      onError={(e) => handleImageError(e, 'logo.png')}
                                      alt={p.title}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition duration-300"
                                    />
                                    {p.badge && (
                                      <span className="absolute top-0.5 right-0.5 bg-[#D4AF37] text-black text-[8px] font-bold px-1 rounded-sm">
                                        {p.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-white text-xs leading-snug">
                                      {p.title}
                                    </h4>
                                    <span className="text-[11px] text-gray-400 block font-light">
                                      {p.specs}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-3">
                                <span className="bg-[#1c1c1c] border border-neutral-700 text-gray-300 text-[10px] px-2 py-0.5 rounded-full inline-block">
                                  {p.categoryLabel}
                                </span>
                              </td>

                              {/* Price */}
                              <td className="py-3 px-3 font-semibold text-white tabular-nums">
                                {p.price.toFixed(2)} лв.
                              </td>

                              {/* Stock Management Controls */}
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  {/* Real-time Stepper */}
                                  <div className="flex items-center border border-neutral-700 bg-[#161616] rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => onUpdateStock(p.id, Math.max(0, p.stock - 1))}
                                      disabled={p.stock <= 0}
                                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                      title="Намали бройка (-1)"
                                    >
                                      <i className="fa-solid fa-minus text-[10px]"></i>
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.stock}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        onUpdateStock(p.id, isNaN(val) ? 0 : Math.max(0, val));
                                      }}
                                      className="w-12 text-center text-xs font-mono font-bold bg-transparent text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => onUpdateStock(p.id, p.stock + 1)}
                                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                                      title="Увеличи бройка (+1)"
                                    >
                                      <i className="fa-solid fa-plus text-[10px]"></i>
                                    </button>
                                  </div>

                                  {/* Stock Status Badge */}
                                  <div className="mt-1.5">
                                    {isOutOfStock ? (
                                      <span className="text-[10px] text-rose-400 font-semibold bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <i className="fa-solid fa-circle-xmark text-[9px]"></i> Изчерпано (0)
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <i className="fa-solid fa-triangle-exclamation text-[9px]"></i> Ограничено ({p.stock} бр.)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <i className="fa-solid fa-check text-[9px]"></i> Налично ({p.stock} бр.)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditProduct(p)}
                                    className="p-1.5 rounded-md bg-neutral-800 hover:bg-[#D4AF37] text-gray-300 hover:text-black transition cursor-pointer"
                                    title="Редактирай продукт и снимка"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Сигурни ли сте, че искате да изтриете "${p.title}"?`)) {
                                        onDeleteProduct(p.id);
                                        showToast(`Продуктът беше изтрит.`);
                                      }
                                    }}
                                    className="p-1.5 rounded-md bg-neutral-800 hover:bg-rose-900 text-gray-300 hover:text-white transition cursor-pointer"
                                    title="Изтрий продукт"
                                  >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500">
                              <i className="fa-solid fa-box-open text-3xl mb-2 text-neutral-600 block"></i>
                              <span>Няма намерени продукти по избраните критерии.</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: SERVICES & PRICING MANAGEMENT */}
            {/* ========================================================= */}
            {activeTab === 'services' && (
              <div className="space-y-8">
                
                {/* SECTION 2A: OFFICIAL PRICE LIST TABLE */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-neutral-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-cinzel text-lg font-bold text-white">
                          Официален Ценоразпис на Салона
                        </h3>
                        <span className="text-[10px] text-[#E6CA65] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Показва се в секция "Услуги"
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 font-light">
                        Добавяйте или редактирайте имената, времетраенето и точните цени на салонните процедури.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddPriceItem}
                      className="gold-btn px-3.5 py-2 rounded-lg text-xs font-cinzel font-bold text-black flex items-center gap-1.5 shadow shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>+ Добави Услуга в Ценоразписа</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-[#181818] text-[#E6CA65] font-cinzel text-[11px] uppercase tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="py-3 px-4">Име на Услугата / Процедурата</th>
                          <th className="py-3 px-3">Времетраене</th>
                          <th className="py-3 px-3">Цена</th>
                          <th className="py-3 px-3 text-center">Статус</th>
                          <th className="py-3 px-4 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {priceList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-[#161616] transition">
                            <td className="py-3 px-4 font-medium text-white">
                              <div className="flex items-center gap-2">
                                <span>{item.service}</span>
                                {item.highlight && (
                                  <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#E6CA65] text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                    ТОП
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">
                              {item.duration || '—'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#E6CA65] font-mono text-sm">
                              {item.price}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.highlight ? (
                                <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                                  Акцент
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500">Стандартна</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditPriceItem(idx)}
                                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-[#D4AF37] text-gray-300 hover:text-black transition cursor-pointer"
                                  title="Редактирай име и цена"
                                >
                                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Сигурни ли сте, че искате да изтриете "${item.service}" от ценоразписа?`)) {
                                      onDeletePriceItem(idx);
                                      showToast('Услугата беше изтрита от ценоразписа.');
                                    }
                                  }}
                                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-rose-900 text-gray-300 hover:text-white transition cursor-pointer"
                                  title="Изтрий услуга"
                                >
                                  <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 2B: MAIN FEATURED SALON SERVICE CARDS */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-neutral-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-cinzel text-lg font-bold text-white">
                          Основни Салонни Карти (Портфолио)
                        </h3>
                        <span className="text-[10px] text-[#E6CA65] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          6 водещи карти
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 font-light">
                        Картите с икони и начална цена, които посрещат клиентите в секцията с услуги.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddSalonService}
                      className="text-xs text-[#E6CA65] hover:text-black hover:bg-[#D4AF37] border border-[#D4AF37]/40 px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>+ Добави Салонна Карта</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salonServices.map((srv) => (
                      <div
                        key={srv.id}
                        className="bg-[#171717] border border-neutral-800 hover:border-[#D4AF37]/40 rounded-xl p-4 flex flex-col justify-between transition"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#E6CA65]">
                              <i className={`fa-solid ${srv.iconClass || 'fa-wand-magic'}`}></i>
                            </div>
                            <span className="text-xs font-semibold text-[#E6CA65] font-mono">
                              {srv.startingPrice}
                            </span>
                          </div>
                          <h4 className="font-cinzel text-sm font-bold text-white mb-2">
                            {srv.title}
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-3 font-light mb-4">
                            {srv.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-neutral-800 flex justify-between items-center text-xs">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                            {srv.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditSalonService(srv)}
                              className="text-xs text-[#E6CA65] hover:underline"
                            >
                              Редактирай
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Изтриване на салонна карта "${srv.title}"?`)) {
                                  onDeleteSalonService(srv.id);
                                  showToast('Салонната карта беше премахната.');
                                }
                              }}
                              className="text-xs text-rose-400 hover:underline"
                            >
                              Изтрий
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: TEAM (STYLISTS) */}
            {/* ========================================================= */}
            {activeTab === 'team' && (
              <div className="max-w-4xl space-y-5">
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-5 shadow-xl">
                  <div className="mb-5 border-b border-neutral-800 pb-4">
                    <h3 className="font-cinzel text-lg font-bold text-white">Екип от стилисти</h3>
                    <p className="text-xs text-gray-400 mt-1 font-light">
                      Тези стилисти се показват в падащото меню на формата за резервация. Промените се виждат на сайта
                      веднага след запазване. „Първи свободен стилист“ винаги е първият избор.
                    </p>
                  </div>

                  {teamRows.length === 0 && (
                    <p className="text-xs text-gray-400 py-4">
                      Няма добавени стилисти. Клиентите ще могат да избират само „Първи свободен стилист“.
                    </p>
                  )}

                  <div className="space-y-3">
                    {teamRows.map((row, index) => (
                      <div
                        key={row._k}
                        className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.4fr_1.4fr_auto] gap-2 items-center bg-[#171717] border border-neutral-800 rounded-lg p-3"
                      >
                        <input
                          type="text"
                          maxLength={100}
                          value={row.name}
                          onChange={(e) => updateTeamRow(row._k, { name: e.target.value })}
                          placeholder="Име *"
                          aria-label={`Име на стилист ${index + 1}`}
                          className="w-full bg-[#0f0f0f] border border-neutral-700 rounded-lg py-2 px-3 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                        <input
                          type="text"
                          maxLength={150}
                          value={row.role}
                          onChange={(e) => updateTeamRow(row._k, { role: e.target.value })}
                          placeholder="Длъжност (напр. Главен колорист)"
                          aria-label={`Длъжност на стилист ${index + 1}`}
                          className="w-full bg-[#0f0f0f] border border-neutral-700 rounded-lg py-2 px-3 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                        <input
                          type="text"
                          maxLength={150}
                          value={row.experience}
                          onChange={(e) => updateTeamRow(row._k, { experience: e.target.value })}
                          placeholder="Опит (напр. 8+ години)"
                          aria-label={`Опит на стилист ${index + 1}`}
                          className="w-full bg-[#0f0f0f] border border-neutral-700 rounded-lg py-2 px-3 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                        />
                        <button
                          onClick={() => removeTeamRow(row)}
                          aria-label={`Премахни ${row.name || 'стилист ' + (index + 1)}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer justify-self-end"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                      onClick={addTeamRow}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#E6CA65] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-user-plus"></i>
                      <span>Добави стилист</span>
                    </button>
                    <div className="flex-1"></div>
                    {teamDraft && (
                      <button
                        onClick={() => setTeamDraft(null)}
                        className="px-3.5 py-2 rounded-lg text-xs text-gray-300 border border-neutral-700 hover:bg-neutral-800 transition cursor-pointer"
                      >
                        Отказ
                      </button>
                    )}
                    <button
                      onClick={handleSaveTeam}
                      disabled={!teamDraft || savingTeam || teamRows.some((r) => !r.name.trim())}
                      className="gold-btn-gradient px-4 py-2 rounded-lg text-xs font-cinzel font-bold text-black flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <i className={`fa-solid ${savingTeam ? 'fa-circle-notch fa-spin' : 'fa-check'}`}></i>
                      <span>{savingTeam ? 'Запазване...' : 'Запази екипа'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: SETTINGS & DATA BACKUP */}
            {/* ========================================================= */}
            {activeTab === 'settings' && (
              <div className="max-w-3xl space-y-6">
                
                {/* Admin passcode */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-cinzel text-base font-bold text-white mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-key text-[#E6CA65]"></i>
                    <span>Код за достъп до панела</span>
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 font-light">
                    Кодът се пази само на сървъра (криптиран) и не се вижда никъде в сайта. Използвайте поне 8
                    символа. След смяна всички други влезли сесии се затварят.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Текущ код"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Нов код (мин. 8 символа)"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Повторете новия код"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      className="bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleChangePin}
                    disabled={isChangingPin || !currentPinInput || !newPinInput}
                    className="gold-btn px-4 py-2 rounded-lg text-xs font-semibold text-black disabled:opacity-60"
                  >
                    {isChangingPin ? 'Запазване...' : 'Запази нов код'}
                  </button>
                </div>

                {/* Backup & Restore */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-cinzel text-base font-bold text-white mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-cloud-arrow-down text-[#E6CA65]"></i>
                    <span>Резервно копие (Backup & Export)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 font-light">
                    Свалете пълен JSON архив с всички добавени продукти, снимки, складови количества и ценоразпис.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-[#D4AF37] text-gray-200 hover:text-black text-xs font-medium transition flex items-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-file-export"></i>
                      <span>Експортирай като JSON файл</span>
                    </button>

                    <label className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-medium transition flex items-center gap-2 cursor-pointer border border-neutral-700">
                      <i className="fa-solid fa-file-import"></i>
                      <span>Импортирай JSON файл</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Reset Factory Defaults */}
                <div className="bg-[#121212] border border-rose-900/40 rounded-xl p-5 shadow-xl">
                  <h3 className="font-cinzel text-base font-bold text-rose-400 mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>Възстановяване на първоначални данни</span>
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 font-light">
                    Възстановява първоначалния каталог с продукти, наличности и ценоразпис от salonData. Всички ръчно добавени артикули ще бъдат премахнати.
                  </p>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('ВНИМАНИЕ: Това ще възстанови оригиналния фабричен списък с продукти и услуги. Продължавате ли?')) {
                        if (await onResetAllData()) showToast('Данните бяха възстановени до първоначалните!');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-xs font-medium transition border border-rose-800/60 cursor-pointer"
                  >
                    Възстанови фабрични настройки
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT & ATTACH PHOTO */}
      {/* ========================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
          <div className="bg-[#111111] border border-[#D4AF37]/50 rounded-2xl w-full max-w-2xl my-8 p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] text-sm">
                  <i className="fa-solid fa-box"></i>
                </div>
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-white">
                    {editingProductId ? 'Редактиране на Продукт' : 'Добавяне на Нов Продукт в Бутика'}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Попълнете информацията и прикачете снимка на продукта
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProduct} className="overflow-y-auto space-y-4 pr-1 flex-1">
              
              {/* Product Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Име на продукта *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Славянска Коса 60 см - Пясъчен Балеаж"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Photo Attachment Section */}
              <div className="bg-[#161616] border border-neutral-800 rounded-xl p-4">
                <label className="block text-xs font-semibold text-[#E6CA65] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-camera"></i>
                    <span>Прикачване на снимка на продукта *</span>
                  </span>
                  <span className="text-[10px] text-gray-400 lowercase font-normal">
                    (jpg, png, webp)
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="w-28 h-28 rounded-xl bg-black border border-[#D4AF37]/40 overflow-hidden relative shrink-0 shadow-md">
                    {productForm.image ? (
                      <img
                        src={getAssetUrl(productForm.image)}
                        onError={(e) => handleImageError(e, 'logo.png')}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                        <i className="fa-solid fa-image text-2xl mb-1"></i>
                        <span>Няма снимка</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls & URL */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="gold-btn px-3 py-2 rounded-lg text-xs font-medium text-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-upload"></i>
                        <span>Качи снимка от компютър</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      {productForm.image && (
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, image: '' })}
                          className="text-xs text-neutral-400 hover:text-rose-400 px-2 py-1"
                        >
                          Изчисти
                        </button>
                      )}
                    </div>

                    {/* Or URL input */}
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">
                        или въведете директен URL адрес на изображение:
                      </span>
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={productForm.image}
                        onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                        className="w-full bg-[#1c1c1c] border border-neutral-700 rounded-lg py-1.5 px-3 text-[11px] text-gray-200 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Salon Photos Picker */}
                <div className="mt-3 pt-3 border-t border-neutral-800">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">
                    Изберете от галерията на салона:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_PRODUCT_IMAGES.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setProductForm({ ...productForm, image: preset.url })}
                        className={`h-12 rounded-lg border overflow-hidden transition relative cursor-pointer ${
                          productForm.image === preset.url
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]'
                            : 'border-neutral-700 hover:border-neutral-500 opacity-70 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={getAssetUrl(preset.url)}
                          onError={(e) => handleImageError(e, 'logo.png')}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Категория *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let label = 'Екстеншъни';
                      if (cat === 'cosmetics') label = 'Без сулфати';
                      if (cat === 'tools') label = 'Професионален уред';
                      if (cat === 'accessories') label = '100% Mulberry Silk';
                      setProductForm({ ...productForm, category: cat, categoryLabel: label });
                    }}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="extensions">Екстеншъни & Коса</option>
                    <option value="cosmetics">Козметика & Шампоани</option>
                    <option value="tools">Уреди за стилизиране</option>
                    <option value="accessories">Аксесоари & Грижа</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Етикет на категорията
                  </label>
                  <input
                    type="text"
                    placeholder="напр. Славянска Коса (100g)"
                    value={productForm.categoryLabel}
                    onChange={(e) => setProductForm({ ...productForm, categoryLabel: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Price, Stock & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Цена (лв.) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    placeholder="250"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E6CA65] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Наличност (бр.) *</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="5"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full bg-[#181818] border border-[#D4AF37]/50 rounded-lg py-2 px-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Бадж / Значка
                  </label>
                  <input
                    type="text"
                    placeholder="NEW, BESTSELLER, TOP"
                    value={productForm.badge}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Specs */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Характеристики / Размери
                </label>
                <input
                  type="text"
                  placeholder="напр. 55 см (100 гр) • 100% естествен косъм"
                  value={productForm.specs}
                  onChange={(e) => setProductForm({ ...productForm, specs: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Описание на продукта
                </label>
                <textarea
                  rows={2}
                  placeholder="Подробно описание на артикула..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                ></textarea>
              </div>

              {/* Bullet Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Акценти & Предимства (булети)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDetail}
                    className="text-xs text-[#E6CA65] hover:underline"
                  >
                    + Добави булет
                  </button>
                </div>
                <div className="space-y-2">
                  {productForm.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2">
                      <i className="fa-solid fa-check text-[10px] text-[#E6CA65]"></i>
                      <input
                        type="text"
                        value={detail}
                        onChange={(e) => handleUpdateDetail(dIdx, e.target.value)}
                        placeholder="Предимство на продукта..."
                        className="flex-1 bg-[#181818] border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDetail(dIdx)}
                        className="text-neutral-500 hover:text-rose-400 p-1"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-medium"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2 rounded-lg text-xs font-cinzel font-bold text-black shadow-lg"
                >
                  {editingProductId ? 'Запази Промените' : 'Добави в Каталога'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRICE LIST ITEM (SERVICES) */}
      {/* ========================================================= */}
      {isPriceItemModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#111111] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#E6CA65] text-sm">
                  <i className="fa-solid fa-scissors"></i>
                </div>
                <h3 className="font-cinzel text-base font-bold text-white">
                  {editingPriceIndex !== null ? 'Редактиране на Услуга (Име и Цена)' : 'Добавяне на Нова Салонна Услуга'}
                </h3>
              </div>
              <button
                onClick={() => setIsPriceItemModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-900 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSavePriceItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Име на услугата / Процедурата *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Поставяне на треси (на ред)"
                  value={priceItemForm.service}
                  onChange={(e) => setPriceItemForm({ ...priceItemForm, service: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#E6CA65] uppercase tracking-wider mb-1.5">
                    Цена (лв.) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр. 60 лв. / ред или 180 лв."
                    value={priceItemForm.price}
                    onChange={(e) => setPriceItemForm({ ...priceItemForm, price: e.target.value })}
                    className="w-full bg-[#181818] border border-[#D4AF37]/50 rounded-lg py-2.5 px-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Времетраене
                  </label>
                  <input
                    type="text"
                    placeholder="напр. 60 - 90 мин."
                    value={priceItemForm.duration}
                    onChange={(e) => setPriceItemForm({ ...priceItemForm, duration: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#181818] rounded-lg border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Маркирай като ТОП услуга</span>
                  <span className="text-[10px] text-gray-400">Ще получи златен акцент в ценоразписа</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!priceItemForm.highlight}
                  onChange={(e) => setPriceItemForm({ ...priceItemForm, highlight: e.target.checked })}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPriceItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-gray-300 text-xs"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2 rounded-lg text-xs font-cinzel font-bold text-black"
                >
                  {editingPriceIndex !== null ? 'Обнови Услугата' : 'Запази в Ценоразписа'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT MAIN SALON SERVICE CARD */}
      {/* ========================================================= */}
      {isSalonServiceModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-[#111111] border border-[#D4AF37]/50 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <h3 className="font-cinzel text-base font-bold text-white">
                {editingServiceCardId ? 'Редактиране на Салонна Карта' : 'Нова Салонна Карта'}
              </h3>
              <button
                onClick={() => setIsSalonServiceModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-900 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveSalonService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Заглавие на услугата *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Удължаване и сгъстяване на коса"
                  value={serviceCardForm.title}
                  onChange={(e) => setServiceCardForm({ ...serviceCardForm, title: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#E6CA65] uppercase tracking-wider mb-1.5">
                    Начална цена *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр. От 80 лв. или Консултация: БЕЗПЛАТНО"
                    value={serviceCardForm.startingPrice}
                    onChange={(e) => setServiceCardForm({ ...serviceCardForm, startingPrice: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Font Awesome Икона
                  </label>
                  <select
                    value={serviceCardForm.iconClass}
                    onChange={(e) => setServiceCardForm({ ...serviceCardForm, iconClass: e.target.value })}
                    className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="fa-wand-magic">Магическа пръчица (Екстеншъни)</option>
                    <option value="fa-palette">Палитра (Боядисване & Балеаж)</option>
                    <option value="fa-spa">Спа & Грижа (Терапии & Ботокс)</option>
                    <option value="fa-scissors">Ножици (Подстригване)</option>
                    <option value="fa-brush">Четка (Грим & Стайлинг)</option>
                    <option value="fa-arrows-rotate">Стрелки (Поддръжка & Сваляне)</option>
                    <option value="fa-gem">Диамант (VIP Лукс)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Описание на услугата
                </label>
                <textarea
                  rows={3}
                  value={serviceCardForm.description}
                  onChange={(e) => setServiceCardForm({ ...serviceCardForm, description: e.target.value })}
                  className="w-full bg-[#181818] border border-neutral-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSalonServiceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-gray-300 text-xs"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  className="gold-btn px-5 py-2 rounded-lg text-xs font-cinzel font-bold text-black"
                >
                  Запази
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
