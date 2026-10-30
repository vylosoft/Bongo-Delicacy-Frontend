import React, { useState, useEffect, useRef, useMemo } from "react";
import { MenuCategory, CartItem, RestaurantTable } from "../types";
import { Icon } from "./Icon";
import { useCart } from "../context/CartContext";
import CartModal from "./CartModal";
import { useAuth } from "../context/AuthContext";

import {
  apiCreateReservation,
  apiGetAvailableTables,
  apiSendReservationOTP,
  apiVerifyReservationOTP,
  apiGetMenu,
  apiGetCategories,
  getMealRecommendation,
  apiGetRestaurantById,
} from "../services/apiService";
import { ItemData } from "@/model/menu_list";
import AddonModal, { EnrichedItemData } from "./AddonModal";
import { IMAGE_BASE_URL, SUPABASE_URL } from "../src/config";
import { MOOD_KEYWORDS } from "./FoodFinderModal";

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildCartKey = (item: any) => {
  const variationPart = item.selectedVariation?.variationid ?? "no-variation";
  const addonsArray = item.selectedAddons
    ? Object.values(item.selectedAddons).flat()
    : [];
  const addonPart =
    addonsArray.length > 0
      ? addonsArray
          .map((a: any) => `${a.id}:${a.quantity}`)
          .sort()
          .join("|")
      : "no-addons";
  return `${item.itemid}__${variationPart}__${addonPart}`;
};

// Common allergen → keyword map used to filter menu items by name/description.
// Keys match the allergy option keys produced by FoodFinderModal.
const ALLERGY_KEYWORDS: Record<string, string[]> = {
  nuts: ["nut", "nuts", "cashew", "peanut", "almond", "pistachio", "walnut"],
  dairy: ["dairy", "milk", "cheese", "butter", "cream", "paneer", "ghee", "yogurt", "curd"],
  gluten: ["gluten", "wheat", "flour", "maida", "bread", "naan", "roti", "paratha"],
  egg: ["egg", "eggs", "omelette", "omelet"],
  shellfish: ["shellfish", "prawn", "shrimp", "crab", "lobster", "oyster"],
};

const ALLERGY_LABELS: Record<string, string> = {
  nuts: "Nuts",
  dairy: "Dairy",
  gluten: "Gluten",
  egg: "Egg",
  shellfish: "Shellfish",
};

// ─── Shimmer / Spinner ───────────────────────────────────────────────────────

const ShimmerCard: React.FC = () => (
  <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-gray-700" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-700 rounded w-1/2" />
      <div className="h-4 bg-gray-700 rounded w-full" />
      <div className="h-10 bg-gray-700 rounded" />
    </div>
  </div>
);

const CategoryShimmer: React.FC = () => (
  <div className="flex justify-center flex-wrap gap-2 mb-10 animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-9 w-24 bg-gray-700 rounded-md" />
    ))}
  </div>
);

const Spinner: React.FC<{ className?: string }> = ({
  className = "h-5 w-5",
}) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// ─── Chef Recommender Modal ──────────────────────────────────────────────────

const ChefRecommenderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
}> = ({ isOpen, onClose, restaurantId, restaurantName }) => {
  const [preferences, setPreferences] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGetRecommendation = async () => {
    if (!preferences.trim()) {
      setError("Please tell us what you are in the mood for!");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await getMealRecommendation(restaurantId, preferences);
      setRecommendation(result.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setPreferences("");
      setRecommendation("");
      setError("");
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Chef's Recommendation</h3>
          <button onClick={onClose}>
            <Icon type="x" className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          Tell me what you're craving, and I'll suggest the perfect dish from{" "}
          {restaurantName}.
        </p>
        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="e.g., 'something spicy and vegetarian'"
          className="mt-4 w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-[var(--primary-color)] focus:outline-none"
          rows={3}
        />
        <button
          onClick={handleGetRecommendation}
          disabled={isLoading}
          style={{
            backgroundColor: "var(--primary-color)",
            color: "var(--text-on-primary-color)",
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 hover:opacity-90"
        >
          {isLoading ? <Spinner /> : <Icon type="star" className="w-5 h-5" />}{" "}
          Ask the Chef
        </button>
        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        {recommendation && (
          <div className="mt-4 p-4 bg-gray-700 rounded-md border border-[var(--primary-color)]/50">
            <p className="text-white">{recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Cart Icon ───────────────────────────────────────────────────────────────

const CartIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { itemCount } = useCart();
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (itemCount === 0) return;
    setShake(true);
    const timer = setTimeout(() => setShake(false), 600);
    return () => clearTimeout(timer);
  }, [itemCount]);

  if (itemCount === 0) return null;

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          15%       { transform: rotate(-15deg); }
          30%       { transform: rotate(15deg); }
          45%       { transform: rotate(-10deg); }
          60%       { transform: rotate(10deg); }
          75%       { transform: rotate(-5deg); }
          90%       { transform: rotate(5deg); }
        }
        .cart-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
      <button
        onClick={onClick}
        className={`fixed bottom-6 right-6 bg-[var(--primary-color)] text-[var(--text-on-primary-color)] w-16 h-16 rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 transition-transform ${shake ? "cart-shake" : ""}`}
        aria-label={`View cart with ${itemCount} items`}
      >
        <Icon type="shopping-cart" className="w-8 h-8" />
        <span className="absolute -top-1 -right-1 bg-[var(--accent-color)] text-gray-900 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-[var(--primary-color)]">
          {itemCount}
        </span>
      </button>
    </>
  );
};

// ─── Table Map ───────────────────────────────────────────────────────────────

const TableMap: React.FC<{
  tables: RestaurantTable[];
  selectedTableId: string | undefined;
  onSelect: (id: string) => void;
}> = ({ tables, selectedTableId, onSelect }) => {
  if (tables.length === 0)
    return (
      <div className="text-center p-6 bg-gray-700/50 rounded-md border border-dashed border-gray-600 text-gray-400">
        No tables found. Please try another time.
      </div>
    );
  return (
    <>
      <div className="flex gap-4 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-600 inline-block" /> Too Small
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
        {tables.map((table) => {
          const isAvailable = table._status === "available";
          const isBooked    = table._status === "booked";
          const isTooSmall  = table._status === "too_small";
          const isSelected  = selectedTableId === table.id && isAvailable;
          return (
            <button
              key={table.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelect(table.id)}
              className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all relative
                ${isBooked   ? "opacity-60 cursor-not-allowed border-red-500 bg-red-900/20"       : ""}
                ${isTooSmall ? "opacity-60 cursor-not-allowed border-yellow-700 bg-yellow-900/10" : ""}
                ${isSelected ? "border-green-500 bg-green-900/20 scale-105 shadow-lg"             : ""}
                ${isAvailable && !isSelected ? "border-gray-600 bg-gray-800 hover:border-green-500 hover:bg-gray-700" : ""}
              `}
            >
              <span
                className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
                  isBooked   ? "bg-red-500"            :
                  isTooSmall ? "bg-yellow-600"         :
                  isSelected ? "bg-[var(--accent-color)]" :
                               "bg-green-500"
                }`}
              />
              <Icon
                type="users"
                className={`w-8 h-8 mb-2 ${
                  isBooked   ? "text-red-400"              :
                  isTooSmall ? "text-yellow-600"           :
                  isSelected ? "text-[var(--accent-color)]" :
                               "text-green-400"
                }`}
              />
              <span className="font-semibold text-white text-sm">{table.name}</span>
              <span className="text-xs text-gray-400">{table.capacity} Seats</span>
              {isBooked   && <span className="mt-1 text-xs text-red-400 font-semibold">Booked</span>}
              {isTooSmall && <span className="mt-1 text-xs text-yellow-500 font-semibold">Too Small</span>}
              {isSelected && <span className="mt-1 text-xs text-[var(--accent-color)] font-semibold">Selected ✓</span>}
            </button>
          );
        })}
      </div>
    </>
  );
};

// ─── Mobile Drawer ───────────────────────────────────────────────────────────

const MobileDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}> = ({ open, onClose, onNavigate }) => {
  if (!open) return null;
  const items = ["home", "about", "menu", "contact"];
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-72 bg-gray-900 border-l border-gray-800 p-6 animate-slide-in">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onClose}>
            <Icon type="x" className="w-6 h-6 text-white" />
          </button>
        </div>
        <ul className="space-y-5">
          {items.map((item) => (
            <li key={item}>
              <button
                onClick={() => { onNavigate(item); onClose(); }}
                className="capitalize text-gray-300 hover:text-[var(--accent-color)] text-lg"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ─── Turn-on countdown display ───────────────────────────────────────────────

const TurnOnDisplay: React.FC<{ turnOnTime: string; currentTime: number }> = ({
  turnOnTime,
  currentTime,
}) => {
  const turnOnDate = new Date(turnOnTime); // UTC from DB
  const now        = new Date(currentTime);

  const turnOnDateIST = turnOnDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const todayIST      = now.toLocaleDateString("en-IN",        { timeZone: "Asia/Kolkata" });
  const tomorrow      = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIST   = tomorrow.toLocaleDateString("en-IN",   { timeZone: "Asia/Kolkata" });

  const isToday    = turnOnDateIST === todayIST;
  const isTomorrow = turnOnDateIST === tomorrowIST;

  const formattedTime = turnOnDate.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour:     "numeric",
    minute:   "2-digit",
    hour12:   true,
  });

  let formattedText = "";

  if (isToday) {
    formattedText = formattedTime;
  } else if (isTomorrow) {
    formattedText = `Tomorrow, ${formattedTime}`;
  } else {
    formattedText = turnOnDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day:      "numeric",
      month:    "short",
      hour:     "numeric",
      minute:   "2-digit",
      hour12:   true,
    });
  }

  return (
    <p className="text-white text-sm mt-3 leading-relaxed">
      Next available at
      <br />
      <span className="font-semibold text-yellow-300">{formattedText}</span>
    </p>
  );
};

// ─── BrandPage ───────────────────────────────────────────────────────────────

interface BrandPageProps {
  onBack: () => void;
}

const BrandPage: React.FC<BrandPageProps> = ({ onBack }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const id       = localStorage.getItem("selectedRestaurantId")    || "";
  const restId   = localStorage.getItem("selectedPetpoojaOutletId") || "";
  const outletid = localStorage.getItem("SelectedOuletId")          || "";

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const [restaurant,           setRestaurant]           = useState<any>(null);
  const [restaurantLoading,    setRestaurantLoading]    = useState(true);
  const [restaurantError,      setRestaurantError]      = useState<string>("");
  const [maxCapacity,          setMaxCapacity]          = useState<number>(8);
  const [menuData,             setMenuData]             = useState<MenuCategory[]>([]);
  const [activeCategory,       setActiveCategory]       = useState<string>("");
  const [isRecommenderOpen,    setIsRecommenderOpen]    = useState(false);
  const [isCartOpen,           setIsCartOpen]           = useState(false);
  const [addonItem,            setAddonItem]            = useState<EnrichedItemData | ItemData | null>(null);
  const [isAddonModalOpen,     setIsAddonModalOpen]     = useState(false);
  const [searchQuery,          setSearchQuery]          = useState("");
  const [categories,           setCategories]           = useState<any[]>([]);
  const [isMenuChanging,       setIsMenuChanging]       = useState(false);
  const [isInitialMenuLoading, setIsInitialMenuLoading] = useState(true);

  // ── Food Finder preferences carried over from the landing page quiz ──────
  const [activeAllergies, setActiveAllergies] = useState<string[]>([]);
  const [activeMood,      setActiveMood]      = useState<string>("");

  useEffect(() => {
    try {
      const storedAllergies = localStorage.getItem("foodFinderAllergies");
      setActiveAllergies(storedAllergies ? JSON.parse(storedAllergies) : []);
      setActiveMood(localStorage.getItem("foodFinderMood") || "");
    } catch {
      setActiveAllergies([]);
      setActiveMood("");
    }
  }, []);

  const clearAllergyFilter = () => {
    setActiveAllergies([]);
    try { localStorage.setItem("foodFinderAllergies", JSON.stringify([])); } catch {}
  };

  const clearMoodFilter = () => {
    setActiveMood("");
    try { localStorage.setItem("foodFinderMood", ""); } catch {}
  };

  /* ── Tick every second for countdown display ── */
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { addItem, switchRestaurant } = useCart();
  const { currentUser } = useAuth();

  // ── Scroll to hash on load ──
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  useEffect(() => {
    if (id) switchRestaurant(id);
  }, [restId]);

  const [resStep, setResStep] = useState<1 | 2 | 3 | 4>(1);
  const [resForm, setResForm] = useState({
    name: "", email: "", phone: "", date: "",
    time: "", end_time: "", guests: 2, requests: "", tableId: "",
  });

  useEffect(() => {
    if (!currentUser) return;
    setResForm((prev) => ({
      ...prev,
      name:  prev.name  || currentUser?.name  || "",
      phone: prev.phone || currentUser?.phone || "",
    }));
  }, [currentUser]);

  const toLocalISOString = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];

  const loadInitialCapacity = async () => {
    if (!outletid) return;
    try {
      const tables = await apiGetAvailableTables(outletid, toLocalISOString(new Date()), "11:00", 1);
      const highest = Math.max(...tables.map((t) => Number(t.capacity || 0)), 0);
      setMaxCapacity(Math.max(highest, 1));
    } catch {
      setMaxCapacity(8);
    }
  };

  useEffect(() => { loadInitialCapacity(); }, [outletid]);

  const [availableTables,  setAvailableTables]  = useState<RestaurantTable[]>([]);
  const [isLoadingTables,  setIsLoadingTables]  = useState(false);
  const [otp,              setOtp]              = useState("");
  const [otpSent,          setOtpSent]          = useState(false);
  const [resError,         setResError]         = useState("");
  const [lastReservationId,setLastReservationId]= useState<string | null>(null);
  const [isBooking,        setIsBooking]        = useState(false);

  useEffect(() => {
    if (!id) {
      setRestaurantError("Restaurant not selected. Please go back and choose a restaurant.");
      setRestaurant(null);
      setRestaurantLoading(false);
      return;
    }
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    setRestaurantLoading(true);
    setRestaurantError("");
    try {
      const r = await apiGetRestaurantById(outletid);
      setRestaurant(r.data);
    } catch (e: any) {
      setRestaurantError(e?.message || "Failed to load restaurant");
      setRestaurant(null);
    } finally {
      setRestaurantLoading(false);
    }
  };

  // ── Initial menu load ──
  useEffect(() => {
    const loadMenu = async () => {
      if (!restId) return;
      setIsInitialMenuLoading(true);
      try {
        const cats = await apiGetCategories(restId);
        setCategories(cats || []);
        if (cats?.length > 0) {
          setActiveCategory(cats[0].id);
          const items = await apiGetMenu(restId, cats[0].id);
          setMenuData([{ category: cats[0].name, category_id: cats[0].id, items }]);
        } else {
          setMenuData([]);
        }
      } catch (e) {
        console.error(e);
        setMenuData([]);
      } finally {
        setIsInitialMenuLoading(false);
      }
    };
    loadMenu();
  }, [restId]);

  /* ─────────────────────────────────────────────────────────────────────────
     SMART MENU REFRESH
     - Normal polling: every 5 seconds
     - When any out-of-stock item has turn_on_time within 30s → poll every 1s
       so the item "auto-opens" nearly instantly when its time comes
  ───────────────────────────────────────────────────────────────────────── */

  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!restId || !activeCategory) return;

    const refreshMenu = async () => {
      try {
        const currentCat = categories.find((c) => c.id === activeCategory);
        const items      = await apiGetMenu(restId, activeCategory);
        setMenuData([{
          category:    currentCat?.name || "Menu",
          category_id: activeCategory,
          items,
        }]);
        return items;
      } catch (err) {
        console.error("[MenuRefresh]", err);
        return null;
      }
    };

    const getNextInterval = (items: any[] | null): number => {
      if (!items) return 5000;
      const now = Date.now();
      const hasImminent = items.some((item) => {
        if (!item.turn_on_time || String(item.in_stock) !== "0") return false;
        const diff = new Date(item.turn_on_time).getTime() - now;
        return diff > 0 && diff <= 30_000; // within 30 seconds
      });
      return hasImminent ? 1000 : 5000;
    };

    let cancelled = false;

    const scheduleNext = async () => {
      if (cancelled) return;
      const items    = await refreshMenu();
      const interval = getNextInterval(items);
      if (!cancelled) {
        intervalRef.current = setTimeout(scheduleNext, interval);
      }
    };

    // Kick off
    intervalRef.current = setTimeout(scheduleNext, 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [restId, activeCategory]);

  const handleCategoryChange = async (cat: any) => {
    setActiveCategory(cat.id);
    setIsMenuChanging(true);
    try {
      const items = await apiGetMenu(restId, cat.id);
      setMenuData([{ category: cat.name, category_id: cat.id, items }]);
    } finally {
      setIsMenuChanging(false);
    }
  };

  // ── Search filter (existing) ──
  const searchFilteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return menuData;
    const q = searchQuery.toLowerCase();
    return menuData
      .map((cat: any) => ({
        ...cat,
        items: cat.items.filter(
          (i: any) =>
            (i.itemname        || "").toLowerCase().includes(q) ||
            (i.itemdescription || "").toLowerCase().includes(q),
        ),
      }))
      .filter((cat: any) => cat.items.length > 0);
  }, [searchQuery, menuData]);

  // ── Allergy filter: drop items whose name/description match any active allergen keyword ──
  const itemMatchesAllergy = (item: any, allergyKey: string) => {
    const keywords = ALLERGY_KEYWORDS[allergyKey] || [];
    const haystack = `${item.itemname || ""} ${item.itemdescription || ""}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  };

  const allergyFilteredMenu = useMemo(() => {
    if (activeAllergies.length === 0) return searchFilteredMenu;
    return searchFilteredMenu
      .map((cat: any) => ({
        ...cat,
        items: cat.items.filter(
          (item: any) => !activeAllergies.some((a) => itemMatchesAllergy(item, a))
        ),
      }))
      .filter((cat: any) => cat.items.length > 0);
  }, [searchFilteredMenu, activeAllergies]);

  // ── Mood soft-sort: move keyword-matching items to the front of each category, flagged for highlight ──
  const itemMatchesMood = (item: any, mood: string) => {
    const keywords = MOOD_KEYWORDS[mood] || [];
    if (keywords.length === 0) return false;
    const haystack = `${item.itemname || ""} ${item.itemdescription || ""}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  };

  const filteredMenu = useMemo(() => {
    if (!activeMood) return allergyFilteredMenu;
    return allergyFilteredMenu.map((cat: any) => {
      const flagged = cat.items.map((item: any) => ({
        ...item,
        _moodMatch: itemMatchesMood(item, activeMood),
      }));
      const sorted = [...flagged].sort(
        (a: any, b: any) => Number(b._moodMatch) - Number(a._moodMatch)
      );
      return { ...cat, items: sorted };
    });
  }, [allergyFilteredMenu, activeMood]);

  const handleAddToCart = (item: any) => {
    const cartKey   = buildCartKey(item);
    const flatAddons = item.selectedAddons ? Object.values(item.selectedAddons).flat() : [];
    const cartItem: CartItem = {
      itemid:           item.itemid,
      itemname:         item.itemname,
      itemdescription:  item.itemdescription,
      item_image_url:   item.item_image_url,
      ...item,
      cartKey,
      quantity:         1,
      variation_id:     item.selectedVariation?.variationid || "",
      variation_name:   item.selectedVariation?.name        || "",
      selected_addons:  flatAddons,
      unit_price:       item.computed?.final_price ?? Number(item.price || 0),
      base_price:       item.computed?.base_price  ?? Number(item.price || 0),
      addon_price:      item.computed?.addon_price ?? 0,
    };
    addItem(cartItem);
  };

  const today      = new Date();
  const minDateStr = toLocalISOString(today);
  const maxDate    = new Date();
  maxDate.setDate(today.getDate() + 14);
  const maxDateStr = toLocalISOString(maxDate);

  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!resForm.date) { setAvailableTimeSlots([]); return; }
    const now     = new Date();
    const isToday = resForm.date === toLocalISOString(now);
    const slots: string[] = [];
    for (let hour = 11; hour <= 22; hour++) {
      if (isToday && hour <= now.getHours()) continue;
      slots.push(`${String(hour).padStart(2, "0")}:00`);
    }
    setAvailableTimeSlots(slots);
    setResForm((prev) => ({ ...prev, time: "" }));
  }, [resForm.date]);

  const handleResFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setResForm((prev) => ({
      ...prev,
      [name]: name === "guests" ? parseInt(value) : value,
    }));
  };

  const fetchTables = async () => {
    if (!resForm.date || !resForm.time) {
      setResError("Please select date and time first.");
      return;
    }
    setIsLoadingTables(true);
    setResError("");
    setResForm((prev) => ({ ...prev, tableId: "" }));
    try {
      const tables  = await apiGetAvailableTables(outletid, resForm.date, resForm.time, resForm.guests);
      setAvailableTables(tables);
      const highest = Math.max(...tables.map((t: any) => Number(t.capacity || 0)), 0);
      setMaxCapacity(highest || 1);
      setResStep(2);
    } catch (err: unknown) {
      setResError(err instanceof Error ? err.message : "Could not load tables.");
    } finally {
      setIsLoadingTables(false);
    }
  };

  const formatIndianPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.startsWith("0") && cleaned.length === 11) return `+91${cleaned.slice(1)}`;
    return `+${cleaned}`;
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResError("");
    if (!resForm.name || !resForm.phone) {
      setResError("Name and Phone are required.");
      return;
    }
    try {
      const success = await apiSendReservationOTP(formatIndianPhone(resForm.phone));
      if (!success) { setResError("Failed to send OTP."); return; }
      setOtpSent(true);
    } catch (err: any) {
      setResError(err?.message || "Failed to send OTP.");
    }
  };

  const confirmBooking = async () => {
    if (isBooking) return;
    setIsBooking(true);
    setResError("");
    try {
      const success = await apiVerifyReservationOTP(formatIndianPhone(resForm.phone), otp);
      if (!success) { setResError("Invalid or expired OTP."); return; }
      const reservation = await apiCreateReservation(outletid, currentUser?.id, {
        ...resForm, brand_id: restId, outlet_id: outletid,
      });
      setLastReservationId(reservation.bookingId);
      setResStep(4);
    } catch (err: any) {
      const message = err?.message || "Booking failed.";
      if (message.toLowerCase().includes("expired")) {
        setResError("OTP expired. Please request a new one.");
        setOtp("");
        setOtpSent(false);
        return;
      }
      setResError(message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleScrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ─── Theme / derived values ───────────────────────────────────────────────

  const logoURL  = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${restaurant?.logo}`;
  const aboutURL = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${restaurant?.about_image}`;
  const heroURL  = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${restaurant?.hero_image}`;

  const themePrimary = restaurant?.theme_primary         || "#ff0000";
  const themeAccent  = restaurant?.theme_accent          || "#e5f502";
  const themeText    = restaurant?.theme_text_on_primary || "#ffffff";

  if (restaurant) {
    localStorage.setItem("themePrimary", themePrimary);
    localStorage.setItem("themeAccent",  themeAccent);
    localStorage.setItem("themeText",    themeText);
  }

  const restaurantName    = restaurant?.name    || "Restaurant";
  const restaurantTagline = restaurant?.tagline || restaurantName;
  const heroImage  = heroURL  || "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=2070&auto=format&fit=crop";
  const aboutImage = aboutURL || heroImage;
  const aboutText  = restaurant?.about_text || restaurant?.description || "";
  const logo       = logoURL  || "https://placehold.co/160x60?text=Logo";

  const contactInfo = {
    locations: [
      { title: "Takeaway & Delivery", address: "L S Enclave, 1st Floor, Horamavu Main Road, 2nd Cross, Bangalore - 560045" },
      { title: "Dine In",             address: "Amigo's Avenue, Ground Floor, 15, New Temple Road, Nallurhalli Main Road, Whitefield, Bangalore - 560066" },
    ],
    phone: "9611774424",
    email: "contact@bongodelicacy.com",
  };

  const brandThemeStyle = {
    "--primary-color":       themePrimary,
    "--accent-color":        themeAccent,
    "--text-on-primary-color": themeText,
  } as React.CSSProperties;

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (restaurantLoading) {
    return (
      <div className="bg-gray-900 min-h-screen" style={brandThemeStyle}>
        <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-[var(--accent-color)]">
              <Icon type="arrow-left" className="w-5 h-5" />
              <span className="hidden sm:inline">All Brands</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-gray-700 animate-pulse rounded" />
              <div className="h-6 w-40 bg-gray-700 animate-pulse rounded hidden sm:block" />
            </div>
            <div className="hidden md:flex space-x-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-16 bg-gray-700 animate-pulse rounded" />
              ))}
            </div>
          </nav>
        </header>
        <section className="h-screen flex items-center justify-center">
          <div className="container mx-auto px-4">
            <div className="h-16 w-2/3 bg-gray-700 animate-pulse rounded mx-auto" />
            <div className="h-10 w-40 bg-gray-700 animate-pulse rounded mx-auto mt-8" />
          </div>
        </section>
      </div>
    );
  }

  if (restaurantError) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-center p-6" style={brandThemeStyle}>
        <div>
          <p className="text-red-400 font-semibold">{restaurantError}</p>
          <button onClick={onBack} className="mt-4 text-cyan-400 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-900" style={brandThemeStyle}>
      {/* ── Header ── */}
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-[var(--accent-color)]">
            <Icon type="arrow-left" className="w-5 h-5" />
            <span className="hidden sm:inline">All Brands</span>
          </button>

          <div className="flex items-center gap-4">
            <img src={logo} alt={`${restaurantName} logo`} className="h-8 object-contain" />
            <h1 className="text-2xl font-bold font-serif text-white hidden sm:block">{restaurantName}</h1>
          </div>

          <ul className="hidden md:flex space-x-6 text-gray-300">
            {["home", "about", "menu", "contact"].map((item) => (
              <li key={item}>
                <button
                  onClick={() => handleScrollTo(item)}
                  className="capitalize hover:text-[var(--accent-color)] transition-colors bg-transparent border-none cursor-pointer p-0"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>

          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon type="menu" className="w-7 h-7" />
          </button>
        </nav>
      </header>

      <MobileDrawer
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={(id) => {
          if (id === "terms & Condition") {
            window.open(`${window.location.origin}#terms`, "_blank");
          } else if (id === "refund policies") {
            window.open(`${window.location.origin}#refund`, "_blank");
          } else {
            handleScrollTo(id);
          }
        }}
      />

      <main>
        {/* ── Hero ── */}
        <section
          id="home"
          className="h-screen bg-cover bg-center flex items-center justify-center"
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${heroImage}')` }}
        >
          <div className="text-center text-white p-4 animate-fade-in-slow">
            <h2 className="text-5xl md:text-7xl font-serif">{restaurantTagline}</h2>
            <button
              onClick={() => handleScrollTo("menu")}
              style={{ backgroundColor: "var(--primary-color)", color: "var(--text-on-primary-color)" }}
              className="mt-8 inline-block font-bold py-3 px-8 rounded-md hover:opacity-90 transition-opacity"
            >
              Explore Menu
            </button>
          </div>
        </section>

        {/* ── About ── */}
        <section id="about" className="py-20 bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <img src={aboutImage} alt="Restaurant Interior" className="rounded-lg shadow-2xl" />
            </div>
            <div className="animate-fade-in">
              <h3 className="text-4xl font-serif text-white">Our Story</h3>
              <p className="mt-4 text-gray-400">{aboutText}</p>
            </div>
          </div>
        </section>

        {/* ── Menu ── */}
        <section id="menu" className="py-20 bg-gray-800">
          <div className="container mx-auto px-4">
            <h3 className="text-4xl font-serif text-white text-center mb-12">Our Menu</h3>

            <div className="max-w-lg mx-auto mb-6 relative">
              <Icon type="search" className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full bg-gray-700 text-white pl-10 p-3 rounded-full border border-gray-600 focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
              />
            </div>

            {/* Active Food Finder filter pills */}
            {(activeAllergies.length > 0 || activeMood) && (
              <div className="max-w-lg mx-auto mb-10 flex flex-wrap items-center justify-center gap-2">
                {activeAllergies.length > 0 && (
                  <span className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-xs px-3 py-1.5 rounded-full">
                    Filtered out: {activeAllergies.map((a) => ALLERGY_LABELS[a] || a).join(", ")}
                    <button onClick={clearAllergyFilter} className="hover:text-white" aria-label="Clear allergy filter">
                      <Icon type="x" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {/* {activeMood && (
                  <span className="flex items-center gap-2 bg-cyan-900/30 border border-cyan-700/50 text-cyan-200 text-xs px-3 py-1.5 rounded-full">
                    {activeMood} picks highlighted
                    <button onClick={clearMoodFilter} className="hover:text-white" aria-label="Clear mood filter">
                      <Icon type="x" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )} */}
              </div>
            )}

            {categories.length === 0 ? (
              <CategoryShimmer />
            ) : (
              <div className="flex justify-center flex-wrap gap-2 mb-10">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-4 py-2 rounded-md font-semibold transition-all ${
                      activeCategory === cat.id
                        ? "text-[var(--text-on-primary-color)]"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                    style={activeCategory === cat.id ? { backgroundColor: "var(--primary-color)" } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {isInitialMenuLoading || isMenuChanging ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ShimmerCard /><ShimmerCard /><ShimmerCard />
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                No dishes match your current filters.
                {activeAllergies.length > 0 && (
                  <button onClick={clearAllergyFilter} className="block mx-auto mt-2 text-cyan-400 hover:underline">
                    Clear allergy filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-12">
                {filteredMenu.map((category: any) => (
                  <div key={category.category_id}>
                    <h4 className="text-2xl text-white font-serif mb-6">{category.category}</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {category.items.map((item: any) => {

                        /* ─────────────────────────────────────────
                           AVAILABILITY CHECK — pure UTC comparison.
                           DB stores turn_on_time WITHOUT timezone
                           suffix (e.g. "2026-05-21 16:26:00"), so
                           we append "Z" to force UTC parsing.
                           currentTime ticks every second via state.
                        ───────────────────────────────────────── */

                        const now = new Date(currentTime);

                        const turnOnTime = item.turn_on_time
                          ? new Date(item.turn_on_time + "Z")
                          : null;

                        // Item is auto-available if no turn_on_time
                        // OR if turn_on_time has already passed
                        const autoAvailable =
                          !turnOnTime || now >= turnOnTime;

                        const isAvailable =
                          String(item.active) === "1" &&
                          autoAvailable;

                        return (
                          <div
                            key={item.itemid}
                            className={[
                              "bg-gray-900 rounded-lg shadow-lg overflow-hidden flex flex-col relative",
                              item._moodMatch ? "ring-2 ring-[var(--accent-color)]" : "",
                            ].join(" ")}
                          >
                            {item._moodMatch && (
                              <span
                                className="absolute top-2 left-2 z-10 text-xs font-bold px-2 py-1 rounded-full shadow"
                                style={{ backgroundColor: "var(--accent-color)", color: "#111" }}
                              >
                                {activeMood} pick
                              </span>
                            )}
                            <div className="relative">
                              <img
                                src={item.item_image_url}
                                className="w-full h-48 object-cover"
                                alt={item.itemname}
                              />
                              {!isAvailable && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center px-4">
                                  <span className="bg-red-600 px-3 py-1 text-white rounded-md font-semibold">
                                    Out of Stock
                                  </span>

                                  {item.turn_on_time && (() => {
                                    /* DB stores time WITHOUT tz suffix
                                       e.g. "2026-05-20 09:10:56.974647"
                                       Append "Z" to parse as UTC */
                                    const turnOnDate = new Date(item.turn_on_time + "Z");
                                    const now        = new Date();

                                    const turnOnDateIST = turnOnDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
                                    const todayIST      = now.toLocaleDateString("en-IN",         { timeZone: "Asia/Kolkata" });
                                    const tomorrow      = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const tomorrowIST   = tomorrow.toLocaleDateString("en-IN",    { timeZone: "Asia/Kolkata" });

                                    const isToday    = turnOnDateIST === todayIST;
                                    const isTomorrow = turnOnDateIST === tomorrowIST;

                                    const formattedTime = turnOnDate.toLocaleTimeString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                      hour:     "numeric",
                                      minute:   "2-digit",
                                      hour12:   true,
                                    });

                                    let formattedText = "";
                                    if (isToday) {
                                      formattedText = formattedTime;
                                    } else if (isTomorrow) {
                                      formattedText = `Tomorrow, ${formattedTime}`;
                                    } else {
                                      formattedText = turnOnDate.toLocaleString("en-IN", {
                                        timeZone: "Asia/Kolkata",
                                        day:      "numeric",
                                        month:    "short",
                                        hour:     "numeric",
                                        minute:   "2-digit",
                                        hour12:   true,
                                      });
                                    }

                                    return (
                                      <p className="text-white text-sm mt-3 leading-relaxed">
                                        Next available at
                                        <br />
                                        <span className="font-semibold text-yellow-300">
                                          {formattedText}
                                        </span>
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            <div className="p-4 flex flex-col flex-grow">
                              <div className="flex justify-between items-start">
                                <h4 className="text-xl text-white flex-1">{item.itemname}</h4>
                                {(() => {
                                  const hasVariation    = Array.isArray(item.variation) && item.variation.length > 0;
                                  const variationPrices = hasVariation
                                    ? item.variation.map((v: any) => Number(v.price)).filter((p: number) => p > 0)
                                    : [];
                                  const minVariationPrice = variationPrices.length > 0 ? Math.min(...variationPrices) : null;
                                  const displayPrice      = Number(item.price) > 0 ? Number(item.price) : minVariationPrice;
                                  return (
                                    <p className="text-lg font-bold text-[var(--accent-color)]">
                                      {displayPrice !== null
                                        ? hasVariation && Number(item.price) === 0
                                          ? `From ₹${displayPrice}`
                                          : `₹${displayPrice}`
                                        : "Customisable"}
                                    </p>
                                  );
                                })()}
                              </div>

                              <p className="text-gray-400 text-sm mt-2 flex-grow">{item.itemdescription}</p>

                              <button
                                onClick={() => {
                                  const hasVariations = Array.isArray(item.variation) && item.variation.length > 0;
                                  const hasAddons     = Array.isArray(item.addons)    && item.addons.length    > 0;
                                  if (hasVariations || hasAddons) {
                                    setAddonItem(item);
                                    setIsAddonModalOpen(true);
                                  } else {
                                    const basePrice      = Number(item.price || 0);
                                    const gstPercentage  = Array.isArray(item.tax_breakup)
                                      ? item.tax_breakup.reduce((sum: number, t: any) => sum + Number(t.tax_percentage || 0), 0)
                                      : 0;
                                    const gstAmount = (basePrice * gstPercentage) / 100;
                                    handleAddToCart({
                                      ...item,
                                      selectedVariation: null,
                                      selectedAddons:    {},
                                      computed: {
                                        base_price:     basePrice,
                                        addon_price:    0,
                                        taxable_amount: basePrice,
                                        gst_percentage: gstPercentage,
                                        gst_amount:     gstAmount,
                                        final_price:    basePrice + gstAmount,
                                      },
                                    });
                                  }
                                }}
                                disabled={!isAvailable}
                                className="mt-4 w-full py-2 rounded-md border-2 font-semibold transition-all text-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary-color)] hover:text-white"
                                style={{ borderColor: "var(--primary-color)" }}
                              >
                                {isAvailable ? "Add to Cart" : "Unavailable"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Contact / Reservation ── */}
        <section id="contact" className="py-20 bg-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 animate-fade-in">
              <h3 className="text-4xl font-serif text-white">Make a Reservation</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="animate-fade-in bg-gray-900 p-6 rounded-lg border border-gray-700">
                {resError && (
                  <p className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-md text-sm">{resError}</p>
                )}

                {resStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <h4 className="text-xl font-semibold text-white mb-4">Step 1: Booking Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Date</label>
                        <input
                          ref={dateInputRef}
                          type="date"
                          name="date"
                          min={minDateStr}
                          max={maxDateStr}
                          required
                          value={resForm.date}
                          onKeyDown={(e) => e.preventDefault()}
                          onPaste={(e) => e.preventDefault()}
                          onFocus={() => (dateInputRef.current as any)?.showPicker?.()}
                          onClick={() => (dateInputRef.current as any)?.showPicker?.()}
                          onChange={handleResFormChange}
                          className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 text-white cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Guests</label>
                        <select
                          name="guests"
                          value={resForm.guests}
                          onChange={handleResFormChange}
                          onKeyDown={(e) => { e.preventDefault(); e.currentTarget.blur(); }}
                          onPaste={(e) => e.preventDefault()}
                          className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 text-white cursor-pointer"
                        >
                          {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} Guests</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Time Slot</label>
                      <select
                        name="time"
                        required
                        value={resForm.time}
                        onChange={handleResFormChange}
                        className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 text-white focus:ring-2 focus:ring-[var(--primary-color)]"
                      >
                        <option value="">Select Time</option>
                        {availableTimeSlots.map((slot) => {
                          const hour    = Number(slot.split(":")[0]);
                          const endSlot = `${String(hour + 2).padStart(2, "0")}:00`;
                          return <option key={slot} value={slot}>{slot} – {endSlot}</option>;
                        })}
                      </select>
                    </div>

                    {resForm.time && resForm.date && (
                      <div className="p-3 bg-gray-700/50 rounded-md border border-gray-600 text-sm text-gray-300">
                        📅{" "}
                        {new Date(resForm.date).toLocaleDateString("en-IN", {
                          weekday: "long", day: "numeric", month: "long",
                        })}{" "}
                        · 🕐 {resForm.time} –{" "}
                        {String(Number(resForm.time.split(":")[0]) + 2).padStart(2, "0")}:00
                        · 👥 {resForm.guests} Guests
                      </div>
                    )}

                    <button
                      onClick={fetchTables}
                      disabled={isLoadingTables || !resForm.date || !resForm.time}
                      className="w-full font-bold py-3 px-4 rounded-md transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "var(--primary-color)", color: "var(--text-on-primary-color)" }}
                    >
                      {isLoadingTables ? <Spinner /> : "Find Available Tables →"}
                    </button>
                  </div>
                )}

                {resStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-semibold text-white">Step 2: Select a Table</h4>
                      <button onClick={() => setResStep(1)} className="text-sm text-gray-400 hover:text-white">
                        Change Details
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      Found {availableTables.length} tables for {resForm.guests} guests at {resForm.time}.
                    </p>
                    <TableMap
                      tables={availableTables}
                      selectedTableId={resForm.tableId}
                      onSelect={(id) => setResForm((prev) => ({ ...prev, tableId: id }))}
                    />
                    <button
                      onClick={() => setResStep(3)}
                      disabled={!resForm.tableId}
                      className="w-full font-bold py-3 px-4 rounded-md transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                      style={{ backgroundColor: "var(--primary-color)", color: "var(--text-on-primary-color)" }}
                    >
                      Continue to Contact
                    </button>
                  </div>
                )}

                {resStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-semibold text-white">Step 3: Confirm Details</h4>
                      <button onClick={() => setResStep(2)} className="text-sm text-gray-400 hover:text-white">
                        Change Table
                      </button>
                    </div>
                    <form
                      onSubmit={otpSent ? (e) => { e.preventDefault(); confirmBooking(); } : sendOtp}
                      className="space-y-4"
                    >
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        required
                        value={resForm.name}
                        disabled={otpSent}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[A-Za-z\s]*$/.test(value))
                            setResForm((prev) => ({ ...prev, name: value }));
                        }}
                        className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 text-white"
                      />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number"
                        required
                        maxLength={10}
                        value={resForm.phone}
                        disabled={otpSent}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setResForm((prev) => ({ ...prev, phone: value }));
                        }}
                        className="w-full bg-gray-700 p-3 rounded-md border border-gray-600 text-white"
                      />
                      {!otpSent ? (
                        <button
                          type="submit"
                          className="w-full font-bold py-3 px-4 rounded-md transition-opacity"
                          style={{ backgroundColor: "var(--primary-color)", color: "var(--text-on-primary-color)" }}
                        >
                          Send Verification OTP
                        </button>
                      ) : (
                        <div className="animate-fade-in space-y-4">
                          <input
                            type="text"
                            placeholder="Enter OTP"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md border border-[var(--accent-color)] text-white text-center tracking-widest font-bold"
                          />
                          <button
                            type="submit"
                            disabled={isBooking}
                            className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-md transition-opacity bg-green-600 text-white hover:bg-green-500 disabled:bg-gray-500"
                          >
                            {isBooking ? <Spinner className="text-white" /> : "Verify & Book"}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {resStep === 4 && (
                  <div className="animate-fade-in text-center py-8 space-y-4">
                    <Icon type="check-circle" className="w-16 h-16 text-green-400 mx-auto" />
                    <h4 className="text-2xl font-bold text-white">Booking Confirmed!</h4>
                    <p className="text-gray-300">We look forward to seeing you.</p>
                    <div className="bg-gray-800 p-4 rounded-md inline-block text-left mt-4">
                      <p className="text-sm text-gray-400">
                        Booking ID:{" "}
                        <span className="text-cyan-400 font-mono">{lastReservationId}</span>
                      </p>
                      <p className="text-sm text-gray-400">
                        Date:{" "}
                        <span className="text-white">{new Date(resForm.date).toLocaleDateString()}</span>{" "}
                        at{" "}
                        <span className="text-white">{resForm.time} {resForm.end_time}</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      Please arrive on time. Bookings are held for 20 minutes.
                    </p>
                    <button
                      onClick={() => {
                        setResStep(1);
                        setResForm((prev) => ({ ...prev, date: "", time: "", tableId: "" }));
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="text-cyan-400 hover:underline mt-4 block mx-auto"
                    >
                      Make another booking
                    </button>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-6 text-gray-300 animate-fade-in">
                <div>
                  <h4 className="text-2xl font-serif text-white mb-4">Contact Us</h4>
                  <div className="space-y-4">
                    {contactInfo.locations.map((loc, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Icon type="map-pin" className="w-5 h-5 text-[var(--accent-color)] mt-1 shrink-0" />
                        <div>
                          <p className="font-semibold text-white text-sm">{loc.title}</p>
                          <p className="text-gray-400 text-sm">{loc.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="flex items-center gap-3 mt-4 hover:text-[var(--accent-color)] transition-colors"
                  >
                    <Icon type="phone" className="w-5 h-5 text-[var(--accent-color)] shrink-0" />
                    <span>{contactInfo.phone}</span>
                  </a>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center gap-3 mt-3 hover:text-[var(--accent-color)] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 7l10 7 10-7" />
                    </svg>
                    <span>{contactInfo.email}</span>
                  </a>
                </div>
                <div>
                  <button
                    onClick={() => setIsRecommenderOpen(true)}
                    className="w-full flex items-center justify-center gap-3 bg-gray-700 p-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    <Icon type="chef-hat" className="w-6 h-6 text-[var(--accent-color)]" />
                    <div>
                      <p className="font-semibold text-white">Feeling Indecisive?</p>
                      <p className="text-sm text-gray-400">Get an AI-powered recommendation!</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>© {new Date().getFullYear()} {restaurantName}. Part of Bongo Delicacy Group.</p>
        </div>
      </footer>

      {/* ── Modals ── */}
      <ChefRecommenderModal
        isOpen={isRecommenderOpen}
        onClose={() => setIsRecommenderOpen(false)}
        restaurantId={restId}
        restaurantName={restaurantName}
      />
      <CartIcon onClick={() => setIsCartOpen(true)} />
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        brandId={restId}
        restaurantName={restaurantName}
      />
      {isAddonModalOpen && addonItem && (
        <AddonModal
          item={addonItem as ItemData}
          onClose={() => { setIsAddonModalOpen(false); setAddonItem(null); }}
          onConfirm={(finalItem: EnrichedItemData) => {
            handleAddToCart(finalItem);
            setIsAddonModalOpen(false);
            setAddonItem(null);
          }}
        />
      )}
    </div>
  );
};

export default BrandPage;