export interface Product {
  id: string;
  title: string;
  category: 'extensions' | 'cosmetics' | 'tools' | 'accessories' | string;
  categoryLabel: string;
  badge?: string;
  description: string;
  price: number;
  specs: string;
  image: string;
  stock: number;
  details?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SalonService {
  id: string;
  title: string;
  iconClass: string;
  description: string;
  startingPrice: string;
  duration?: string;
  category: string;
}

export interface PriceItem {
  id?: string;
  service: string;
  duration: string;
  price: string;
  highlight?: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  role: string;
  experience: string;
}

export interface BookingFormState {
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

// ---------------------------------------------------------------- server data

export interface Catalog {
  products: Product[];
  priceList: PriceItem[];
  salonServices: SalonService[];
  stylists: Stylist[];
}

export type OrderStatus = 'new' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
export type BookingStatus = 'new' | 'confirmed' | 'done' | 'no_show' | 'cancelled';

export interface OrderRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    notes: string;
  };
  courier: 'econt' | 'speedy';
  paymentMethod: 'cod';
  items: { productId: string; title: string; price: number; quantity: number }[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface BookingRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: BookingStatus;
  service: string;
  stylistId: string;
  stylistName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  notes: string;
  emailSentAt?: string;
  emailError?: string;
}

/** Outcome of the confirmation email after Accept (null = nothing was sent). */
export type EmailResult = 'sent' | 'failed' | 'disabled' | 'no_address' | null;
