import type { BookingRecord, BookingStatus, Catalog, EmailResult, OrderRecord, OrderStatus, Product } from './types';

/**
 * Talks to the VIP Beauty House server (server/server.mjs).
 * The server is the single source of truth for products, stock, orders and bookings.
 */

// Works at the site root and when the site is built for a sub-folder (BASE_URL like "/salon/").
const basePrefix = (import.meta.env.BASE_URL || '/').startsWith('/')
  ? (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  : '';
const API = `${basePrefix}/api`;

export class ApiError extends Error {
  status: number;
  code: string;
  data: any;

  constructor(status: number, code: string, message: string, data: any = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } catch {
    throw new ApiError(
      0,
      'network',
      'Няма връзка със сървъра. Проверете интернет връзката си или опитайте отново след малко.'
    );
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error || 'error',
      data?.message || `Грешка от сървъра (${response.status}).`,
      data || {}
    );
  }
  return data as T;
}

// ------------------------------------------------------------------ public

export const getCatalog = () => request<Catalog & { updatedAt: string }>('GET', '/catalog');

export interface OrderPayload {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  courier: 'econt' | 'speedy';
  paymentMethod: 'cod';
  notes: string;
  items: { productId: string; quantity: number }[];
}

export const createOrder = (payload: OrderPayload) =>
  request<{
    order: {
      id: string;
      total: number;
      subtotal: number;
      shipping: number;
      courier: string;
      name: string;
      phone: string;
    };
  }>('POST', '/orders', payload);

export interface BookingPayload {
  service: string;
  stylist: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  agreedToTerms: boolean;
}

export const createBooking = (payload: BookingPayload) =>
  request<{
    booking: {
      id: string;
      date: string;
      time: string;
      service: string;
      stylistName: string;
      name: string;
      phone: string;
      email: string;
    };
  }>('POST', '/bookings', payload);

// ------------------------------------------------------------------ admin

type CatalogResult = { catalog: Catalog };

export const adminSession = () => request<{ authenticated: boolean }>('GET', '/admin/session');
export const adminLogin = (pin: string) => request<{ authenticated: boolean }>('POST', '/admin/login', { pin });
export const adminLogout = () => request<{ ok: boolean }>('POST', '/admin/logout');
export const adminChangePin = (currentPin: string, newPin: string) =>
  request<{ ok: boolean }>('POST', '/admin/pin', { currentPin, newPin });

export const adminInbox = () =>
  request<{ orders: OrderRecord[]; bookings: BookingRecord[]; emailEnabled: boolean }>('GET', '/admin/inbox');
export const adminSetOrderStatus = (id: string, status: OrderStatus) =>
  request<{ order: OrderRecord } & CatalogResult>('PATCH', `/admin/orders/${encodeURIComponent(id)}`, { status });
export const adminDeleteOrder = (id: string) =>
  request<{ ok: boolean }>('DELETE', `/admin/orders/${encodeURIComponent(id)}`);
export const adminSetBookingStatus = (id: string, status: BookingStatus) =>
  request<{ booking: BookingRecord; email: EmailResult }>('PATCH', `/admin/bookings/${encodeURIComponent(id)}`, { status });
export const adminResendBookingEmail = (id: string) =>
  request<{ booking: BookingRecord; email: EmailResult }>('POST', `/admin/bookings/${encodeURIComponent(id)}/email`, {});
export const adminDeleteBooking = (id: string) =>
  request<{ ok: boolean }>('DELETE', `/admin/bookings/${encodeURIComponent(id)}`);

export const adminAddProduct = (product: Product) => request<CatalogResult>('POST', '/admin/products', product);
export const adminUpdateProduct = (product: Product) =>
  request<CatalogResult>('PUT', `/admin/products/${encodeURIComponent(product.id)}`, product);
export const adminDeleteProduct = (id: string) =>
  request<CatalogResult>('DELETE', `/admin/products/${encodeURIComponent(id)}`);
export const adminSetStock = (id: string, stock: number) =>
  request<CatalogResult>('PATCH', `/admin/products/${encodeURIComponent(id)}/stock`, { stock });
export const adminSavePriceList = (items: unknown[]) => request<CatalogResult>('PUT', '/admin/pricelist', { items });
export const adminSaveStylists = (items: unknown[]) => request<CatalogResult>('PUT', '/admin/stylists', { items });
export const adminSaveServices = (items: unknown[]) => request<CatalogResult>('PUT', '/admin/services', { items });
export const adminImportCatalog = (data: Partial<Catalog>) =>
  request<CatalogResult>('POST', '/admin/catalog/import', data);
export const adminResetCatalog = () => request<CatalogResult>('POST', '/admin/catalog/reset', {});
