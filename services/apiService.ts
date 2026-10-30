import { GoogleGenAI, Type } from "@google/genai";
import {
  User,
  Order,
  Reservation,
  CartItem,
  LoyaltyConfig,
  DishRecommendation,
  ChatMessage,
  PartyLead,
  Complaint,
  RestaurantTable,
  DeliveryAddress,
  RestaurantMenu,
  BrandPayload,
} from "../types";

// import { brandsData } from '../data';
import { supabase } from "./supabaseClient";
import { BASE_URL } from "../src/config";
export const apiFetchRestaurantMapping = async (rest_id: string) => {
  const res = await fetch(
    `${BASE_URL}/resturents/restaurant-by-mappingId?resturent_identifier=${rest_id}`,
  );
  return res.json();
};

//Brand//

export const apiGetAllBrands = async (page = 1, perPage = 10) => {
  const res = await fetch(
    `${BASE_URL}/brand?page=${page}&per_page=${perPage}`
  );
  return res.json();
};
export const apiGetBrandById = async (id: string) => {
  const res = await fetch(`${BASE_URL}/brand/${id}`);
  return res.json();
};
export const apiAddBrand = async (payload: BrandPayload) => {
  const res = await fetch(`${BASE_URL}/brand`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return res.json();
};
// ==========================
// 🕐 OUTLET TIMINGS API
// ==========================

export interface OutletTimeSlot {
  id?: string;
  open_time: string;   // "HH:MM" 24hr
  close_time: string;
  is_closed: boolean;
}

export interface OutletDaySchedule {
  day_of_week: number;   // 0=Sun … 6=Sat
  day_name: string;
  is_closed: boolean;
  slots: OutletTimeSlot[];
}

export interface OutletTimingsResponse {
  outlet_id: string;
  is_open: boolean;
  current_slot: { open: string; close: string } | null;
  next_open: { day: string; time: string } | null;
  schedule: OutletDaySchedule[];
}

/** GET /outlets/:outlet_id/timings — full weekly schedule + live status */
export async function apiGetOutletTimings(outletId: string): Promise<OutletTimingsResponse> {
  const res = await fetch(`${BASE_URL}/outlet/${outletId}/timings`);
  const json = await res.json();
  return json.data;
}

/** POST /outlets/:outlet_id/timings — save/replace one or more days */
export async function apiSaveOutletTimings(
  outletId: string,
  days: Array<{
    day_of_week: number;
    is_closed: boolean;
    slots?: Array<{ open_time: string; close_time: string }>;
  }>
) {
  const res = await fetch(`${BASE_URL}/outlet/${outletId}/timings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  return res.json();
}

/** PATCH /outlets/:outlet_id/timings/toggle-day — flip a day on/off instantly */
export async function apiToggleOutletDay(
  outletId: string,
  day_of_week: number,
  is_closed: boolean
) {
  const res = await fetch(`${BASE_URL}/outlet/${outletId}/timings/toggle-day`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day_of_week, is_closed }),
  });
  return res.json();
}
export const apiGetAllDiscounts = (page = 1, perPage = 20) =>
  fetch(`${BASE_URL}/discount?page=${page}&per_page=${perPage}`).then(r => r.json());

export const apiAddDiscount = (payload: { discount_code: string; discount_percentage: number }) =>
  fetch(`${BASE_URL}/discount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(r => r.json());

export const apiUpdateDiscount = (uuid: string, payload: any) =>
  fetch(`${BASE_URL}/discount/${uuid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(r => r.json());
/** POST /outlets/:outlet_id/timings/copy-to-all — copy one day's slots to all 7 days */
export async function apiCopyTimingsToAllDays(outletId: string, source_day: number) {
  const res = await fetch(`${BASE_URL}/outlet/${outletId}/timings/copy-to-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_day }),
  });
  return res.json();
}
// ==========================
// 🚚 DELIVERY CHARGES API
// ==========================

export const apiGetDeliveryCharges = async (
  page = 1,
  perPage = 100
) => {
  const res = await fetch(
    `${BASE_URL}/delivery-charge?page=${page}&per_page=${perPage}`
  );

  return res.json();
};

export const apiGetDeliveryChargeById = async (
  id: string
) => {
  const res = await fetch(
    `${BASE_URL}/delivery-charge/${id}`
  );

  return res.json();
};

export const apiAddDeliveryCharge = async (payload: {
  from_km: number;
  to_km: number;
  charge: number;
  is_active?: boolean;
}) => {
  const res = await fetch(
    `${BASE_URL}/delivery-charge`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return res.json();
};

export const apiUpdateDeliveryCharge = async (
  id: string,
  payload: Partial<{
    from_km: number;
    to_km: number;
    charge: number;
    is_active: boolean;
  }>
) => {
  const res = await fetch(
    `${BASE_URL}/delivery-charge/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return res.json();
};
export const apiDeleteDiscount = (uuid: string) =>
  fetch(`${BASE_URL}/discount/${uuid}`, { method: "DELETE" }).then(r => r.json());
export const apiDeleteDeliveryCharge = async (
  id: string
) => {
  const res = await fetch(
    `${BASE_URL}/delivery-charge/${id}`,
    {
      method: "DELETE",
    }
  );

  return res.json();
};
export const apiUpdateBrand = async (
  id: string,
  payload: Partial<BrandPayload>
) => {
  const res = await fetch(`${BASE_URL}/brand/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return res.json();
};
export const apiUploadBrandImage = async (
  id: string,
  file: File,
  type: "logo" | "hero" | "about"
) => {
  const formData = new FormData();
  formData.append("id", id);
  formData.append("type", type);
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/brand/upload-image`, {
    method: "POST",
    body: formData,
  });

  return res.json();
};
export async function apiResolveRestaurantByName(payload: {
  restaurant_id: string;
  lat: number;
  lng: number;
}) {
  const res = await fetch(`${BASE_URL}/resturents/resolve-by-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "No open outlet found nearby");
  }

  return data; // { rest_id, distance_km, outlet_name }
}
// Add after the existing apiGetOutlet function

export async function apiGetOutletByLocation(coords?: { lat: number; lng: number }) {
  const params = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  const res = await fetch(`${BASE_URL}/outlet/getbylocation${params}`);
  return res.json();
}
export const apiUploadRestaurantImage = async (
  rest_id: string,
  type: "logo" | "hero" | "about",
  file: File,
) => {
  const form = new FormData();
  form.append("rest_id", rest_id);
  form.append("type", type);
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/outlet/upload-image`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");

  return data.url as string;
};

export const apiBookRider = async (payload: {
  order_id: string;
  resturent_lat: number;
  resturent_lang: number;
  resturent_name: string;
  resturent_number: string;
  resturent_address: string;
  resturent_city: string;
}) => {
  const res = await fetch(`${BASE_URL}/rider/rider-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
};

export const apiCheckServiceAvailability = async (
  pikupLat: number,
  pickuplong: number,
  dropLat: number,
  dropLng: number,
) => {
  const res = await fetch(`${BASE_URL}/rider/service-availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pickupLatitude: pikupLat,
      pickupLongitude: pickuplong,
      dropLatitude: dropLat,
      dropLongitude: dropLng,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Service not available");
  }

  return json.data;
};
export async function apiAddBrandOutlet(payload: {
  location_id: string;
  outlet_id: string;  // UUID from outlet table
  brand_id: string;
}) {
  const res = await fetch(`${BASE_URL}/brand-outlet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
export async function apiGetBrandsWithOutlet(coords?: { lat: number; lng: number }) {
  const params = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  const res = await fetch(`${BASE_URL}/brand/with-outlets${params}`);
  return res.json();
}
// DELETE /brand-outlet/:id  — Remove by brand_outlet row id
export async function apiRemoveBrandOutlet(brandOutletId: string) {
  const res = await fetch(`${BASE_URL}/brand-outlet/${brandOutletId}`, {
    method: "DELETE",
  });
  return res.json();
}
// ==========================
// 🚚 CALCULATE DELIVERY CHARGE
// ==========================
export const apiGetDeliveryCharge =
  async (payload: {
    restaurantLat: number;
    restaurantLng: number;
    deliveryLat: number;
    deliveryLng: number;
  }) => {

    const res =
      await fetch(
        `${BASE_URL}/delivery-charge/delivery-charge`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(
            payload
          )
        }
      );

    return res.json();

  };
// ==========================
// 📦 DELIVERY POINTS API
// ==========================
export const apiGetMenuWebhookLogs = async () => {
  const res = await fetch(
    `${BASE_URL}/webhooks/menu-webhook-logs?limit=10&page=1`
  );

  return res.json();
};
export const apiUploadDeliveryPoints = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/delivery-points/upload`, {
    method: "POST",
    body: formData,
  });

  return res.json();
};

export const apiGetDeliveryPoints = async () => {
  const res = await fetch(`${BASE_URL}/delivery-points`);
  return res.json();
};
// GET /brand-outlet/:brand_id?page=1&per_page=100
// Returns outlets linked to a specific brand
export async function apiGetOutletsByBrand(
  brand_id: string,
  page = 1,
  perPage = 100
) {
  const res = await fetch(
    `${BASE_URL}/brand-outlet/${brand_id}?page=${page}&per_page=${perPage}`
  );
  return res.json();
}

// GET /brand-outlet  — All brand_outlets grouped by brand
export async function apiGetAllBrandOutlets() {
  const res = await fetch(`${BASE_URL}/brand-outlet`);
  return res.json();
}
export const apiAddRestaurant = async (payload: any, restId: string) => {
  const res = await fetch(`${BASE_URL}/outlet/${restId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res.json();
};
export async function apiAddTable(payload: {
  table_number: string;
  capacity: number;
  is_booked: boolean;
  outlet_id?: string;
  is_active?: boolean;
}) {
  try {
    const res = await fetch(`${BASE_URL}/outlet-table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err: any) {
    return { error: err.message };
  }
}
export async function apiUpdateTable(
  tableId: string,
  payload: {
    table_number: number;
    capacity: number;
    is_booked: boolean;
    outlet_id?: string;
    is_active?: boolean;
  },
) {
  try {
    const res = await fetch(`${BASE_URL}/outlet-table/${tableId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err: any) {
    return { error: err.message };
  }
}
export async function apiDeleteTable(
  tableId: string,
) {
  try {
    const res = await fetch(`${BASE_URL}/outlet-table/${tableId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return await res.json();
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function apiGetCategories(resturent_identifier: string) {
  const url = `${BASE_URL}/menu/catagory-by-resturent?resturent_identifier=${resturent_identifier}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
}
export async function apiGetAdminCategoriesMenu(resturent_identifier: string) {
  const url = `${BASE_URL}/menu/fetch-admin-menus-with-catagory`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resturent_identifier }),
  });

  const { data } = await res.json();

  // Normalize response for UI
  return data.map((category: any) => ({
    category: category.name, // Frontend expects category
    items: (category.menus || []).map((item: any) => ({
      itemid: item.itemid,
      name: item.itemname,
      isAvailable: item.active === "1", // check availability logic
      cuisine_tag: item.cuisine_tag || null,
      mood_tag: item.mood_tag || null,
    })),
  }));
}
export async function apiGetAddTable(outletId: string) {
  const res = await fetch(`${BASE_URL}/outlet-table/${outletId}/tables`);
  return res.json();
}
export async function apiGetTables(outletId: string) {
  const res = await fetch(`${BASE_URL}/outlet-table/${outletId}/tables`);
  return res.json();
}

export async function apiToggleTable(tableId: string, newState: boolean) {
  const res = await fetch(`${BASE_URL}/outlet-table/${tableId}/toggle-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: newState }),
  });

  return res.json();
}

// ✅ Restaurants API (global reusable)

export async function apiGetRestaurants() {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "name,tagline,description,logo,hero_image,about_text,about_image,theme_primary,theme_accent,theme_text_on_primary",
    )
    .order("name", { ascending: true });

  if (error) handleSupabaseError(error, "Fetch Restaurants");

  return data || [];
}

export async function apiGetAllRestaurant(page = 1, perPage = 1) {
  const res = await fetch(
    `${BASE_URL}/outlet?page=${page}&per_page=${perPage}`,
  );
  return res.json();
}
export async function apiGetRestaurantById(id: string) {
  const res = await fetch(`${BASE_URL}/outlet/${id}`);
  return res.json();
}

export async function apiGetMenu(
  resturent_identifier: string,
  category_id: string,
) {
  const url = `${BASE_URL}/menu/fetch-menus-by-catagory`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resturent_identifier, category_id }),
  });
  const data = await res.json();
  return data.data;
}

export async function apiGetOutlet(page = 1, perPage = 100) {
  const res = await fetch(
    `${BASE_URL}/outlet?page=${page}&per_page=${perPage}`,
  );
  return res.json();
}
export async function apiGetOutletTable(page = 1, perPage = 1) {
  const res = await fetch(
    `${BASE_URL}/outlet-table?page=${page}&per_page=${perPage}`,
  );
  return res.json();
}
// Add this new function in apiService.ts

/**
 * Check if email or phone already exists in profiles table
 */
export const apiCheckUserExists = async (
  email: string,
  phone: string
): Promise<{ exists: boolean; field: 'email' | 'phone' | null; message: string }> => {
  try {
    // Check email
    const { data: emailData } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (emailData) {
      return {
        exists: true,
        field: 'email',
        message: 'This email is already registered. Please login instead.'
      };
    }

    // Check phone
    // const { data: phoneData } = await supabase
    //   .from('profiles')
    //   .select('phone')
    //   .eq('phone', phone.trim())
    //   .maybeSingle();

    // if (phoneData) {
    //   return {
    //     exists: true,
    //     field: 'phone',
    //     message: 'This phone number is already registered. Please login instead.'
    //   };
    // }

    return {
      exists: false,
      field: null,
      message: ''
    };
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw new Error('Unable to verify account details. Please try again.');
  }
};
// --- CONSTANTS & CONFIG ---
// const PETPOOJA_CONFIG = {
//     BASE_URL: 'https://qle1yy2ydc.execute-api.ap-southeast-1.amazonaws.com/V1/',
//     API_KEY: 'mvf2jq1cx7uw3hrdop8b59isnte064ky',
//     APP_SECRET: '55c5d7e4cc8929c52375335be12efbdbf4bc0384',
//     ACCESS_TOKEN: '1ae75251701a8331088e83e165d77e00587b578f'

// };

// const STATIC_TABLE_INVENTORY: RestaurantTable[] = [
//     { id: 't1', name: 'T1', capacity: 2, type: '2-seater' },
//     { id: 't2', name: 'T2', capacity: 2, type: '2-seater' },
//     { id: 't3', name: 'T3', capacity: 2, type: '2-seater' },
//     { id: 't4', name: 'T4', capacity: 2, type: '2-seater' },
//     { id: 't5', name: 'T5', capacity: 4, type: '4-seater' },
//     { id: 't6', name: 'T6', capacity: 4, type: '4-seater' },
//     { id: 't7', name: 'T7', capacity: 6, type: '6-seater' },
// ];

// --- Utils ---
const simulateDelay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateOrderId = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dateString = `${day}${month}${year}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${dateString}-${randomPart}`;
};

const handleSupabaseError = (error: any, context: string) => {
  console.error(
    `[Supabase Error - ${context}]:`,
    error.message || error,
    error.details || "",
    error.hint || "",
  );
  throw new Error(error.message || `An error occurred during ${context}`);
};

// --- Petpooja API Helper ---
const callPetpoojaAPI = async (
  endpoint: string,
  method: "GET" | "POST",
  body?: any,
) => {
  return null;
};

export const apiCancelOrderOnPaymentFailed = async (
  restID: string,
  clientorderID: string,
  cancelReason = "Payment failed or cancelled by user",
) => {
  const res = await fetch(`${BASE_URL}/payment/cancel-order-onpaymentfailed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      restID,
      clientorderID,
      cancelReason,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Payment-failed cancellation failed");
  }

  return data;
};

// --- Email Service ---
const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
};

// --- API Functions ---
export const apiGetLoyaltyConfig = async (): Promise<LoyaltyConfig> => {
  const { data, error } = await supabase
    .from("loyalty_config")
    .select("*")
    .maybeSingle();
  if (error) {
    console.warn(
      "Failed to fetch loyalty config from Supabase.",
      error.message,
    );
    return { rupeesPerPoint: 100 };
  }
  if (!data) return { rupeesPerPoint: 100 };
  return { rupeesPerPoint: data.rupees_per_point };
};

export const apiSetLoyaltyConfig = async (
  config: LoyaltyConfig,
): Promise<LoyaltyConfig> => {
  const { error } = await supabase
    .from("loyalty_config")
    .upsert({ id: 1, rupees_per_point: config.rupeesPerPoint });
  if (error) handleSupabaseError(error, "Set Loyalty Config");
  return config;
};

export const applyFlatDiscount = (
  subtotal: number,
): {
  discountedTotal: number;
  discountAmount: number;
  discountPercentage: number;
} => {
  let discountPercentage = 0;
  if (subtotal > 2000) {
    discountPercentage = 0.25;
  } else if (subtotal >= 1000) {
    discountPercentage = 0.2;
  } else if (subtotal > 0) {
    discountPercentage = 0.15;
  }
  const discountAmount = subtotal * discountPercentage;
  const discountedTotal = subtotal - discountAmount;
  return { discountedTotal, discountAmount, discountPercentage };
};

export const apiGetUserValidPoints = async (
  userId: string,
): Promise<number> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("loyalty_points")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || !data.loyalty_points) return 0;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const validPoints = (data.loyalty_points as any[]).filter(
    (p: any) => new Date(p.earnedAt) >= oneYearAgo,
  );
  return validPoints.reduce((acc: number, p: any) => acc + p.points, 0);
};

// --- Address API ---
export const apiGetUserAddresses = async (
  userId: string,
): Promise<DeliveryAddress[]> => {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false }) // Defaults first
    .order("created_at", { ascending: false }); // Then newest first

  if (error) {
    console.error("Error fetching addresses:", error);
    return [];
  }

  return (data || []).map((addr: any) => ({
    id: addr.id,
    fullAddress: addr.full_address,
    flatNo: addr.flat_no,
    landmark: addr.landmark,
    isDefault: addr.is_default,
    coordinates:
      addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng } : undefined,
  }));
};

export const apiSaveUserAddress = async (
  userId: string,
  address: DeliveryAddress,
): Promise<DeliveryAddress> => {
  // If setting as default, unset others first
  if (address.isDefault) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
  }

  const dbAddress = {
    user_id: userId,
    full_address: address.fullAddress,
    flat_no: address.flatNo,
    landmark: address.landmark,
    is_default: !!address.isDefault,
    lat: address.coordinates?.lat || null,
    lng: address.coordinates?.lng || null,
  };

  const { data, error } = await supabase
    .from("addresses")
    .insert(dbAddress)
    .select()
    .single();

  if (error) handleSupabaseError(error, "Save Address");

  return {
    ...address,
    id: data.id,
    isDefault: data.is_default,
  };
};

// --- User API ---
export const apiGetUserById = async (userId: string): Promise<User | null> => {
  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) return null;

  // 2. Check admin status
  const { data: adminRecord } = await supabase
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = !!adminRecord || profile.is_admin === true;

  // 3. Fetch addresses
  const addresses = await apiGetUserAddresses(userId);

  // ✅ Normalize dietary preferences (CRITICAL)
  const dietary = profile.dietary_preferences || {};
  const normalize = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

  const dietaryPreferences = {
    likes: normalize(dietary.likes),
    dislikes: normalize(dietary.dislikes),
    allergies: normalize(dietary.allergies),
  };

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email || "",
    phone: profile.phone,
    passwordHash: "",
    isAdmin,
    loyaltyPoints: profile.loyalty_points || [],
    dob: profile.dob,
    anniversaryDate: profile.anniversary_date,
    dietaryPreferences,
    addresses,
  };
};

export const apiUpdateUser = async (
  userId: string,
  updates: Partial<User>,
): Promise<User> => {
  const dbUpdates: any = {};

  if (updates.name) dbUpdates.name = updates.name;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.dob) dbUpdates.dob = updates.dob;
  if (updates.anniversaryDate)
    dbUpdates.anniversary_date = updates.anniversaryDate;

  // ✅ Ensure dietaryPreferences always stored as arrays
  if (updates.dietaryPreferences) {
    dbUpdates.dietary_preferences = {
      likes: updates.dietaryPreferences.likes || [],
      dislikes: updates.dietaryPreferences.dislikes || [],
      allergies: updates.dietaryPreferences.allergies || [],
    };
  }

  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", userId);

    if (error) handleSupabaseError(error, "Update User");
  }

  return apiGetUserById(userId) as Promise<User>;
};

// --- Order API ---
export const apiGetUserOrders = async (userId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map((o: any) => mapDbOrderToType(o));
};

const mapDbOrderToType = (dbOrder: any): Order => ({
  id: dbOrder.id,
  resturantName: dbOrder.restaurant_name,
  restId: dbOrder.brand_id,
  userId: dbOrder.user_id,
  items: dbOrder.items,
  customer: dbOrder.customer,
  deliveryAddress: dbOrder.delivery_address,
  subtotal: dbOrder.subtotal,
  discountAmount: dbOrder.discount_amount,
  loyaltyDiscount: dbOrder.loyalty_discount,
  gstAmount: dbOrder.gst_amount,
  totalAmount: dbOrder.total_amount,
  pointsEarned: dbOrder.points_earned,
  createdAt: dbOrder.created_at,
  status: dbOrder.status,
  rating: dbOrder.rating,
  feedback: dbOrder.feedback,
  complaint: dbOrder.complaint,
  refundStatus: dbOrder.refund_status,
  deliveryInfo: dbOrder.delivery_info,
  externalOrderId: dbOrder.external_order_id,
  refundAmount: dbOrder.refund_amount,
  delivery_message: dbOrder.delivery_message,
});

export const apiGetOrderById = async (
  orderId: string,
): Promise<Order | undefined> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapDbOrderToType(data);
};

// export const apiCreateOrder = async (
//     brandId: Brand['id'],
//     userId: string,
//     items: CartItem[],
//     customer: Order['customer'],
//     deliveryAddress: DeliveryAddress,
//     subtotal: number,
//     loyaltyPointsToRedeem: number,
//     serverOrderId: string
// ): Promise<Order> => {
//     const { discountedTotal, discountAmount } = applyFlatDiscount(subtotal);
//     const totalBeforeGst = Math.max(0, discountedTotal - loyaltyPointsToRedeem);
//     const gstAmount = totalBeforeGst * 0.05;
//     const finalTotalAmount = totalBeforeGst + gstAmount;
//     const config = await apiGetLoyaltyConfig();
//     const pointsEarned = Math.floor(finalTotalAmount / config.rupeesPerPoint);
//     const internalOrderId = generateOrderId();

//     const newOrderData = {
//         id: serverOrderId,
//         brand_id: brandId,
//         user_id: userId,
//         items,
//         customer,
//         delivery_address: deliveryAddress,
//         subtotal,
//         discount_amount: discountAmount,
//         loyalty_discount: loyaltyPointsToRedeem,
//         gst_amount: gstAmount,
//         total_amount: finalTotalAmount,
//         points_earned: pointsEarned,

//         created_at: new Date().toISOString(),
//     };

//     const { error: orderError } = await supabase.from('orders').insert(newOrderData);
//     if (orderError) handleSupabaseError(orderError, 'Create Order');

//     const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', userId).single();
//     let currentPoints = (profile?.loyalty_points as any[]) || [];
//     if (pointsEarned > 0) currentPoints.push({ points: pointsEarned, earnedAt: new Date().toISOString() });
//     await supabase.from('profiles').update({ loyalty_points: currentPoints }).eq('id', userId);

//     return mapDbOrderToType(newOrderData);
// };

export const apiUpdateOrder = async (
  orderId: string,
  updates: Partial<Order>,
): Promise<Order> => {
  const dbUpdates: any = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
  if (updates.feedback !== undefined) dbUpdates.feedback = updates.feedback;
  if (updates.complaint !== undefined) dbUpdates.complaint = updates.complaint;
  if (updates.refundStatus !== undefined)
    dbUpdates.refund_status = updates.refundStatus;
  if (updates.deliveryInfo !== undefined)
    dbUpdates.delivery_info = updates.deliveryInfo;

  const { data, error } = await supabase
    .from("orders")
    .update(dbUpdates)
    .eq("id", orderId)
    .select()
    .single();
  if (error) handleSupabaseError(error, "Update Order");
  return mapDbOrderToType(data);
};

// --- Complaint & Refund API ---
export const apiRaiseComplaint = async (
  orderId: string,
  itemNames: string[],
  comments: string,
): Promise<Order> => {
  const order = await apiGetOrderById(orderId);
  if (!order) throw new Error("Order not found");

  const complaintId = `C-${orderId}-${Date.now()}`;
  const now = new Date().toISOString();

  // 1️⃣ Insert into complaints table (DB format)
  const { error: insertError } = await supabase.from("complaints").insert({
    id: complaintId,
    order_id: orderId,
    user_id: order.userId,
    item_names: itemNames,
    comments,
    status: "pending",
    created_at: now,
  });

  if (insertError) throw insertError;

  // 2️⃣ Update orders.complaint (frontend snapshot format)
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      complaint: {
        id: complaintId,
        itemNames,
        comments,
        status: "pending",
        createdAt: now,
        totalAmount: Number(order.totalAmount || 0), // ✅ ADDED
      },
      refund_status: "pending",
    })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) throw updateError;
  if (!updatedOrder) throw new Error("Order update blocked (RLS)");

  return mapDbOrderToType(updatedOrder);
};

export async function apiCancelOrder(
  orderId: string,
  amount: number,
  reason: string,
) {
  const res = await fetch(`${BASE_URL}/payment/cancel-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientorderID: orderId,
      amount,
      reason,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export const apiGetComplaints = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .not("complaint", "is", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map(mapDbOrderToType);
};
export const apiGetOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []).map(mapDbOrderToType);
};

export async function apiProcessRefundApproval(
  orderId: string,
  refundAmount: number,
  reason?: string,
) {
  const res = await fetch(`${BASE_URL}/complaints/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      refundAmount,
      reason,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Refund failed");
  }

  return res.json();
}
export const apiRejectComplaint = async (orderId: string): Promise<Order> => {
  const order = await apiGetOrderById(orderId);
  if (!order || !order.complaint) throw new Error("Invalid order");
  const updatedComplaint = {
    ...order.complaint,
    status: "rejected",
    resolvedAt: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("orders")
    .update({ complaint: updatedComplaint })
    .eq("id", orderId)
    .select()
    .single();
  if (error) handleSupabaseError(error, "Reject Complaint");
  return mapDbOrderToType(data);
};
// ─── PASTE THESE INTO apiService.ts ───────────────────────────────────────────

export async function apiGetAllLocations(page = 1, perPage = 20) {
  const res = await fetch(`${BASE_URL}/location?page=${page}&per_page=${perPage}`);
  return res.json();
}

export async function apiGetLocationById(id: string) {
  const res = await fetch(`${BASE_URL}/location/${id}`);
  return res.json();
}

export async function apiAddLocation(payload: {
  location_name: string;
  lat: number;
  long: number;
}) {
  const res = await fetch(`${BASE_URL}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function apiUpdateLocation(
  id: string,
  payload: Partial<{ location_name: string; lat: number; long: number }>
) {
  const res = await fetch(`${BASE_URL}/location/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function apiDeleteLocation(id: string) {
  const res = await fetch(`${BASE_URL}/location/${id}`, {
    method: "DELETE",
  });
  return res.json();
}
// --- Reservation API ---
export const apiGetReservationById = async (
  resId: string,
): Promise<Reservation | undefined> => {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", resId)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapDbReservation(data);
};

// Track by Phone or Booking ID - SHOW ACTIVE ONLY
export const apiTrackReservations = async (
  query: string,
): Promise<Reservation[]> => {
  const cleanQuery = query.trim();
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cleanQuery,
    );
  const todayStr = new Date().toISOString().split("T")[0];

  // Base query: Filter for non-cancelled/expired statuses AND present/future dates
  let dbQuery = supabase
    .from("reservations")
    .select("*")
    .in("status", ["confirmed", "pending"]) // Only active statuses
    .gte("date", todayStr) // Only today or future dates
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (isUUID) {
    dbQuery = dbQuery.eq("id", cleanQuery);
  } else {
    dbQuery = dbQuery.or(
      `phone.eq.${cleanQuery},booking_id.eq.${cleanQuery.toUpperCase()}`,
    );
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("Error tracking reservation:", error);
    return [];
  }

  // Secondary JS filter for exact time (don't show reservations from earlier today that are passed)
  const now = new Date();
  const activeReservations = (data || [])
    .map(mapDbReservation)
    .filter((res) => {
      const resDateTime = new Date(`${res.date}T${res.time}`);
      // Add 30 min buffer: it's still "active"/trackable if you are 30 mins late
      const expiryTime = new Date(resDateTime.getTime() + 30 * 60000);
      return now < expiryTime;
    });

  return activeReservations;
};

export const apiGetUserReservations = async (
  userId: string,
): Promise<Reservation[]> => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .gte("date", sixMonthsAgo.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) return [];
  return (data || []).map(mapDbReservation);
};

// NEW: Get all active reservations for Admin
export const apiGetAllReservations = async (): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }

  return (data || []).map(mapDbReservation);
};

const mapDbReservation = (data: any): Reservation => ({
  id: data.id,
  bookingId: data.booking_id,
  restId: data.rest_id,
  userId: data.user_id,
  tableId: data.table_id,
  tableNumber: data.table_number,
  endtime: data.end_time,
  name: data.name,
  email: data.email,
  phone: data.phone,
  date: data.date,
  time: data.time,
  guests: data.guests,
  requests: data.requests,
  createdAt: data.created_at,
  status: data.status as Reservation["status"],
});
export const apiGetAvailableTables = async (
  brandId: string,
  date: string,
  time: string,
  guests: number,
) => {
  const url = `${BASE_URL}/reservation/tables/${brandId}?date=${date}&time=${time}&guests=${guests}`;

  const res = await fetch(url);

  if (!res.ok) {
    const msg = await res.json();
    throw new Error(msg.error || "Failed to load tables");
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid table response");
  }

  return data;
};

export const apiSendReservationOTP = async (
  phone: string,
): Promise<boolean> => {
  const res = await fetch(`${BASE_URL}/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // response not JSON
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "Failed to send OTP");
  }

  return true;
};

export const apiVerifyReservationOTP = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const res = await fetch(`${BASE_URL}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "Invalid or expired OTP");
  }

  return true;
};

// apiService.ts

export async function apiGetUserAIRecommendation(
  userId: string,
  restaurantId: string,
) {
  const res = await fetch(`${BASE_URL}/ai/user-recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, restaurantId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch AI recommendation");
  }

  return res.json();
}

const generateDailyBookingId = async (dateStr: string): Promise<string> => {
  const datePart = dateStr.replace(/-/g, "");

  // Find the highest current booking_id for today
  const { data } = await supabase
    .from("reservations")
    .select("booking_id")
    .eq("date", dateStr)
    .not("booking_id", "is", null)
    // Ordering by booking_id descending gets us the latest one because of the fixed-width format
    .order("booking_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (data?.booking_id) {
    const parts = data.booking_id.split("-");
    // Expecting format B-YYYYMMDD-XX. We want the last part.
    const lastPart = parts[parts.length - 1];
    const lastNum = parseInt(lastPart, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `B-${datePart}-${nextNum.toString().padStart(2, "0")}`;
};

export const apiCreateReservation = async (
  brandId: string,
  userId: string | undefined,
  form: {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    guests: number;
    requests: string;
    tableId?: string;
    tablenumber?: string;
  },
) => {
  const payload = {
    user_id: userId || null, // ✅ match backend
    name: form.name,
    phone: form.phone.trim(),
    email: form.email || null,
    date: form.date,
    time: form.time,
    guests: form.guests,
    tableId: form.tableId,
    tablenumber: form.tablenumber, // ✅ backend expects tableId
    requests: form.requests || null,
  };

  const res = await fetch(`${BASE_URL}/reservation/${brandId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.json();
    throw new Error(msg.error || "Reservation failed");
  }

  return await res.json(); // contains booking_id from backend
};

export const apiUpdateReservation = async (
  resId: string,
  updates: Partial<Reservation>,
): Promise<Reservation> => {
  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", resId)
    .select()
    .maybeSingle();
  if (error) handleSupabaseError(error, "Update Reservation");
  return mapDbReservation(data);
};
export async function getMealRecommendation(
  resturent_identifier: string,
  preferences: string,
) {
  const res = await fetch(`${BASE_URL}/ai/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resturent_identifier,
      preferences,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to get recommendation");
  }

  const data = await res.json();
  return data; // includes brandName, menu, recommendation
}

// --- Menu & Other ---
const saveMenuToStorage = (restId: string, menu: RestaurantMenu) => {
  localStorage.setItem(`petpooja-menu-${restId}`, JSON.stringify(menu));
};

const getMenuFromStorage = (restId: string): RestaurantMenu | null => {
  const storedMenu = localStorage.getItem(`petpooja-menu-${restId}`);
  return storedMenu ? JSON.parse(storedMenu) : null;
};

export const apiGetLiveMenu = async (
  restId: string,
): Promise<RestaurantMenu | null> => {
  return getMenuFromStorage(restId);
};
export const apiUpdateMenuItemTags = async (payload: {
  resturent_identifier: string;
  item_id: string;
  cuisine_tag: string | null;
  mood_tag: string | null;
}) => {
  const res = await fetch(`${BASE_URL}/menu/item-tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};
export const apiUpdateItemAvailability = async (
  restId: string,
  itemName: string,
  isAvailable: boolean,
): Promise<boolean> => {
  const menu = await apiGetLiveMenu(restId);
  if (!menu) return false;

  const updatedMenu: RestaurantMenu = {
    ...menu,
    items: menu.items.map((item) =>
      item.itemname === itemName
        ? { ...item, active: isAvailable ? "1" : "0" }
        : item,
    ),
  };

  saveMenuToStorage(restId, updatedMenu);
  return true;
};

// export const apiGetBrandDetails = (brandId: string): BrandData | undefined => {
//     // @ts-ignore
//     return brandsData[brandId];
// };
// export const apiGetAllBrands = (): Brand[] => {
//     return Object.values(brandsData).map(b => ({ id: b.id, name: b.name, description: b.tagline, logo: b.logo, petpoojaRestId: b.petpoojaRestId }));
// };
export const apiPunchOrder = async (
  order: Order,
): Promise<{ success: boolean; message: string }> => {
  return { success: true, message: "Order processing initiated." };
};
export const apiBookDelivery = async (orderId: string): Promise<boolean> => {
  await simulateDelay(2000);
  const mockRider = {
    riderName: "Not Provided",
    riderPhone: "9999999999",
    etaMinutes: 25,
  };
  await apiUpdateOrder(orderId, { deliveryInfo: mockRider });
  return true;
};
// export const apiGetDishRecommendation = async (user: User, brandId: Brand['id']): Promise<DishRecommendation> => {
//     if (!process.env.API_KEY) throw new Error("API_KEY not set");
//     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
//     const brandName = brandsData[brandId]?.name || 'our restaurant';
//     const menu = brandsData[brandId].menu;
//     const simplifiedMenu = menu.flatMap(cat => cat.items.map(item => item.itemname)).join(', ');
//     const userOrders = await apiGetUserOrders(user.id);
//     const orderHistory = userOrders.slice(0, 5).map(order => ({
//         items: order.items.map(item => `${item.quantity}x ${item.itemname}`).join(', '),
//         rating: order.rating ? `${order.rating}/5 stars` : 'Not rated',
//         date: new Date(order.createdAt).toLocaleDateString()
//     }));
//     const prompt = `You are an expert restaurant concierge for ${brandName}. Recommend ONE dish based on this profile: Name: ${user.name}, Preferences: Likes: ${user.dietaryPreferences?.likes}, Dislikes: ${user.dietaryPreferences?.dislikes}, Allergies: ${user.dietaryPreferences?.allergies}. Recent Orders: ${JSON.stringify(orderHistory)}. Menu: ${simplifiedMenu}. Return JSON: { "dishName": "", "reason": "", "offer": "(optional if special day)" }`;
//     const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
//     return JSON.parse(response.text.trim());
// };
// --- Help Buddy Chat API ---

export interface HelpBuddyChatHistoryItem {
  role: "user" | "bot" | "model";
  parts: string;
  content?: string;
}

export interface HelpBuddyChatResponse {
  role: "model";
  parts: string;
  metadata: {
    menuContext: {
      categoriesCount: number;
      itemsCount: number;
      lastUpdated: string;
      hasError: boolean;
    };
    userId: string | null;
    model: string;
    timestamp: string;
  };
}

export interface HelpBuddyChatRequest {
  history: HelpBuddyChatHistoryItem[];
  userMessage: string;
  restaurantId?: string;
  userId?: string;
}

/**
 * Get current user ID from Supabase session
 */
const getCurrentUserId = async (): Promise<string | undefined> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch (error) {
    console.warn("Failed to get user ID:", error);
    return undefined;
  }
};

/**
 * Get restaurant ID from context (you can customize this based on your app logic)
 */
const getCurrentRestaurantId = (): string => {
  // Option 1: From localStorage
  const storedRestId = localStorage.getItem("selectedRestaurantId");
  if (storedRestId) return storedRestId;

  // Option 2: Default to Bongo Delicacy
  return "c9ignw2k50";

  // Option 3: You could also get it from URL params, Redux store, or Context
};

/**
 * Help Buddy Chat API - Send message and get AI response
 * @param history - Conversation history
 * @param userMessage - Current user message
 * @param restaurantId - Optional restaurant ID (defaults to current)
 * @param userId - Optional user ID (defaults to current user or guest)
 */
export const apiHelpBuddyChat = async (
  history: HelpBuddyChatHistoryItem[],
  userMessage: string,
  restaurantId?: string,
  userId?: string,
): Promise<HelpBuddyChatResponse> => {
  try {
    // Get restaurant ID (parameter > current context > default)
    const restId = restaurantId || getCurrentRestaurantId();

    // Get user ID (parameter > current user > undefined for guest)
    let currentUserId = userId;
    if (!currentUserId) {
      currentUserId = await getCurrentUserId();
    }

    console.log("🤖 Sending Help Buddy request:", {
      restaurantId: restId,
      userId: currentUserId || "Guest",
      messageLength: userMessage.length,
      historyLength: history.length,
    });

    // Prepare request body
    const requestBody: HelpBuddyChatRequest = {
      history: history.map((msg) => ({
        role: msg.role,
        parts: msg.parts || msg.content || "",
        content: msg.content || msg.parts || "",
      })),
      userMessage: userMessage.trim(),
      ...(currentUserId && { userId: currentUserId }),
    };

    // Make API request
    const response = await fetch(`${BASE_URL}/ai/help-buddy/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || `Request failed with status ${response.status}`;

      console.error("❌ Help Buddy API Error:", {
        status: response.status,
        message: errorMessage,
      });

      // Handle specific error codes
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again later.");
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment.");
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || "Failed to get response from Help Buddy");
    }

    console.log("✅ Help Buddy response received:", {
      responseLength: data.data.parts.length,
      categoriesCount: data.data.metadata.menuContext.categoriesCount,
      itemsCount: data.data.metadata.menuContext.itemsCount,
      hasError: data.data.metadata.menuContext.hasError,
    });

    return data.data;
  } catch (error: any) {
    console.error("❌ Help Buddy Chat Error:", error);

    // Network error
    if (error.message?.includes("fetch")) {
      throw new Error(
        "Network error. Please check your connection and try again.",
      );
    }

    // Timeout error
    if (error.message?.includes("timeout")) {
      throw new Error("Request timed out. Please try again.");
    }

    // Re-throw with original message
    throw new Error(error.message || "Failed to get response from Help Buddy");
  }
};

/**
 * Clear Help Buddy conversation history (optional utility)
 */
export const apiClearHelpBuddyHistory = (): void => {
  try {
    localStorage.removeItem("helpBuddyHistory");
    console.log("✅ Help Buddy history cleared");
  } catch (error) {
    console.warn("Failed to clear Help Buddy history:", error);
  }
};

/**
 * Save Help Buddy conversation history (optional utility)
 */
export const apiSaveHelpBuddyHistory = (messages: ChatMessage[]): void => {
  try {
    localStorage.setItem("helpBuddyHistory", JSON.stringify(messages));
    console.log("✅ Help Buddy history saved");
  } catch (error) {
    console.warn("Failed to save Help Buddy history:", error);
  }
};

/**
 * Load Help Buddy conversation history (optional utility)
 */
export const apiLoadHelpBuddyHistory = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem("helpBuddyHistory");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load Help Buddy history:", error);
  }
  return [];
};
