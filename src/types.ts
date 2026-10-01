export interface Product {
  id: string;
  title: string;
  category: 'extensions' | 'cosmetics' | 'tools' | 'accessories';
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
  notes: string;
  agreedToTerms: boolean;
}
