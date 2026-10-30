import React, { useState, useEffect, useCallback, useRef } from "react";
import bongoDelicacyLogo from "../src/assets/bongodelicacylogo.png";
import { useAuth } from "../context/AuthContext";
import HelpBuddyIcon from "./HelpBuddyIcon";
import HelpBuddyModal from "./HelpBuddyModal";
import { Icon } from "./Icon";
import { useOutlet } from "../context/OutletContext";
import { apiGetBrandsWithOutlet } from "../services/apiService";
import { IMAGE_BASE_URL, SUPABASE_URL } from "../src/config";
import { useCart } from "../context/CartContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onSelectBrand: (petpoojaOutletId: string, resturentId: string, outletId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toUTCDate(raw: string): Date {
  const s = raw.trim();
  if (s.endsWith("Z") || s.includes("+")) return new Date(s);
  return new Date(s.replace(" ", "T") + "Z");
}

function isStillClosedUntil(outlet_open_date_time: string | null | undefined): boolean {
  if (!outlet_open_date_time) return false;
  return Date.now() < toUTCDate(outlet_open_date_time).getTime();
}

function formatISTTime(outlet_open_date_time: string): string {
  return toUTCDate(outlet_open_date_time).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatHourString(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return t;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

function formatOutletHours(open_time?: string | null, close_time?: string | null): string | null {
  const open = formatHourString(open_time);
  const close = formatHourString(close_time);
  if (!open || !close) return null;
  return `${open} – ${close}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RestaurantCardSkeleton: React.FC = () => (
  <div className="group relative h-[350px] rounded-2xl overflow-hidden shadow-2xl">
    <div className="absolute inset-0 bg-gray-800 animate-pulse" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
    <div className="absolute inset-0 p-6 flex flex-col justify-end">
      <div className="space-y-3">
        <div className="h-12 w-32 rounded bg-white/10 animate-pulse" />
        <div className="h-6 w-44 rounded bg-white/10 animate-pulse" />
        <div className="h-1 w-16 rounded bg-cyan-500/50" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
      </div>
    </div>
  </div>
);

const HamburgerIcon: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <button
    onClick={onClick}
    className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-gray-800 transition-colors"
    aria-label="Toggle menu"
  >
    <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-300 origin-center ${open ? "rotate-45 translate-y-2" : ""}`} />
    <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`} />
    <span className={`block h-0.5 w-5 bg-gray-300 transition-all duration-300 origin-center ${open ? "-rotate-45 -translate-y-2" : ""}`} />
  </button>
);

const ClosedBadge: React.FC<{ outlet_open_date_time?: string | null; label?: string }> = ({ outlet_open_date_time, label }) => {
  const opensAt =
    outlet_open_date_time && isStillClosedUntil(outlet_open_date_time)
      ? formatISTTime(outlet_open_date_time)
      : null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-[2px] rounded-2xl">
      <span className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg mb-2">
        {label || "Closed"}
      </span>
      {opensAt && (
        <span className="text-gray-300 text-xs">
          Opens at <span className="text-cyan-400 font-semibold">{opensAt}</span>
        </span>
      )}
    </div>
  );
};

// ─── Location Search Bar ──────────────────────────────────────────────────────

const LocationSearchBar: React.FC<{
  locationName: string | null;
  onLocationChange: (coords: { lat: number; lng: number }, name: string) => void;
}> = ({ locationName, onLocationChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (locationName) setInputValue(locationName);
  }, [locationName]);

  useEffect(() => {
    const tryInit = () => {
      if (!inputRef.current || !(window as any).google?.maps?.places || autocompleteRef.current) return;
      const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry", "address_components"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.formatted_address || "";
        setInputValue(name);
        onLocationChange({ lat, lng }, name);
      });
      autocompleteRef.current = ac;
    };
    if ((window as any).google?.maps?.places) {
      tryInit();
    } else {
      const poll = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(poll); tryInit(); }
      }, 300);
      return () => clearInterval(poll);
    }
  }, [onLocationChange]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported by your browser."); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setInputValue(name);
          onLocationChange({ lat, lng }, name);
        } catch {
          setInputValue(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          onLocationChange({ lat, lng }, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => { setIsLocating(false); alert("Unable to retrieve your location. Please allow location access."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-md">
      <div className="relative flex-1">
        <Icon type="map-pin" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search a location..."
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors placeholder-gray-500"
        />
      </div>
      <button
        onClick={handleUseCurrentLocation}
        disabled={isLocating}
        title="Use my current location"
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors shadow-md"
      >
        {isLocating ? (
          <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
          </svg>
        )}
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
// NOTE: The Food Finder quiz (cuisine/party/mood/allergy questions) has been
// removed for now. This renders the brands grid directly — i.e. the same
// screen that previously only appeared after picking "Not sure" in the quiz.

const LandingPage: React.FC<LandingPageProps> = ({ onSelectBrand }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [isHelpBuddyOpen, setIsHelpBuddyOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { setOutletLocation } = useOutlet();
  const { switchRestaurant } = useCart();

  // ── Location ──────────────────────────────────────────────────────────────
  const selectedAddress = currentUser?.addresses?.find((a: any) => a.isDefault) || currentUser?.addresses?.[0];
  const selectedLat = selectedAddress?.coordinates?.lat;
  const selectedLng = selectedAddress?.coordinates?.lng;

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationPending, setLocationPending] = useState(true);
  const locationResolved = useRef(false);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── Brands ────────────────────────────────────────────────────────────────
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [outletsError, setOutletsError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const [, setTick] = useState(0);

  // ── Nav helper ────────────────────────────────────────────────────────────
  const handleNavigate = (hash: string) => {
    setIsDrawerOpen(false);
    window.location.hash = hash;
  };

  // ── Location effects ──────────────────────────────────────────────────────
  useEffect(() => { locationRef.current = location; }, [location]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsDrawerOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!location) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
      .then((r) => r.json())
      .then((d) => setLocationName(d.display_name || null))
      .catch(() => setLocationName(null));
  }, [location]);

  useEffect(() => {
    if (isAuthenticated && selectedLat && selectedLng) {
      setLocation({ lat: selectedLat, lng: selectedLng });
      setLocationPending(false);
      return;
    }
    if (!navigator.geolocation) { setLocationPending(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationPending(false); },
      () => { setLocationPending(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isAuthenticated, selectedLat, selectedLng]);

  // ── Brand loading ─────────────────────────────────────────────────────────
  const loadOutlets = useCallback(async (coords: { lat: number; lng: number } | null) => {
    locationResolved.current = true;
    setOutletsError(null);
    setIsLoadingOutlets(true);
    try {
      const data = await apiGetBrandsWithOutlet(coords ?? undefined);
      const result = data?.data;
      setBrands(Array.isArray(result) ? result : []);
    } catch (e: any) {
      setOutletsError(e?.message || "Failed to load brands");
      setBrands([]);
    } finally {
      hasFetched.current = true;
      setIsLoadingOutlets(false);
    }
  }, []);

  useEffect(() => {
    if (locationPending || locationResolved.current) return;
    loadOutlets(location);
  }, [locationPending, location, loadOutlets]);

  useEffect(() => {
    const refresh = () => { locationResolved.current = false; loadOutlets(locationRef.current); };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisibility); };
  }, [loadOutlets]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── Location bar change ───────────────────────────────────────────────────
  const handleLocationChange = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      setLocation(coords);
      setLocationName(name);
      locationResolved.current = false;
      loadOutlets(coords);
    },
    [loadOutlets]
  );

  // Only serve outlets when the resolved location is within Bangalore/Bengaluru.
  const isInBangalore = !!locationName && /bengaluru|bangalore/i.test(locationName);

  // ── Brand selection ───────────────────────────────────────────────────────
  const selectBrand = useCallback((brand: any) => {
    if (brand.is_closed || !isInBangalore || !brand.selected_outlet) return false;
    const outlet = brand.selected_outlet;
    setOutletLocation({
      lat: outlet.lat,
      lng: outlet.long,
      contact: outlet.contact ?? "",
      address: outlet.address ?? "",
      city: outlet.city ?? "Bangalore",
      brandName: outlet.brand_name ?? "",
    });
    switchRestaurant(outlet.outlet_id);
    localStorage.setItem("selectedPetpoojaOutletId", outlet.petpooja_outlet_id);
    localStorage.setItem("selectedRestaurantId", outlet.resturent_id);
    localStorage.setItem("SelectedOuletId", outlet.outlet_id);
    onSelectBrand(outlet.petpooja_outlet_id, outlet.resturent_id, outlet.outlet_id);
    return true;
  }, [onSelectBrand, setOutletLocation, switchRestaurant, isInBangalore]);

  const showSkeleton = locationPending || isLoadingOutlets || !hasFetched.current;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">

          <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => window.location.reload()}>
            <img src={bongoDelicacyLogo} alt="Bongo Delicacy Logo" className="h-12 sm:h-16 lg:h-20 w-auto" />
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-cyan-500 leading-none">Bongo</h1>
              <span className="text-sm sm:text-base font-light text-gray-300 tracking-widest">DELICACY</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 justify-center">
            <LocationSearchBar locationName={locationName} onLocationChange={handleLocationChange} />
          </div>

          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <button onClick={() => handleNavigate("#terms")} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-semibold">Privacy Policy</button>
            <button onClick={() => handleNavigate("#refund")} className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-semibold">Refund Policy</button>
            <button onClick={() => handleNavigate("#tracking")} className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors">
              <Icon type="calendar" className="w-5 h-5" />
              <span className="text-sm font-semibold">Track Reservation</span>
            </button>
            {isAuthenticated ? (
              <button onClick={() => handleNavigate("#account")} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-full font-semibold transition-all shadow-md hover:shadow-cyan-500/20">
                <Icon type="user" className="w-5 h-5" />
                <span>{currentUser?.name?.split(" ")[0] || "My"}&apos;s Account</span>
              </button>
            ) : (
              <button onClick={() => handleNavigate("#login")} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-full font-semibold transition-all shadow-md hover:shadow-cyan-500/20">
                <Icon type="user" className="w-5 h-5" />
                Login
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => handleNavigate("#account")} className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold transition-all">
                <Icon type="user" className="w-4 h-4" />
                Account
              </button>
            ) : (
              <button onClick={() => handleNavigate("#login")} className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold transition-all">
                <Icon type="user" className="w-4 h-4" />
                Login
              </button>
            )}
            <HamburgerIcon open={isDrawerOpen} onClick={() => setIsDrawerOpen((p) => !p)} />
          </div>
        </div>

        {/* Mobile Drawer */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isDrawerOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
          <div className="border-t border-gray-800 bg-gray-900/98 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1.5 px-1">Deliver to</p>
              <LocationSearchBar
                locationName={locationName}
                onLocationChange={(coords, name) => { handleLocationChange(coords, name); setIsDrawerOpen(false); }}
              />
            </div>
            <div className="h-px bg-gray-800 my-1" />
            <button onClick={() => handleNavigate("#tracking")} className="flex items-center gap-3 w-full text-left text-gray-300 hover:text-cyan-400 hover:bg-gray-800 px-3 py-3 rounded-lg transition-colors text-sm font-semibold">
              <Icon type="calendar" className="w-5 h-5 shrink-0 text-cyan-500" />
              Track Reservation
            </button>
            <div className="h-px bg-gray-800 my-1" />
            <button onClick={() => handleNavigate("#terms")} className="flex items-center gap-3 w-full text-left text-gray-300 hover:text-cyan-400 hover:bg-gray-800 px-3 py-3 rounded-lg transition-colors text-sm font-semibold">
              <span className="w-5 h-5 flex items-center justify-center text-base shrink-0">🔒</span>
              Privacy Policy
            </button>
            <button onClick={() => handleNavigate("#refund")} className="flex items-center gap-3 w-full text-left text-gray-300 hover:text-cyan-400 hover:bg-gray-800 px-3 py-3 rounded-lg transition-colors text-sm font-semibold">
              <span className="w-5 h-5 flex items-center justify-center text-base shrink-0">↩️</span>
              Refund Policy
            </button>
            <div className="h-px bg-gray-800 my-1" />
            <button onClick={() => { setIsDrawerOpen(false); window.open("#admin-login", "_blank"); }} className="flex items-center gap-3 w-full text-left text-gray-500 hover:text-gray-300 hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors text-xs">
              Admin Login
            </button>
          </div>
        </div>
      </nav>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* ── HERO ── */}
      <header className="relative h-[60vh] flex items-center justify-center overflow-hidden mt-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1593560704563-f176a2eb61db?q=80&w=2070&auto=format&fit=crop"
            alt="Bengali Spices"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6">
            Experience the <span className="text-cyan-500">Essence</span> of Bengal
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
            A curated collective of authentic culinary brands, bringing the soul of Kolkata to your plate.
          </p>
        </div>
      </header>

      {/* ── BRANDS GRID (shown directly, quiz removed for now) ── */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-24 relative z-20">
        {!showSkeleton && !isInBangalore && (
          <div className="mb-8 text-center text-sm text-amber-300 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
            We currently deliver only within Bangalore. Detected location:{" "}
            <span className="font-semibold">{locationName || "outside service area"}</span>.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {showSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
          ) : outletsError ? (
            <div className="col-span-full text-center text-red-400 py-10">{outletsError}</div>
          ) : brands.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-10">No brands found.</div>
          ) : (
            brands.map((brand) => {
              const disabled = brand.is_closed || !isInBangalore;
              const outlet = brand.selected_outlet;
              const hours = formatOutletHours(outlet?.open_time, outlet?.close_time);

              const hero = brand.hero_image
                ? `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${brand.hero_image}`
                : "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?q=80&w=2070";

              const logo = brand.logo
                ? `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${brand.logo}`
                : null;

              return (
                <div
                  key={brand.id}
                  onClick={() => selectBrand(brand)}
                  className={[
                    "group relative h-[320px] rounded-2xl overflow-hidden transition-all duration-500 shadow-xl transform",
                    disabled
                      ? "cursor-not-allowed opacity-75 grayscale"
                      : "cursor-pointer hover:-translate-y-2 hover:shadow-2xl",
                  ].join(" ")}
                >
                  <div className="absolute inset-0">
                    <img
                      src={hero}
                      alt={brand.brand_name}
                      className={`w-full h-full object-cover transition-transform duration-700 ${!disabled ? "group-hover:scale-110" : ""}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
                  </div>

                  {disabled && (
                    <ClosedBadge
                      outlet_open_date_time={isInBangalore ? brand.outlet_open_date_time : null}
                      label={!isInBangalore ? "Not available in your area" : "Closed"}
                    />
                  )}

                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div className={`transform transition-transform duration-500 ${!disabled ? "translate-y-2 group-hover:translate-y-0" : ""}`}>
                      {logo && (
                        <img
                          src={logo}
                          alt={`${brand.brand_name} logo`}
                          className="h-10 w-auto mb-3 bg-white/10 rounded px-2 py-1"
                        />
                      )}
                      <h3 className="text-2xl font-serif font-bold text-white mb-2">{brand.brand_name}</h3>
                      {outlet?.city && <p className="text-xs text-gray-400 mt-1">{outlet.city}</p>}
                      {hours && (
                        <p className="text-xs text-cyan-400/80 mt-0.5 flex items-center gap-1">
                          <Icon type="clock" className="w-3 h-3" />
                          {hours}
                        </p>
                      )}
                      {!disabled && (
                        <>
                          <div className="h-1 w-16 bg-cyan-500 mb-3 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                          <p className="text-gray-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75 line-clamp-3">
                            {brand.tagline || brand.description}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 py-12 text-center text-gray-500">
        <p>© {new Date().getFullYear()} Bongo Delicacy Group. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6">
          <button onClick={() => handleNavigate("#terms")} className="text-xs hover:text-gray-300 transition-colors">Privacy Policy</button>
          <button onClick={() => handleNavigate("#refund")} className="text-xs hover:text-gray-300 transition-colors">Refund Policy</button>
          <button onClick={() => window.open("#admin-login", "_blank")} className="text-xs hover:text-gray-300 transition-colors">Admin Login</button>
        </div>
      </footer>

      <HelpBuddyIcon onClick={() => setIsHelpBuddyOpen(true)} />
      <HelpBuddyModal isOpen={isHelpBuddyOpen} onClose={() => setIsHelpBuddyOpen(false)} />

    </div>
  );
};

export default LandingPage;