import { ItemData } from "./model/menu_list";

/* =========================
   MENU (PetPooja-aligned)
========================= */
export interface BrandPayload {
  brand_name: string;
  tagline?: string;
  description?: string;
  logo?: string;
  hero_image?: string;
  about_text?: string;
  about_image?: string;
  primary_color?: string;
  accent_color?: string;
  text_color_on_primary?: string;
}
export interface Brand extends BrandPayload {
  id: number;
  created_at: string;
  updated_at: string;
}
export interface RestaurantMenu {
  items: ItemData[];
  categories: MenuCategory[];
  variations?: any[];
  addongroups?: any[];
  taxes?: any[];
  discounts?: any[];
}

export interface MenuCategory {
  categoryid: string;
  categoryname: string;
  categoryrank: string;
  parent_category_id: string;
}

/* =========================
   CART
========================= */
export interface SelectedAddonInCart {
  id: string;
  name: string;
  price: number;
  quantity: number;
  group_id: string;
  group_name: string;
}
export interface CartItem extends ItemData {
  cartKey: string; // ✅ UNIQUE per cart line

  quantity: number;

  unit_price: number;
  base_price: number;
  addon_price: number;

  variation_id?: string;
  variation_name?: string;

  // ✅ Properly typed addons array
  selected_addons?: SelectedAddonInCart[];

  // Keep for backward compatibility during development
  selectedAddons?: Record<string, SelectedAddonInCart[]>;
}


/* =========================
   RESTAURANT
========================= */

export type Restaurant = {
  rest_id: string; // PetPooja restaurantid / menusharingcode
  name: string;

  tagline?: string | null;
  description?: string | null;

  logo?: string | null;
  hero_image?: string | null;

  about_text?: string | null;
  about_image?: string | null;

  theme_primary?: string | null;
  theme_accent?: string | null;
  theme_text_on_primary?: string | null;
};

/* =========================
   USER
========================= */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;

  isAdmin?: boolean;

  loyaltyPoints?: {
    points: number;
    earnedAt: string;
  }[];

  dob?: string;
  anniversaryDate?: string;


  dietaryPreferences?: {
    likes: string[];
    dislikes: string[];
    allergies: string[];
  };

  addresses?: DeliveryAddress[];
}

/* =========================
   DELIVERY
========================= */

export interface DeliveryInfo {
  riderName?: string;
  riderPhone?: string;
  etaMinutes?: number;
  taskId?: string;
  rider_name?: string;
  rider_contact?: string;
  tracking_url?: string;
  status_code?: string;
  rider_lat?: string;
  rider_long?: string;
  rider_cancelled?: boolean;
}

export interface DeliveryAddress {
  id?: string;
  fullAddress: string;
  flatNo: string;
  landmark: string;
  city?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  state?: string;
  isDefault?: boolean;
}

/* =========================
   ORDERS
========================= */

export interface Order {

  id: string;
  restId: string;
  resturantName: string;
  userId: string;
  items: CartItem[];

  customer: {
    name: string;
    email: string;
    phone: string;
  };

  deliveryAddress?: DeliveryAddress;

  subtotal: number;
  discountAmount?: number;
  loyaltyDiscount?: number;
  gstAmount?: number;
  totalAmount: number;

  pointsEarned?: number;
  createdAt: string;
  refundAmount?: number | null;
  status:
  | 'Order Placed'
  | 'Accepted'
  | 'Food Ready'
  | 'Out For Delivery'
  | 'Delivered'
  | 'Cancelled';

  rating?: number;
  feedback?: string;

  complaint?: Complaint;
  refundStatus?: 'none' | 'pending' | 'processed' | 'failed';

  deliveryInfo?: DeliveryInfo;

  delivery_message?: {
    status: boolean;
    message: string;
    status_code: string;
    taskId: string;
    vendor_order_id: string;
  } | null;

  externalOrderId?: string;
}

/* =========================
   COMPLAINTS
========================= */

export interface Complaint {
  id: string;
  itemNames: string[];
  comments: string;

  status: 'pending' | 'approved' | 'rejected';

  createdAt: string;
  resolvedAt?: string;

  totalAmount: number;
}

/* =========================
   TABLES & RESERVATIONS
========================= */

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  _status: 'available' | 'booked';
}

export interface Reservation {
  id: string;
  bookingId: string;
  restId: string;

  userId?: string;
  tableId?: string;
  tableNumber?: string,
  endtime?: string,
  name: string;
  email: string;
  phone: string;

  date: string;
  time: string;
  guests: number;
  requests: string;

  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
}

/* =========================
   LOYALTY
========================= */

export interface LoyaltyConfig {
  rupeesPerPoint: number;
}

/* =========================
   AI / MISC
========================= */

export interface PredictionResult {
  spoilageDate: string;
  reasoning: string;
}

export interface DishRecommendation {
  dishName: string;
  reason: string;
  offer?: string;
}

export interface PartyLead {
  id: string;
  headcount: number;
  eventDate: string;
  eventTime: string;
  location: string;
  menu: string;

  contactNumber: string;

  quoteAmount?: number;
  status: 'pending-quote' | 'quoted' | 'accepted' | 'declined';
  declineReason?: string;

  createdAt: string;
}

/* =========================
   CHAT
========================= */

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'model';
  content: string;

  timestamp?: string;
  metadata?: {
    categoriesCount?: number;
    itemsCount?: number;
    error?: boolean;
  };
}
