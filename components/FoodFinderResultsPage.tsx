import React, { useState, useEffect, useCallback, useMemo } from "react";
import bongoDelicacyLogo from "../src/assets/bongodelicacylogo.png";
import { Icon } from "./Icon";
import { useCart } from "../context/CartContext";
import { useOutlet } from "../context/OutletContext";
import CartModal from "./CartModal";

// ─── Types ────────────────────────────────────────────────────────────────

interface QuizFilters {
  cuisine_tag: string | null; // e.g. "pure_veg", "authentic_bengali"
  mood_tag: string | null;    // e.g. "light", "spicy"
  allergies: string[];        // e.g. ["gluten", "dairy"]
}

interface ResultsPageProps {
  filters: QuizFilters;
  onBack: () => void;
}

const PER_PAGE = 5;

const CUISINE_TAG_LABELS: Record<string, string> = {
  pure_veg: "Pure Veg",
  authentic_bengali: "Authentic Bengali",
  indo_chinese: "Indo-Chinese",
  biryani: "Biryani",
};

const MOOD_TAG_LABELS: Record<string, string> = {
  light: "Light",
  spicy: "Spicy",
  comfort: "Comfort",
  special: "Special",
};

const ALLERGY_LABELS: Record<string, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  nuts: "Nuts",
  eggs: "Eggs",
  shellfish: "Shellfish",
  soy: "Soy",
};

// ─── API call ───────────────────────────────────────────────────────────────

async function fetchQuizResults(filters: QuizFilters, page: number) {
  const res = await fetch(`http://localhost:3000/api/menu/quiz-results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cuisine_tag: filters.cuisine_tag,
      mood_tag: filters.mood_tag,
      allergies: filters.allergies,
      page,
      per_page: PER_PAGE,
    }),
  });
  if (!res.ok) throw new Error("Failed to load results");
  return res.json();
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

const ItemSkeleton: React.FC = () => (
  <div className="bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="w-full h-44 bg-gray-700" />
    <div className="p-4 space-y-2">
      <div className="h-4 w-2/3 bg-gray-700 rounded" />
      <div className="h-3 w-1/3 bg-gray-700 rounded" />
      <div className="h-3 w-full bg-gray-700 rounded" />
    </div>
  </div>
);

// ─── Filter chip ──────────────────────────────────────────────────────────

const FilterChip: React.FC<{ label: string; icon?: string }> = ({ label, icon }) => (
  <span className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">
    {icon && <span>{icon}</span>}
    {label}
  </span>
);

// ─── Floating cart icon (same pattern as BrandPage's CartIcon) ────────────

const FloatingCartIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
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
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 transition-transform ${shake ? "cart-shake" : ""}`}
        style={{ backgroundColor: "var(--primary-color)", color: "var(--text-on-primary-color)" }}
        aria-label={`View cart with ${itemCount} items`}
      >
        <Icon type="shopping-cart" className="w-8 h-8" />
        <span
          className="absolute -top-1 -right-1 text-gray-900 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2"
          style={{ backgroundColor: "var(--accent-color)", borderColor: "var(--primary-color)" }}
        >
          {itemCount}
        </span>
      </button>
    </>
  );
};

// ─── Main component ──────────────────────────────────────────────────────

const FoodFinderResultsPage: React.FC<ResultsPageProps> = ({ filters, onBack }) => {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Track the name of the outlet currently "owning" the cart, purely for
  // display in CartModal's header — CartContext only stores the id.
  const [cartOutletName, setCartOutletName] = useState<string>("");

  const { addItem, switchRestaurant, restaurantId, itemCount } = useCart();
  const { setOutletLocation } = useOutlet();

  const currentCartOutletId = itemCount > 0 ? restaurantId : null;

  // ── Initial + filter-change load ──
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPage(1);
    fetchQuizResults(filters, 1)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        setItems(data?.result || []);
        setHasMore(!!data?.has_more);
        setTotalCount(data?.count || 0);
      })
      .catch((e) => !cancelled && setError(e.message || "Failed to load results"))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [filters.cuisine_tag, filters.mood_tag, filters.allergies.join(",")]);

  // ── "Show 5 more" ──
  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchQuizResults(filters, nextPage);
      const data = res?.data;
      setItems((prev) => [...prev, ...(data?.result || [])]);
      setHasMore(!!data?.has_more);
      setPage(nextPage);
    } catch (e: any) {
      setError(e.message || "Failed to load more");
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, page]);

  // ── Group items by outlet, preserving first-seen order ──
  const groupedByOutlet = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, { brand_name: string; outlet_name: string; outlet_city: string; outlet_address: string; items: any[] }>();

    for (const item of items) {
      const key = item.outlet_id || "unknown";
      if (!groups.has(key)) {
        order.push(key);
        groups.set(key, {
          brand_name: item.brand_name || item.outlet_name || "Restaurant",
          outlet_name: item.outlet_name || "Restaurant",
          outlet_city: item.outlet_city || "",
          outlet_address: item.outlet_address || "",
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }

    return order.map((key) => ({ outlet_id: key, ...groups.get(key)! }));
  }, [items]);

  // ── Direct add-to-cart (no addon modal, no navigation — stays on this
  //    page; opens the cart right here instead of going to BrandPage) ──
  const handleAddToCart = (item: any) => {
    const basePrice = Number(item.price || 0);
    const gstPercentage = Array.isArray(item.tax_breakup)
      ? item.tax_breakup.reduce((sum: number, t: any) => sum + Number(t.tax_percentage || 0), 0)
      : 0;
    const gstAmount = (basePrice * gstPercentage) / 100;

    const cartKey = `${item.itemid}__no-variation__no-addons`;

    const cartItem = {
      ...item,
      cartKey,
      quantity: 1,
      variation_id: "",
      variation_name: "",
      selected_addons: [],
      unit_price: basePrice + gstAmount,
      base_price: basePrice,
      addon_price: 0,
    };

    setOutletLocation({
      lat: item.lat,
      lng: item.long,
      contact: item.contact ?? "",
      address: item.address ?? item.outlet_address ?? "",
      city: item.outlet_city ?? "",
      brandName: item.brand_name ?? item.outlet_name ?? "",
    });
    switchRestaurant(item.outlet_id);
    localStorage.setItem("selectedPetpoojaOutletId", item.petpooja_outlet_id);
    localStorage.setItem("selectedRestaurantId", item.resturent_id);
    localStorage.setItem("SelectedOuletId", item.outlet_id);
    setCartOutletName(item.brand_name || item.outlet_name || "Restaurant");

    addItem(cartItem);
    setAddedKeys((prev) => new Set(prev).add(cartKey));
    setTimeout(() => {
      setAddedKeys((prev) => {
        const next = new Set(prev);
        next.delete(cartKey);
        return next;
      });
    }, 1500);
  };

  // ── Filter summary chips ──
  const chips: { label: string; icon: string }[] = [];
  if (filters.cuisine_tag) chips.push({ label: CUISINE_TAG_LABELS[filters.cuisine_tag] || filters.cuisine_tag, icon: "🍽️" });
  if (filters.mood_tag) chips.push({ label: MOOD_TAG_LABELS[filters.mood_tag] || filters.mood_tag, icon: "✨" });
  filters.allergies.forEach((a) => chips.push({ label: `No ${ALLERGY_LABELS[a] || a}`, icon: "⚠️" }));

  // CartModal's buttons ("Proceed", "Pay ₹X") are styled with var(--primary-color)
  // and var(--text-on-primary-color) — those are only ever defined by BrandPage
  // normally. Since this page shows dishes from multiple outlets (no single
  // brand theme to inherit), define sensible defaults here so those buttons
  // don't render colorless when the cart is opened from this page.
  const defaultThemeStyle = {
    "--primary-color": "#06b6d4",       // cyan-500, matches this page's accents
    "--accent-color": "#f59e0b",        // amber-400
    "--text-on-primary-color": "#111827", // gray-900
  } as React.CSSProperties;

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white" style={defaultThemeStyle}>

      {/* ── NAVBAR (matches LandingPage) ── */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={bongoDelicacyLogo} alt="Bongo Delicacy Logo" className="h-10 sm:h-12 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-serif font-bold text-cyan-500 leading-none">Bongo</h1>
              <span className="text-xs font-light text-gray-300 tracking-widest">DELICACY</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors text-sm font-semibold"
          >
            <Icon type="arrow-left" className="w-4 h-4" />
            Back to quiz
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="relative pt-32 pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1593560704563-f176a2eb61db?q=80&w=2070&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900 to-gray-900" />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold tracking-widest text-cyan-500 uppercase mb-3">Your Matches</p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
            Dishes picked for <span className="text-cyan-500">you</span>
          </h2>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {chips.map((c, i) => <FilterChip key={i} label={c.label} icon={c.icon} />)}
            </div>
          )}
          {totalCount > 0 && !isLoading && (
            <p className="text-sm text-gray-500 mt-4">{totalCount} dishes found across open outlets</p>
          )}
        </div>
      </header>

      {/* ── Cross-outlet notice (only shown if it's actually blocking something) ── */}
      {currentCartOutletId && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-6">
          <div className="max-w-2xl mx-auto flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm">
            <span>🛒</span>
            <p className="text-gray-300">
              Your cart already has items from another outlet. Dishes from a different restaurant are
              disabled below — clear your cart first to order from somewhere new.
            </p>
          </div>
        </div>
      )}

      {/* ── RESULTS, GROUPED BY OUTLET ── */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {error ? (
          <div className="text-center text-red-400 py-16">{error}</div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 5 }).map((_, i) => <ItemSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            No dishes match your preferences right now.
            <br />
            <button onClick={onBack} className="mt-4 text-cyan-400 hover:underline">
              Try different answers
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-12">
              {groupedByOutlet.map((group) => {
                const groupBlocked = !!currentCartOutletId && currentCartOutletId !== group.outlet_id;

                return (
                  <section key={group.outlet_id}>
                    {/* ── Outlet header: brand name + location ── */}
                    <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-gray-800">
                      <div>
                        <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                          {group.brand_name}
                          {groupBlocked && (
                            <span className="text-xs font-sans font-normal bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                              Different outlet
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                          <Icon type="map-pin" className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          {group.outlet_address || group.outlet_city || "Location unavailable"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                        {group.items.length} {group.items.length === 1 ? "dish" : "dishes"}
                      </span>
                    </div>

                    {/* ── This outlet's dishes ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.items.map((item, idx) => {
                        const image = item.item_image_url
                          ? item.item_image_url
                          : "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=2070";
                        const price = Number(item.price || 0);
                        const cartKey = `${item.itemid}__no-variation__no-addons`;
                        const justAdded = addedKeys.has(cartKey);

                        return (
                          <div
                            key={`${item.outlet_id}-${item.itemid}-${idx}`}
                            className={[
                              "bg-gray-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300",
                              groupBlocked ? "opacity-50 grayscale" : "hover:shadow-2xl hover:-translate-y-1",
                            ].join(" ")}
                          >
                            <div className="relative">
                              <img src={image} alt={item.itemname} className="w-full h-44 object-cover" />
                            </div>
                            <div className="p-4">
                              <h4 className="text-white font-semibold font-serif text-lg">{item.itemname}</h4>
                              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.itemdescription}</p>
                              <div className="flex items-center justify-between mt-4">
                                <span className="text-cyan-400 font-bold text-lg">₹{price}</span>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  disabled={groupBlocked}
                                  className={[
                                    "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                                    groupBlocked
                                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                      : justAdded
                                        ? "bg-green-500 text-gray-900"
                                        : "bg-cyan-500 hover:bg-cyan-400 text-gray-900",
                                  ].join(" ")}
                                >
                                  {groupBlocked ? "Unavailable" : justAdded ? "Added ✓" : "Add to Cart"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-3 rounded-full border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-gray-900 font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading..." : "Show 5 more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Cart icon + modal — stays on THIS page, like BrandPage does ── */}
      <FloatingCartIcon onClick={() => setIsCartOpen(true)} />
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        brandId={restaurantId || ""}
        restaurantName={cartOutletName || "Restaurant"}
      />
    </div>
  );
};

export default FoodFinderResultsPage;