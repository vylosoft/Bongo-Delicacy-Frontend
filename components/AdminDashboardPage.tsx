import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "./Icon";
import { LoyaltyConfig, Order, Reservation } from "../types";
import {
  apiGetLoyaltyConfig,
  apiSetLoyaltyConfig,
  apiGetLiveMenu,
  apiUpdateItemAvailability,
  apiGetComplaints,
  apiProcessRefundApproval,
  apiRejectComplaint,
  apiUpdateReservation,
  apiGetAdminCategoriesMenu,
  apiGetOrders,
  apiCancelOrder,
  apiFetchRestaurantMapping,
  apiAddRestaurant,
  apiAddTable,
  apiGetTables,
  apiToggleTable,
  apiUploadRestaurantImage,
  apiGetRestaurantById,
  apiGetOutlet,
  apiGetAllRestaurant,
  apiUpdateTable,
  apiGetAllReservations,
  apiDeleteTable,
  apiAddBrandOutlet,      // ✅ ADD
  apiRemoveBrandOutlet,
  apiGetAllLocations,
  apiAddLocation,
  apiUpdateLocation,
  apiDeleteLocation,
  apiGetAllBrands,
  apiGetBrandById,
  apiUpdateBrand,
  apiGetOutletsByBrand,
  apiGetDeliveryPoints,
  apiUploadDeliveryPoints,
  apiGetMenuWebhookLogs,
  apiGetDeliveryCharges,
  apiAddDeliveryCharge,
  apiDeleteDeliveryCharge,
  apiUpdateDeliveryCharge,
  apiGetAllDiscounts,
  apiUpdateDiscount,
  apiAddDiscount,
  apiDeleteDiscount,
  apiUpdateMenuItemTags,

} from "../services/apiService";
import {
  BASE_URL,
  IMAGE_BASE_URL,
  RESTURENT_BUCKET_NAME,
  SUPABASE_URL,
} from "../src/config";
import { supabase } from "../services/supabaseClient";
import OutletTimingsModal from "./OutletTimingsModal";

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
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "menu"
    | "orders"
    | "loyalty"
    | "complaints"
    | "reservations"
    | "restaurants"
    | "addRestaurant"
    | "Outlet"
    | "location"
    | "deliveryPoints"
    | "deliveryCharges"
    | "webhookLogs"
    | "discount"
  >("menu");
  const [selectedWebhookLog, setSelectedWebhookLog] = useState<any | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deliveryCharges, setDeliveryCharges] = useState<any[]>([]);
  const [fromKm, setFromKm] = useState("");
  const [toKm, setToKm] = useState("");
  const [chargePrice, setChargePrice] = useState("");
  const [loadingCharges, setLoadingCharges] = useState(false);
  // Menu State
  const [menu, setMenu] = useState<any[] | null>(null);
  const [tagModalItem, setTagModalItem] = useState<any | null>(null);
  const [cuisineTag, setCuisineTag] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  // 1. Add state
  const [deliveryFailureOrder, setDeliveryFailureOrder] = useState<any | null>(null);
  const CUISINE_TAG_OPTIONS = [
    { value: "", label: "— None —" },
    { value: "pure_veg", label: "Pure Veg" },
    { value: "authentic_bengali", label: "Authentic Bengali" },
    { value: "indo_chinese", label: "Indo-Chinese" },
    { value: "biryani", label: "Biryani" },
  ];

  const MOOD_TAG_OPTIONS = [
    { value: "", label: "— None —" },
    { value: "light", label: "Light" },
    { value: "spicy", label: "Spicy" },
    { value: "comfort", label: "Comfort" },
    { value: "special", label: "Special" },
  ];

  const openTagModal = (item: any) => {
    setTagModalItem(item);
    setCuisineTag(item.cuisine_tag || "");
    setMoodTag(item.mood_tag || "");
    setTagError(null);
  };

  const handleSaveTags = async () => {
    if (!tagModalItem) return;

    setIsSavingTags(true);
    setTagError(null);

    try {
      const res = await apiUpdateMenuItemTags({
        resturent_identifier: selectedRestaurantId,
        item_id: tagModalItem.itemid,
        cuisine_tag: cuisineTag || null,
        mood_tag: moodTag || null,
      });

      if (res?.error) {
        setTagError(res.message || "Failed to save tags");
        return;
      }

      setTagModalItem(null);
      await fetchMenu(selectedRestaurantId);
    } catch (err) {
      setTagError("Something went wrong");
    } finally {
      setIsSavingTags(false);
    }
  };

  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [brandOutletsModal, setBrandOutletsModal] = useState<{ brand: any, outlets: any[] } | null>(null);
  const [isLoadingBrandOutlets, setIsLoadingBrandOutlets] = useState(false);
  const [newOutletRow, setNewOutletRow] = useState({
    location_id: "",
    outlet_id: ""
  });
  const WebhookLogBlock: React.FC<{ label: string; value: any }> = ({ label, value }) => {
    const [copied, setCopied] = React.useState(false);
    const text = value ? JSON.stringify(value, null, 2) : null;

    const handleCopy = () => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">{label}</p>
          {text && (
            <button
              onClick={handleCopy}
              className="text-xs text-cyan-400 hover:underline"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          )}
        </div>
        <pre className="text-xs bg-gray-800 text-gray-300 p-3 rounded-lg overflow-auto max-h-52 whitespace-pre-wrap break-all border border-gray-700">
          {text ?? "—"}
        </pre>
      </div>
    );
  };
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    name?: string;
    contact?: string;
    url?: string;
  } | null>(null);
  const [outlets, setOutlets] = useState([
    { name: "", contact: "", address: "", location_id: "" }
  ]);
  const [addingOutlet, setAddingOutlet] = useState(false);
  const [addOutletError, setAddOutletError] = useState<string | null>(null);
  // ── Webhook Logs State ──────────────────────────────────────────────
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingWebhookLogs, setIsLoadingWebhookLogs] = useState(false);
  const handleEditDeliveryCharge = (
    item: any
  ) => {

    setEditId(item.id);

    setFromKm(
      String(item.from_km)
    );

    setToKm(
      String(item.to_km)
    );

    setChargePrice(
      String(item.charge)
    );

  };
  const fetchDeliveryCharges = async () => {
    try {
      setLoadingCharges(true);

      const res = await apiGetDeliveryCharges();

      setDeliveryCharges(
        res?.data?.result || []
      );

    } catch (err) {
      console.log(err);
    } finally {
      setLoadingCharges(false);
    }
  };
  // const handleAddDeliveryCharge = async () => {

  //   if (
  //     !fromKm ||
  //     !toKm ||
  //     !chargePrice
  //   ) {
  //     alert("All fields required");
  //     return;
  //   }

  //   try {

  //     const payload = {
  //       from_km: Number(fromKm),
  //       to_km: Number(toKm),
  //       charge: Number(chargePrice)
  //     };

  //     let res;

  //     if (editId) {

  //       res = await apiUpdateDeliveryCharge(
  //         editId,
  //         payload
  //       );

  //     } else {

  //       res = await apiAddDeliveryCharge(
  //         payload
  //       );

  //     }

  //     if (res.error) {
  //       alert(res.message);
  //       return;
  //     }

  //     setEditId(null);
  //     setFromKm("");
  //     setToKm("");
  //     setChargePrice("");

  //     fetchDeliveryCharges();

  //   } catch (err) {
  //     console.log(err);
  //   }

  // };
  const fetchWebhookLogs = useCallback(async () => {
    setIsLoadingWebhookLogs(true);
    try {
      const json = await apiGetMenuWebhookLogs(10);
      if (json.ok) setWebhookLogs(json.data || []);
    } catch (err) {
      console.error("fetchWebhookLogs error:", err);
    } finally {
      setIsLoadingWebhookLogs(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab === "webhookLogs") {
      fetchWebhookLogs();
    }
  }, [activeTab]);
  const fetchOutletsByBrand = async (brand: any) => {
    setIsLoadingBrandOutlets(true);
    setAddOutletError(null);

    try {
      const [brandOutletRes, locationRes, allOutletRes] = await Promise.all([
        apiGetOutletsByBrand(brand.id, 1, 100),
        apiGetAllLocations(1, 1000),
        apiGetOutlet(1, 1000),
      ]);

      setLocations(locationRes?.data?.result || []);
      setAllOutlet(allOutletRes?.data?.result || []);

      setBrandOutletsModal({
        brand,
        outlets: brandOutletRes?.data?.result || [],
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBrandOutlets(false);
    }
  };
  const handleDeleteDiscount = async (id: string) => {
    if (!window.confirm("Delete this discount code?")) return;
    try {
      await apiDeleteDiscount(id);
      fetchDiscounts();
    } catch (err) {
      console.error("Delete discount failed:", err);
    }
  };
  const handleAddOutlet = async () => {
    if (!newOutletRow.outlet_id || !newOutletRow.location_id) {
      setAddOutletError("Select outlet and location");
      return;
    }

    try {
      setAddingOutlet(true);
      setAddOutletError(null);

      const res = await apiAddBrandOutlet({
        brand_id: brandOutletsModal?.brand.id,
        outlet_id: newOutletRow.outlet_id,
        location_id: newOutletRow.location_id
      });

      if (res.error) {
        setAddOutletError(res.message || "Failed");
        return;
      }

      // ✅ refresh list
      await fetchOutletsByBrand(brandOutletsModal?.brand);

      // ✅ reset form
      setNewOutletRow({
        outlet_id: "",
        location_id: ""
      });

    } catch (err) {
      setAddOutletError("Something went wrong");
    } finally {
      setAddingOutlet(false);
    }
  };
  const handleRemoveOutlet = async (id: string) => {
    if (!window.confirm("Remove this outlet?")) return;

    try {
      await apiRemoveBrandOutlet(id);

      await fetchOutletsByBrand(brandOutletsModal?.brand);
    } catch (err) {
      console.error(err);
    }
  };
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationTab, setReservationTab] = useState<"active" | "history">(
    "active",
  );
  // Restaurants dropdown for Live Menu
  const [restaurantOptions, setRestaurantOptions] = useState<
    { rest_id: string; name: string; city: string, brand_name: string; }[]
  >([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [isLoadingRestaurantOptions, setIsLoadingRestaurantOptions] =
    useState(false);

  const [restId, setRestId] = useState("");
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);

  const [themePrimary, setThemePrimary] = useState("#000000");
  const [themeAccent, setThemeAccent] = useState("#FFAB00");
  const [themeText, setThemeText] = useState("#FFFFFF");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const DEFAULT_IMAGE = "https://via.placeholder.com/400x300?text=No+Image";
  // --- Add Restaurant: Extra fields + uploads ---
  const [tagline, setTagline] = useState("");
  const [brandName, setbrandName] = useState("");
  const [description, setDescription] = useState("");
  const [aboutText, setAboutText] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [aboutImageUrl, setAboutImageUrl] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ✅ change this bucket to your real bucket name in Supabase Storage
  const RESTAURANT_BUCKET = "restaurant-images";
  // Loyalty State
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    rupeesPerPoint: 100,
  });
  const [isSavingLoyalty, setIsSavingLoyalty] = useState(false);
  const [loyaltySuccess, setLoyaltySuccess] = useState("");

  // Complaints State
  const [complaints, setComplaints] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [complaintFilter, setComplaintFilter] = useState<"active" | "resolved">(
    "active",
  );
  const [processingComplaintId, setProcessingComplaintId] = useState<
    string | null
  >(null);
  // 🔸 CANCEL ORDER MODAL STATE
  const [cancelOrderFor, setCancelOrderFor] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  // Reservations State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [processingResId, setProcessingResId] = useState<string | null>(null);
  const [deliveryPoints, setDeliveryPoints] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);
  const [discountModal, setDiscountModal] = useState<{ mode: "add" | "edit"; data?: any } | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [copiedDiscountId, setCopiedDiscountId] = useState<string | null>(null);

  // useEffect(() => {
  //   const brands = apiGetAllBrands(); // already synchronous in your code
  //   if (!selectedBrandId && brands.length > 0) {
  //     setSelectedBrandId(brands[0].id); // pick the first brand
  //   }
  // }, [selectedBrandId]);
  // *** REAL-TIME SETUP ***
  // Restaurants State
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);

  // Add Table Modal State
  const [addTableFor, setAddTableFor] = useState<any | null>(null);
  const [TableId, setTableId] = useState<any>(null);
  const [restaurentid, setrestaurentid] = useState<string | null>(null);
  const [resturent, setresturent] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [showTablesFor, setShowTablesFor] = useState<any | null>(null);
  const [timingsModalOutlet, setTimingsModalOutlet] = useState<any | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [AllOutlet, setAllOutlet] = useState<any[]>([]);
  const [showOutlet, setshowOutlet] = useState<string | null>(null);
  const [OutletcurrentPage, setOutletCurrentPage] = useState(1);
  const [OutlettotalPages, setOutletTotalPages] = useState(1);
  const [OutletperPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationTotalPages, setLocationTotalPages] = useState(1);
  const [locationCurrentPage, setLocationCurrentPage] = useState(1);
  const locationPerPage = 10;
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [editLocationData, setEditLocationData] = useState<any | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLong, setLocationLong] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState("");
  const buildStoragePath = (restId: string, filename: string) => {
    const safeName = filename.replace(/\s+/g, "-").toLowerCase();
    return `restaurants/${restId || "unknown"}/${Date.now()}-${safeName}`;
  };
  const handleSaveOutlets = async () => {
    if (!selectedBrand?.id) return;

    const payload = outlets.map((o) => ({
      brand_id: selectedBrand.id,
      brand_name: selectedBrand.brand_name,
      name: o.name,
      contact: o.contact,
      address: o.address,
      location_id: o.location_id
    }));

    // await apiAddOutletBulk(payload);

    setIsOutletModalOpen(false);
    setOutlets([{ name: "", contact: "", address: "", location_id: "" }]);
  };
  const fetchDeliveryPoints = async () => {
    try {
      const res = await apiGetDeliveryPoints();
      setDeliveryPoints(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (activeTab === "deliveryPoints") {
      fetchDeliveryPoints();
    }
  }, [activeTab]);
  const handleUploadDeliveryFile = async () => {
    if (!uploadFile) return;

    try {
      setIsUploadingFile(true);

      const res = await apiUploadDeliveryPoints(uploadFile);

      if (res.error) {
        alert(res.message || "Upload failed");
        return;
      }

      fetchDeliveryPoints();
      setUploadFile(null);

    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingFile(false);
    }
  };
  const uploadImage = async (file: File, type: "logo" | "hero" | "about") => {
    setUploadError(null);
    setIsUploading(true);

    try {
      if (!restaurentid) throw new Error("Please enter Rest ID first");

      const form = new FormData();
      form.append("id", restaurentid);
      form.append("type", type);
      form.append("file", file);

      // ✅ change URL if your backend prefix is different
      const res = await fetch(`${BASE_URL}/brand/upload-image`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      return data.url as string;
    } catch (e: any) {
      setUploadError(e?.message || "Image upload failed");
      return "";
    } finally {
      setIsUploading(false);
    }
  };
  const handleCloseEdit = () => {
    setActiveTab("restaurants");
    setrestaurentid(null);

    // reset form (prevents "Edit Mode Active" ghost state)
    setbrandName("");
    setTagline("");
    setDescription("");
    setAboutText("");

    setLogoUrl("");
    setHeroImageUrl("");
    setAboutImageUrl("");
  };
  const formatTimeToAMPM = (time: string) => {
    if (!time) return "";

    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const minutes = minuteStr;

    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour === 0 ? 12 : hour;

    return `${hour}:${minutes} ${ampm}`;
  };
  const fetchLocations = useCallback(async () => {
    setIsLoadingLocations(true);
    setLocationError(null);
    try {
      const res = await apiGetAllLocations(locationCurrentPage, locationPerPage);
      setLocations(res.data?.result || []);
      if (res.data?.count) {
        setLocationTotalPages(Math.ceil(res.data.count / locationPerPage));
      }
    } catch (err) {
      setLocationError("Failed to fetch locations");
    } finally {
      setIsLoadingLocations(false);
    }
  }, [locationCurrentPage, locationPerPage]);

  const openAddLocation = () => {
    setEditLocationData(null);
    setLocationName("");
    setLocationLat("");
    setLocationLong("");
    setLocationAddress("");
    setLocationError(null);
    setShowAddLocationModal(true);
  };

  const openEditLocation = (loc: any) => {
    setEditLocationData(loc);
    setLocationName(loc.location_name);
    setLocationLat(String(loc.lat));
    setLocationLong(String(loc.long));
    setLocationAddress(loc.full_address || "");
    setLocationError(null);
    setShowAddLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!locationName.trim() || !locationLat || !locationLong) {
      setLocationError("All fields are required.");
      return;
    }
    if (isNaN(Number(locationLat)) || isNaN(Number(locationLong))) {
      setLocationError("Lat and Long must be valid numbers.");
      return;
    }
    setIsSavingLocation(true);
    setLocationError(null);
    const payload = {
      location_name: locationName.trim(),
      lat: parseFloat(locationLat),
      long: parseFloat(locationLong),
      full_address: locationAddress.trim() || null,
    };
    const res = editLocationData
      ? await apiUpdateLocation(editLocationData.id, payload)
      : await apiAddLocation(payload);

    if (res.error || res.message?.toLowerCase().includes("error")) {
      setLocationError(res.message || res.error || "Save failed.");
    } else {
      setShowAddLocationModal(false);
      setEditLocationData(null);
      fetchLocations();
    }
    setIsSavingLocation(false);
  };
  const handleAddDeliveryCharge = async () => {

    if (
      !fromKm ||
      !toKm ||
      !chargePrice
    ) {
      alert("All fields required");
      return;
    }

    try {

      const payload = {
        from_km: Number(fromKm),
        to_km: Number(toKm),
        charge: Number(chargePrice)
      };

      let res;

      if (editId) {

        res = await apiUpdateDeliveryCharge(
          editId,
          payload
        );

      } else {

        res = await apiAddDeliveryCharge(
          payload
        );

      }

      if (res.error) {
        alert(res.message);
        return;
      }

      setEditId(null);

      setFromKm("");
      setToKm("");
      setChargePrice("");

      fetchDeliveryCharges();

    } catch (err) {
      console.log(err);
    }

  };
  const handleDeleteDeliveryCharge = async (id: string) => {

    if (
      !window.confirm(
        "Delete delivery charge?"
      )
    ) return;

    try {

      await apiDeleteDeliveryCharge(id);

      fetchDeliveryCharges();

    } catch (err) {
      console.log(err);
    }

  };
  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm("Delete this location?")) return;
    const res = await apiDeleteLocation(id);
    if (res.error) {
      alert(res.message || "Delete failed");
    } else {
      fetchLocations();
    }
  };
  async function loadTables(outletId: string) {
    setLoadingTables(true);
    const res = await apiGetTables(outletId);
    setTables(res.data || []);
    setLoadingTables(false);
  }
  async function loadResturent(restId: string) {
    setLoadingTables(true);
    const res = await apiGetRestaurantById(restId);
    console.log(res.data);
    var LogoURL = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${res.data.logo}`;
    var aboutURL = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${res.data.about_image}`;
    var heroURL = `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${res.data.hero_image}`;
    console.log("LogoURL: ", LogoURL);

    setresturent(res.data);
    setbrandName(res.data.name || "");
    setTagline(res.data.tagline || "");
    setDescription(res.data.description || "");
    setHeroImageUrl(res.data.hero_image || "");
    setLogoUrl(LogoURL || "");
    setAboutText(res.data.about_text || "");
    setAboutImageUrl(aboutURL || "");
    setHeroImageUrl(heroURL || "");
    setThemePrimary(res.data.theme_primary || "#000000");
    setThemeAccent(res.data.theme_accent || "#FFAB00");
    setThemeText(res.data.theme_text_on_primary || "#FFFFFF");
    setLoadingTables(false);
  }
  const fetchDiscounts = useCallback(async () => {
    setIsLoadingDiscounts(true);
    try {
      const res = await apiGetAllDiscounts(1, 100);
      setDiscounts(res?.data?.result || []);
    } catch (err) {
      console.error("fetchDiscounts:", err);
    } finally {
      setIsLoadingDiscounts(false);
    }
  }, []);

  const openAddDiscount = () => {
    setDiscountCode("");
    setDiscountPercentage("");
    setDiscountError(null);
    setDiscountModal({ mode: "add" });
  };

  const openEditDiscount = (item: any) => {
    setDiscountCode(item.discount_code);
    setDiscountPercentage(String(item.discount_percentage));
    setDiscountError(null);
    setDiscountModal({ mode: "edit", data: item });
  };

  const handleSaveDiscount = async () => {
    const pct = parseFloat(discountPercentage);

    if (!discountCode.trim()) {
      setDiscountError("Discount code is required.");
      return;
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setDiscountError("Percentage must be between 0 and 100.");
      return;
    }

    setIsSavingDiscount(true);
    setDiscountError(null);

    try {
      let res;

      if (discountModal?.mode === "edit" && discountModal.data?.id) {
        res = await apiUpdateDiscount(discountModal.data.id, {
          discount_code: discountCode.trim().toUpperCase(),
          discount_percentage: pct,
        });
      } else {
        res = await apiAddDiscount({
          discount_code: discountCode.trim().toUpperCase(),
          discount_percentage: pct,
        });
      }

      if (res?.error || res?.status >= 400) {
        setDiscountError(res?.message || "Save failed.");
        return;
      }

      setDiscountModal(null);
      fetchDiscounts();
    } catch (err) {
      setDiscountError("Something went wrong.");
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedDiscountId(id);
      setTimeout(() => setCopiedDiscountId(null), 2000);
    });
  };

  const fetchBrands = useCallback(async () => {
    setIsLoadingRestaurants(true);
    try {
      const res = await apiGetAllBrands(currentPage, perPage);

      setRestaurants(res.data?.result || []);

      if (res.data?.count) {
        setTotalPages(Math.ceil(res.data.count / perPage));
      }
    } catch (err) {
      console.error("Failed to fetch brands:", err);
      setTableError("Failed to fetch brands");
    } finally {
      setIsLoadingRestaurants(false);
    }
  }, [currentPage, perPage]);
  useEffect(() => {

    if (activeTab === "deliveryCharges") {
      fetchDeliveryCharges();
    }

  }, [activeTab]);
  useEffect(() => {
    // Subscribe to 'orders'
    const orderSubscription = supabase
      .channel("realtime:admin_orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (activeTab === "complaints") fetchComplaints();
        },
      )
      .subscribe();
    const ordersSubscription = supabase
      .channel("realtime:admin_orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          if (activeTab === "complaints") fetchComplaints();
        },
      )
      .subscribe();
    // Subscribe to 'reservations'
    const reservationSubscription = supabase
      .channel("realtime:admin_reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          if (activeTab === "reservations") fetchReservations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderSubscription);
      supabase.removeChannel(reservationSubscription);
    };
  }, [activeTab]);
  const filteredReservations = reservations.filter((res) => {
    const status = res.status?.toLowerCase().trim();

    if (reservationTab === "active") {
      return ["confirmed", "pending"].includes(status);
    }

    if (reservationTab === "history") {
      return ["completed", "cancelled"].includes(status);
    }

    return true;
  });

  const fetchMenu = useCallback(async (restId: string) => {
    if (!restId) return;

    setIsLoadingMenu(true);
    setError(null);

    try {
      const adminMenu = await apiGetAdminCategoriesMenu(restId);
      setMenu(adminMenu);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menu");
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    setIsLoadingComplaints(true);
    try {
      const allComplaints = await apiGetComplaints();
      setComplaints(allComplaints);
    } catch (err) {
      console.error("Failed to fetch complaints:", err);
    } finally {
      setIsLoadingComplaints(false);
    }
  }, []);
  // const fetchRestaurants = useCallback(async () => {
  //   setIsLoadingRestaurants(true);
  //   setTableError(null);
  //   try {
  //     const { data, error } = await supabase.from("restaurants").select("*");
  //     if (error) {
  //       console.error("Failed to fetch restaurants:", error);
  //       setTableError("Failed to fetch restaurants");
  //       return;
  //     }
  //     setRestaurants(data || []);
  //   } catch (err) {
  //     console.error("Failed to fetch restaurants:", err);
  //     setTableError("Failed to fetch restaurants");
  //   } finally {
  //     setIsLoadingRestaurants(false);
  //   }
  // }, []);
  const fetchRestaurantOptions = useCallback(async () => {
    setIsLoadingRestaurantOptions(true);

    try {
      const res = await apiGetOutlet(1, 1000); // load all outlets
      const outlets = res?.data?.result || [];

      const list = outlets.map((o: any) => ({
        rest_id: o.petpooja_outlet_id,
        name: o?.name,
        city: o?.city,
        brand_name: o?.brand_name || "",
      }));
      setRestaurantOptions(list);

      if (!selectedRestaurantId && list.length > 0) {
        setSelectedRestaurantId(list[0].rest_id);
      }
    } catch (e) {
      console.error("fetchRestaurantOptions:", e);
    } finally {
      setIsLoadingRestaurantOptions(false);
    }
  }, [selectedRestaurantId]);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const allOrders = await apiGetOrders();
      setOrders(allOrders.filter((order: any) => order.status !== "PENDING")); // ← filter out PENDING
    } catch (err) {
      console.error("Failed to fetch complaints:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);
  const fetchReservations = useCallback(async () => {
    setIsLoadingReservations(true);
    try {
      const res = await apiGetAllReservations();
      setReservations(res);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setIsLoadingReservations(false);
    }
  }, []);

  const fetchOutlets = useCallback(async () => {
    setIsLoadingOutlets(true);
    try {
      const res = await apiGetOutlet(OutletcurrentPage, OutletperPage);
      console.log("All Res: ", res);

      setAllOutlet(res.data.result || []);
      if (res.data && res.data.count) {
        setOutletTotalPages(Math.ceil(res.data.count / OutletperPage));
      }
    } catch (err) {
      console.error("Failed to fetch outlets:", err);
      setTableError("Failed to fetch outlets");
    } finally {
      setIsLoadingOutlets(false);
    }
  }, [OutletcurrentPage, OutletperPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    {
      activeTab === "Outlet" &&
        setOutletCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    {
      activeTab === "Outlet" &&
        setOutletCurrentPage((prev) => Math.min(prev + 1, OutlettotalPages));
    }
  };

  const handlePageClick = (pageNumber: any) => {
    setCurrentPage(pageNumber);
    {
      activeTab === "Outlet" && setOutletCurrentPage(pageNumber);
    }
  };

  const Pagination = () => {
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;

      if (
        activeTab === "Outlet"
          ? OutlettotalPages <= maxVisible
          : totalPages <= maxVisible
      ) {
        for (
          let i = 1;
          i <= (activeTab === "Outlet" ? OutlettotalPages : totalPages);
          i++
        ) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push("...");
          pages.push(activeTab === "Outlet" ? OutlettotalPages : totalPages);
        } else if (
          currentPage >=
          (activeTab === "Outlet" ? OutlettotalPages - 2 : totalPages - 2)
        ) {
          pages.push(1);
          pages.push("...");
          for (
            let i =
              activeTab === "Outlet" ? OutlettotalPages - 3 : totalPages - 3;
            i <= (activeTab === "Outlet" ? OutlettotalPages : totalPages);
            i++
          )
            pages.push(i);
        } else {
          pages.push(1);
          pages.push("...");
          pages.push(
            activeTab === "Outlet" ? OutletcurrentPage - 1 : currentPage - 1,
          );
          pages.push(activeTab === "Outlet" ? OutletcurrentPage : currentPage);
          pages.push(
            activeTab === "Outlet" ? OutletcurrentPage + 1 : currentPage + 1,
          );
          pages.push("...");
          pages.push(activeTab === "Outlet" ? OutlettotalPages : totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            Page {activeTab === "Outlet" ? OutletcurrentPage : currentPage} of{" "}
            {activeTab === "Outlet" ? OutlettotalPages : totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={
              activeTab === "Outlet"
                ? OutletcurrentPage === 1
                : currentPage === 1
            }
            className="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-1.5 text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${currentPage === page
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <button
            onClick={handleNextPage}
            disabled={
              activeTab === "Outlet"
                ? OutletcurrentPage === OutlettotalPages
                : currentPage === totalPages
            }
            className="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (activeTab === "menu") {
      fetchRestaurantOptions();
      if (selectedRestaurantId) {
        fetchMenu(selectedRestaurantId);
      }
    } else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "loyalty")
      apiGetLoyaltyConfig().then(setLoyaltyConfig);
    else if (activeTab === "complaints") fetchComplaints();
    else if (activeTab === "reservations") fetchReservations();
    else if (activeTab === "restaurants") fetchBrands();
  }, [
    activeTab,
    selectedRestaurantId,
    fetchMenu,
    fetchOrders,
    fetchComplaints,
    fetchReservations,
    fetchBrands,
  ]);
  useEffect(() => {
    if (activeTab === "Outlet") {
      fetchOutlets();
    }
  }, [OutletcurrentPage, activeTab]);
  useEffect(() => {
    if (activeTab === "location") fetchLocations();
  }, [locationCurrentPage, activeTab]);
  const handleFetchRestaurantData = async () => {
    setIsFetching(true);

    const res = await apiFetchRestaurantMapping(restId);

    let d: any = null;

    if (Array.isArray(res.data) && res.data.length > 0) {
      d = res.data[0].details || res.data[0];
    } else if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
      d = res.data.data[0].details || res.data.data[0];
    }

    setFetchedData(d || null);

    // ✅ Prefill new fields
    if (d) {
      setTagline(d.tagline || "");
      setDescription(d.description || "");
      setAboutText(d.about_text || "");

      setLogoUrl(d.logo || d.images?.[0] || "");
      setHeroImageUrl(d.hero_image || "");
      setAboutImageUrl(d.about_image || "");
    } else {
      setTagline("");
      setDescription("");
      setAboutText("");

      setLogoUrl("");
      setHeroImageUrl("");
      setAboutImageUrl("");
    }

    setIsFetching(false);
  };

  const DeleteTable = async (tableId: string, outletId: string) => {
    const res = await apiDeleteTable(tableId);
    if (res.error) {
      setTableError(res.error);
    }
    await loadTables(outletId); // reload restaurants
  };

  const StarRating: React.FC<{ value: number }> = ({ value }) => {
    const fullStars = Math.floor(value);

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i <= fullStars ? "text-yellow-400" : "text-gray-600"
              }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.174c.969 0 1.371 1.24.588 1.81l-3.377 2.455a1 1 0 00-.364 1.118l1.286 3.966c.3.921-.755 1.688-1.538 1.118l-3.377-2.455a1 1 0 00-1.175 0l-3.377 2.455c-.783.57-1.838-.197-1.538-1.118l1.286-3.966a1 1 0 00-.364-1.118L2.002 9.393c-.783-.57-.38-1.81.588-1.81h4.174a1 1 0 00.95-.69l1.286-3.966z" />
          </svg>
        ))}
      </div>
    );
  };

  const handleUpdateRestaurant = async () => {
    console.log(restaurentid);

    setIsUploading(true);

    const payload = {
      brand_name: brandName,
      tagline: tagline,
      description: description,
      logo: logoUrl,
      hero_image: heroImageUrl,
      about_text: aboutText,
      about_image: aboutImageUrl,
      primary_color: themePrimary,
      accent_color: themeAccent,
      text_color_on_primary: themeText,
    };
    console.log("Payload: ", payload);

    if (!restaurentid) return;

    const res = await apiUpdateBrand(restaurentid, payload);

    if (!res.error) {
      setFetchedData(null);
      setRestId("");
      setActiveTab("restaurants");

      setTimeout(() => {
        fetchBrands();
      }, 0);
    }

    setIsUploading(false);
    setrestaurentid(null);
  };

  const handleSubmitRestaurant = async () => {
    if (!fetchedData) return;
    setIsSubmitting(true);

    const payload = {
      rest_id: restId,
      name: fetchedData.restaurantname || "",

      // ✅ from new inputs
      tagline: tagline,
      description: description,

      address: fetchedData.address || "",
      city: fetchedData.city || "",

      // ✅ image urls from uploads
      logo: logoUrl,
      hero_image: heroImageUrl,

      // ✅ about section
      about_text: aboutText,
      about_image: aboutImageUrl,

      // theme
      theme_primary: themePrimary,
      theme_accent: themeAccent,
      theme_text_on_primary: themeText,

      Latitude: fetchedData.latitude ? Number(fetchedData.latitude) : null,
      Longitude: fetchedData.longitude ? Number(fetchedData.longitude) : null,
    };

    const res = await apiAddRestaurant(payload, restId);

    if (!res.error) {
      setFetchedData(null);
      setRestId("");
      setActiveTab("restaurants");
      fetchBrands();
    }

    setIsSubmitting(false);
  };

  // const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   setSelectedBrandId(e.target.value as Brand["id"]);
  //   setMenu(null);
  // };
  // const handleToggleAvailability = async (itemName: string) => { if (!menu) return; const isCurrentlyAvailable = !!menu.flatMap(c => c.items).find(i => i.name === itemName)?.isAvailable; const updatedMenu = menu.map(category => ({ ...category, items: category.items.map(item => item.name === itemName ? { ...item, isAvailable: !item.isAvailable } : item) })); try { await apiUpdateItemAvailability(selectedBrandId, itemName, !isCurrentlyAvailable); setMenu(updatedMenu); } catch (err) { setError(err instanceof Error ? err.message : "Failed to update item."); } };
  const handleLoyaltyConfigChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(e.target.value, 10);
    setLoyaltyConfig({ rupeesPerPoint: isNaN(value) || value < 1 ? 1 : value });
  };
  const handleSaveLoyaltyConfig = async () => {
    setIsSavingLoyalty(true);
    setLoyaltySuccess("");
    await apiSetLoyaltyConfig(loyaltyConfig);
    setIsSavingLoyalty(false);
    setLoyaltySuccess("Loyalty settings saved!");
    setTimeout(() => setLoyaltySuccess(""), 3000);
  };
  const calculateComplaintRefundAmount = (
    order: Order,
    requestedAmount?: number,
  ) => {
    const totalAmount = Number(order.totalAmount || 0);

    if (totalAmount <= 0) return 0;

    // If no specific amount requested, default to full refund
    if (requestedAmount === undefined || requestedAmount === null) {
      return totalAmount;
    }

    const amount = Number(requestedAmount);

    if (isNaN(amount) || amount <= 0) {
      return 0;
    }

    // 🔒 HARD GUARANTEE: refund never exceeds order total
    return Math.min(amount, totalAmount);
  };
  const handleApproveRefund = (order: Order) => {
    const total =
      Number(order.complaint?.totalAmount) || Number(order.totalAmount) || 0;

    setRefundOrder(order);
    setRefundAmount(total);
    setRefundError(null);
  };
  const handleConfirmRefund = async () => {
    if (!refundOrder) return;

    const maxAmount =
      Number(refundOrder.complaint?.totalAmount) ||
      Number(refundOrder.totalAmount) ||
      0;

    if (refundAmount <= 0) {
      setRefundError("Refund amount must be greater than 0");
      return;
    }

    if (refundAmount > maxAmount) {
      setRefundError("Refund amount cannot exceed order value");
      return;
    }

    setIsRefunding(true);
    try {
      await apiProcessRefundApproval(
        refundOrder.id,
        refundAmount,
        "Approved complaint refund",
      );
      setRefundOrder(null);
      await fetchComplaints();
    } catch (e) {
      setRefundError("Refund failed. Please try again.");
    } finally {
      setIsRefunding(false);
    }
  };

  const handleRejectComplaint = async (orderId: string) => {
    if (!window.confirm("Reject this complaint?")) return;
    setProcessingComplaintId(orderId);
    try {
      await apiRejectComplaint(orderId);
      await fetchComplaints();
    } catch (err) {
      console.error(err);
      alert("Failed to reject.");
    } finally {
      setProcessingComplaintId(null);
    }
  };
  const handleNavigate = (route: string) => (window.location.hash = route);

  const handleReservationAction = async (
    resId: string,
    action: "seated" | "cancel",
  ) => {
    if (
      action === "cancel" &&
      !window.confirm("Are you sure you want to cancel this reservation?")
    )
      return;
    setProcessingResId(resId);
    try {
      // 'seated' moves to 'completed' history. 'cancel' moves to 'cancelled' history.
      const newStatus = action === "seated" ? "completed" : "cancelled";
      await apiUpdateReservation(resId, { status: newStatus });
      await fetchReservations();
    } catch (e) {
      console.error("Error updating reservation:", e);
      alert(
        "Action failed. You may need to check database permissions (RLS policies).",
      );
    } finally {
      setProcessingResId(null);
    }
  };
  // 🔸 REFUND PERCENT LOGIC (same as tracking page)
  const calculateRefundPercent = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "food ready") return 40;
    if (["received", "accepted", "pending"].includes(normalized)) return 60;
    return 0;
  };

  // 🔸 OPEN CANCEL MODAL
  const handleOpenCancelModal = (order: Order) => {
    setCancelOrderFor(order);
    setCancelReason("");
    setCancelError(null);
  };

  // 🔸 CONFIRM CANCEL
  const handleConfirmCancel = async () => {
    if (!cancelOrderFor) return;

    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason for cancellation.");
      return;
    }

    setIsCancelling(true);
    try {
      const orderAmount = Number(cancelOrderFor.totalAmount || 0);
      const refundPercent = calculateRefundPercent(cancelOrderFor.status);
      const refundAmount = Math.round((orderAmount * refundPercent) / 100);

      await apiCancelOrder(cancelOrderFor.id, refundAmount, cancelReason);

      setCancelOrderFor(null);
      await fetchOrders();
    } catch (e: any) {
      setCancelError(e.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredComplaints = complaints.filter((order) => {
    if (!order.complaint) return false;
    if (complaintFilter === "active")
      return order.complaint.status === "pending";
    return (
      order.complaint.status === "approved" ||
      order.complaint.status === "rejected"
    );
  });

  // Helper to check if reservation is overdue by 20 mins
  const isOverdue = (date: string, time: string) => {
    const resTime = new Date(`${date}T${time}`);
    const now = new Date();
    const diffMinutes = (now.getTime() - resTime.getTime()) / 60000;
    // Only overdue if it's today and past time, or a previous date
    const isPastDate = new Date(date) < new Date(now.toDateString());
    return (
      isPastDate ||
      (new Date(date).toDateString() === now.toDateString() && diffMinutes > 20)
    );
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl bg-gray-900 rounded-lg shadow-2xl p-8">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-serif">Admin Dashboard</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs text-green-400">Real-time Connected</span>
          </div>
        </header>
        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "menu"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Live Menu
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "orders"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "reservations"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Reservations ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("complaints")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "complaints"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Complaints
          </button>
          <button
            onClick={() => setActiveTab("loyalty")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "loyalty"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Loyalty
          </button>
          <button
            onClick={() => {
              setrestaurentid(null);
              setActiveTab("restaurants");
            }}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "restaurants"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            All Brands
          </button>

          {/* <button
            onClick={() => setActiveTab("addRestaurant")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "addRestaurant"
                ? "border-b-2 border-cyan-400 text-cyan-400"
                : "text-gray-400"
              }`}
          >
            Add Restaurant
          </button> */}
          <button
            onClick={() => {
              setActiveTab("Outlet");
              fetchOutlets();
            }}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "Outlet"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Outlet
          </button>
          <button
            onClick={() => { setActiveTab("location"); fetchLocations(); }}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "location"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Locations
          </button>
          <button
            onClick={() => setActiveTab("deliveryPoints")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "deliveryPoints"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Delivery Points
          </button>
          <button
            onClick={() => setActiveTab("discount")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "discount"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Discounts
          </button>
          <button
            onClick={() =>
              setActiveTab(
                "deliveryCharges"
              )
            }
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "deliveryCharges"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Delivery Charge
          </button>
          <button
            onClick={() => setActiveTab("webhookLogs")}
            className={`flex-shrink-0 py-2 px-4 font-semibold ${activeTab === "webhookLogs"
              ? "border-b-2 border-cyan-400 text-cyan-400"
              : "text-gray-400"
              }`}
          >
            Webhook Logs
          </button>
        </div>
        {activeTab === "menu" && (
          <div className="animate-fade-in">
            <div className="mb-4 max-w-xs mx-auto">
              <select
                id="restaurant-select"
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="block w-full rounded-md border-gray-600 bg-gray-800 py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 sm:text-sm"
              >
                {isLoadingRestaurantOptions ? (
                  <option value="">Loading restaurants...</option>
                ) : restaurantOptions.length === 0 ? (
                  <option value="">No restaurants found</option>
                ) : (
                  restaurantOptions
                    .filter((r) => r.rest_id)
                    .map((r) => (
                      <option key={r.rest_id} value={r.rest_id}>
                        {r.brand_name ?? "Unknown Outlet"} ({r.city})
                      </option>
                    ))
                )}
              </select>
            </div>

            {isLoadingMenu ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : Array.isArray(menu) && menu.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                {menu.map((category) => (
                  <div
                    key={category.category}
                    className="bg-gray-800 p-4 rounded-lg"
                  >
                    <h3 className="text-lg font-semibold text-cyan-400 mb-3">
                      {category.category}
                    </h3>

                    <ul className="space-y-2">
                      {Array.isArray(category.items) &&
                        category.items.map((item: any) => (
                          <li
                            key={item.name}
                            className="flex items-center justify-between gap-2 bg-gray-900/50 p-2 rounded-md"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm block truncate">{item.name}</span>
                              {(item.cuisine_tag || item.mood_tag) && (
                                <div className="flex gap-1 mt-1">
                                  {item.cuisine_tag && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-900 text-cyan-300">
                                      {item.cuisine_tag.replaceAll("_", " ")}
                                    </span>
                                  )}
                                  {item.mood_tag && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-900 text-purple-300">
                                      {item.mood_tag}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openTagModal(item)}
                                className="px-2 py-1 text-xs font-bold rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                              >
                                {item.cuisine_tag || item.mood_tag ? "Edit Tags" : "Add Tag"}
                              </button>

                              <button
                                className={`px-2 py-1 text-xs font-bold rounded transition-colors ${item.isAvailable
                                  ? "bg-green-900 text-green-300 hover:bg-green-800"
                                  : "bg-red-900 text-red-300 hover:bg-red-800"
                                  }`}
                              >
                                {item.isAvailable ? "In Stock" : "Unavailable"}
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6">
                No menu data found for this brand.
              </p>
            )}
          </div>
        )}

        {activeTab === "restaurants" && (
          <div className="animate-fade-in">
            {isLoadingRestaurants ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : restaurants.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No brands found.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Brand Name</th>
                        {/* <th className="px-4 py-3">City</th> */}
                        {/* <th className="px-4 py-3">Rest ID</th> */}
                        <th className="px-4 py-3">Tagline</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {restaurants.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm text-white">
                            {r.brand_name}
                          </td>

                          {/* <td className="px-4 py-3 text-xs font-mono text-cyan-400">
                            -
                          </td> */}

                          <td className="px-4 py-3 text-sm text-gray-400">
                            {r.tagline || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={async () => {
                                if (!r.id) return;

                                setrestaurentid(r.id); // ✅ this alone opens modal

                                const res = await apiGetBrandById(r.id);
                                const data = res.data;

                                setbrandName(data.brand_name || "");
                                setTagline(data.tagline || "");
                                setDescription(data.description || "");
                                setAboutText(data.about_text || "");

                                const logo = data.logo
                                  ? `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${data.logo}`
                                  : "";

                                const hero = data.hero_image
                                  ? `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${data.hero_image}`
                                  : "";

                                const about = data.about_image
                                  ? `${SUPABASE_URL}/${IMAGE_BASE_URL}/restaurant-images/${data.about_image}`
                                  : "";

                                setLogoUrl(logo);
                                setHeroImageUrl(hero);
                                setAboutImageUrl(about);

                                setThemePrimary(data.primary_color || "#000000");
                                setThemeAccent(data.accent_color || "#FFAB00");
                                setThemeText(data.text_color_on_primary || "#FFFFFF");

                                // ❌ REMOVE THIS LINE
                                // setActiveTab("addRestaurant");
                              }}
                              className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 m-1 rounded-md text-xs font-semibold"
                            >
                              <Icon type="plus-circle" className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => fetchOutletsByBrand(r)}
                              className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 m-1 rounded-md text-xs font-semibold"
                            >
                              <Icon type="plus-circle" className="w-4 h-4" />
                              See Outlets
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </>
            )}

            {tableError && (
              <p className="mt-4 text-center text-sm text-red-400">
                {tableError}
              </p>
            )}
          </div>
        )}
        {activeTab === "webhookLogs" && (
          <div className="animate-fade-in">

            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-white">Webhook Logs</h2>
              <button
                onClick={fetchWebhookLogs}
                className="text-xs text-cyan-400 hover:underline"
              >
                ↻ Refresh
              </button>
            </div>

            {/* ── List ── */}
            {isLoadingWebhookLogs ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : webhookLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No webhook hits yet.</p>
            ) : (
              <div className="space-y-2">
                {webhookLogs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedWebhookLog(log)}
                    className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-4 transition-colors hover:border-gray-600"
                  >
                    {/* Status pill */}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${log.is_success === true
                        ? "bg-green-900 text-green-300"
                        : log.is_success === false
                          ? "bg-red-900 text-red-300"
                          : "bg-yellow-900 text-yellow-300"
                        }`}
                    >
                      {log.is_success === true
                        ? "✓ Success"
                        : log.is_success === false
                          ? "✗ Failed"
                          : "⏳ Processing"}
                    </span>

                    {/* URL */}
                    <span className="flex-1 text-xs font-mono text-cyan-400 truncate">
                      {log.request_url}
                    </span>

                    {/* Date / time */}
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>

                    {/* Chevron */}
                    <span className="shrink-0 text-gray-500 text-sm">›</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── Detail Modal ── */}
            {selectedWebhookLog && (
              <div
                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedWebhookLog(null)}
              >
                <div
                  className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedWebhookLog.is_success === true
                          ? "bg-green-900 text-green-300"
                          : selectedWebhookLog.is_success === false
                            ? "bg-red-900 text-red-300"
                            : "bg-yellow-900 text-yellow-300"
                          }`}
                      >
                        {selectedWebhookLog.is_success === true
                          ? "✓ Success"
                          : selectedWebhookLog.is_success === false
                            ? "✗ Failed"
                            : "⏳ Processing"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(selectedWebhookLog.created_at).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedWebhookLog(null)}
                      className="text-gray-400 hover:text-white text-xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal body — scrollable */}
                  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                    {/* URL + message */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Endpoint</p>
                      <p className="text-sm font-mono text-cyan-400 break-all">
                        {selectedWebhookLog.request_url}
                      </p>
                    </div>

                    {selectedWebhookLog.message && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Message</p>
                        <p className="text-sm text-gray-300">{selectedWebhookLog.message}</p>
                      </div>
                    )}

                    {/* Request body */}
                    <WebhookLogBlock
                      label="Request Body"
                      value={selectedWebhookLog.request_body}
                    />

                    {/* Response body */}
                    <WebhookLogBlock
                      label="Response Body"
                      value={selectedWebhookLog.response_body}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "deliveryCharges" && (
          <div className="space-y-6">

            {/* Add section */}
            <div className="bg-gray-800 rounded-lg p-6">

              <h2 className="text-xl font-bold mb-5">
                Delivery Charge Setup
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <input
                  type="number"
                  placeholder="From KM"
                  value={fromKm}
                  onChange={(e) =>
                    setFromKm(e.target.value)
                  }
                  className="bg-gray-700 h-11 px-4 rounded-md outline-none"
                />

                <input
                  type="number"
                  placeholder="To KM"
                  value={toKm}
                  onChange={(e) =>
                    setToKm(e.target.value)
                  }
                  className="bg-gray-700 h-11 px-4 rounded-md outline-none"
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={chargePrice}
                  onChange={(e) =>
                    setChargePrice(
                      e.target.value
                    )
                  }
                  className="bg-gray-700 h-11 px-4 rounded-md outline-none"
                />

                <button
                  onClick={handleAddDeliveryCharge}
                  className="
    h-11
    bg-cyan-600
    rounded-md
    hover:bg-cyan-700
    font-medium
  "
                >
                  {editId ? "Update Charge" : "Add Charge"}
                </button>

              </div>

            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">

              <table className="w-full">

                <thead className="bg-gray-700">

                  <tr>

                    <th className="py-4 text-center">
                      From
                    </th>

                    <th className="py-4 text-center">
                      To
                    </th>

                    <th className="py-4 text-center">
                      Price
                    </th>

                    <th className="py-4 text-center w-[150px]">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {deliveryCharges.map(
                    (item: any) => (

                      <tr
                        key={item.id}
                        className="
              border-t
              border-gray-700
              text-center
              "
                      >

                        <td className="py-4">
                          {item.from_km} KM
                        </td>

                        <td className="py-4">
                          {item.to_km} KM
                        </td>

                        <td className="py-4">
                          ₹{item.charge}
                        </td>

                        <td className="py-4">

                          <div className="flex justify-center gap-2">

                            <button
                              onClick={() =>
                                handleEditDeliveryCharge(
                                  item
                                )
                              }
                              className="
w-8
h-8
rounded
bg-cyan-600
hover:bg-cyan-700
flex
items-center
justify-center
"
                            >

                              <Icon
                                type="edit"
                                className="w-4 h-4"
                              />

                            </button>

                            <button
                              onClick={() =>
                                handleDeleteDeliveryCharge(
                                  item.id
                                )
                              }
                              className="
w-8
h-8
rounded
bg-red-600
hover:bg-red-700
flex
items-center
justify-center
"
                            >

                              <Icon
                                type="trash"
                                className="w-4 h-4"
                              />

                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            </div>

          </div>
        )}
        {activeTab === "orders" && (
          <div className="animate-fade-in">
            {isLoadingOrders ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No active Orders.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Order Info</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Feedback</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        {/* ORDER INFO */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-cyan-400 font-mono">
                            {o.id}
                          </div>
                          <div className="text-xs text-gray-400">{o.resturantName}</div>

                          {o.status && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300 mt-1 capitalize">
                              {o.status.replaceAll("-", " ")}
                            </span>
                          )}
                        </td>

                        {/* CUSTOMER */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-white">
                            {o.customer.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {o.customer.phone}
                          </div>
                          <div className="text-xs text-gray-500">
                            {o.customer.email}
                          </div>
                        </td>

                        {/* DATE & TIME */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(o.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        {/* PRICE */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-bold">
                          ₹{o.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {o.rating != null ? (
                            <StarRating value={o.rating} />
                          ) : null}
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          {o.feedback ? (
                            <p className="text-sm text-gray-300 line-clamp-2">
                              {o.feedback}
                            </p>
                          ) : null}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">

                            {/* 🔵 TRACK BUTTON */}
                            {o.deliveryInfo?.tracking_url && (
                              <button
                                onClick={() => {
                                  setSelectedDelivery({
                                    name: o.deliveryInfo?.rider_name,
                                    contact: o.deliveryInfo?.rider_contact,
                                    url: o.deliveryInfo?.tracking_url,
                                  });
                                  setShowDeliveryModal(true);
                                }}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1"
                              >
                                📍 Track
                              </button>
                            )}
                            {o.delivery_message && o.delivery_message.status === false && (
                              <button
                                onClick={() => setDeliveryFailureOrder(o)}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1"
                              >
                                ⚠️ uEngage
                              </button>
                            )}
                            {/* 🔴 EXISTING CANCEL / REFUND LOGIC */}
                            {o.refundAmount != null ? (
                              <span className="text-xs font-bold text-green-400">
                                Refund ₹{o.refundAmount.toFixed(2)}
                              </span>
                            ) : calculateRefundPercent(o.status) > 0 ? (
                              <button
                                className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase flex items-center gap-1"
                                onClick={() => handleOpenCancelModal(o)}
                              >
                                <Icon type="x-circle" className="w-4 h-4" />
                                Cancel
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Not cancellable
                              </span>
                            )}

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "reservations" && (
          <div className="animate-fade-in">
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setReservationTab("active")}
                className={`px-4 py-2 rounded-full font-semibold text-sm ${reservationTab === "active"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                Active
              </button>

              <button
                onClick={() => setReservationTab("history")}
                className={`px-4 py-2 rounded-full font-semibold text-sm ${reservationTab === "history"
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                History
              </button>
            </div>
            {isLoadingReservations ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No active reservations.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Info</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Table</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredReservations.map((res) => {
                      const overdue = isOverdue(res.date, res.time);
                      return (
                        <tr
                          key={res.id}
                          className={overdue ? "bg-red-900/20" : ""}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-cyan-400 font-mono">
                              {res.bookingId}
                            </div>
                            <div className="text-xs text-gray-400">
                              {res.name}
                            </div>
                            {overdue && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-200 mt-1">
                                Overdue {">"} 20m
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-white">
                              {res.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {res.phone}
                            </div>
                            <div className="text-xs text-gray-500">
                              {res.guests} Guests
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {new Date(res.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm font-light text-white">
                              {formatTimeToAMPM(res.time)} to{" "}
                              {formatTimeToAMPM(res.endtime!)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white font-bold">
                            {res.tableNumber
                              ? res.tableNumber.toUpperCase()
                              : "N/A"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {reservationTab === "active" ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    handleReservationAction(res.id, "seated")
                                  }
                                  disabled={!!processingResId}
                                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processingResId === res.id ? (
                                    <Spinner className="w-3 h-3" />
                                  ) : (
                                    <Icon
                                      type="check-circle"
                                      className="w-4 h-4"
                                    />
                                  )}
                                  Seated
                                </button>

                                <button
                                  onClick={() =>
                                    handleReservationAction(res.id, "cancel")
                                  }
                                  disabled={!!processingResId}
                                  className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-bold uppercase disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Icon type="x-circle" className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${res.status === "completed"
                                  ? "bg-green-900 text-green-300"
                                  : "bg-red-900 text-red-300"
                                  }`}
                              >
                                {res.status === "completed"
                                  ? "Seated"
                                  : "Cancelled"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === "discount" && (
          <div className="animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-white">Discount Codes</h2>
              <button
                onClick={openAddDiscount}
                className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-semibold"
              >
                + Add Discount
              </button>
            </div>

            {/* Table */}
            {isLoadingDiscounts ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : discounts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No discount codes found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Discount %</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Claimed By</th>
                      <th className="px-4 py-3">Claimed At</th>
                      <th className="px-4 py-3">Created At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {discounts.map((d) => (
                      <tr key={d.id}>

                        {/* Code + Copy */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 text-sm font-bold tracking-widest">
                              {d.discount_code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(d.id, d.discount_code)}
                              title="Copy code"
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedDiscountId === d.id ? (
                                // Checkmark icon
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                // Copy icon
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Percentage */}
                        <td className="px-4 py-3 text-sm text-white font-semibold">
                          {d.discount_percentage}%
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {d.is_claimed ? (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-900 text-red-300">
                              Claimed
                            </span>
                          ) : d.is_active ? (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-900 text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-400">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Claimed By */}
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {d.claimed_by ? (
                            <span className="truncate max-w-[120px] block" title={d.claimed_by}>
                              {d.claimed_by.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* Claimed At */}
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {d.claimed_at
                            ? new Date(d.claimed_at).toLocaleString()
                            : <span className="text-gray-600">—</span>
                          }
                        </td>

                        {/* Created At */}
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(d.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditDiscount(d)}
                              className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            >
                              <Icon type="edit" className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDiscount(d.id)}
                              className="inline-flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            >
                              <Icon type="trash" className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === "deliveryPoints" && (
          <div className="animate-fade-in">

            {/* Upload */}
            <div className="mb-4 flex gap-2">
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-sm"
              />

              <button
                onClick={handleUploadDeliveryFile}
                className="bg-green-600 px-4 py-2 rounded text-sm"
              >
                {isUploadingFile ? "Uploading..." : "Upload"}
              </button>
            </div>

            {/* Data Table */}
            {deliveryPoints.length === 0 ? (
              <p className="text-gray-400">No data found</p>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      {Object.keys(deliveryPoints[0]?.data || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-gray-400">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {deliveryPoints.map((row, i) => (
                      <tr key={i} className="border-t border-gray-700">
                        {Object.values(row.data).map((val: any, idx) => (
                          <td key={idx} className="px-3 py-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {brandOutletsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg w-full max-w-2xl">

              <h2 className="text-xl font-semibold mb-4">
                Manage Outlets - {brandOutletsModal.brand.brand_name}
              </h2>

              {/* ================= EXISTING OUTLETS ================= */}
              <div className="mb-6">
                <h3 className="text-sm text-gray-400 mb-2">Assigned Outlets</h3>

                {brandOutletsModal.outlets.length === 0 && (
                  <p className="text-gray-500 text-sm">No outlets assigned</p>
                )}

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {brandOutletsModal.outlets.map((o: any) => (
                    <div
                      key={o.id}
                      className="flex justify-between items-center bg-gray-800 p-3 rounded"
                    >
                      <div>
                        <p>{o.name}</p>
                        <p className="text-xs text-gray-400">{o.address}</p>
                      </div>

                      <button
                        onClick={() => handleRemoveOutlet(o.id)}
                        className="text-red-400 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= ADD NEW OUTLET ================= */}
              <div className="space-y-3">

                <h3 className="text-sm text-gray-400">Add Outlet</h3>

                {/* Outlet Dropdown */}
                <select
                  className="w-full p-2 bg-gray-800 rounded"
                  value={newOutletRow.outlet_id}
                  onChange={(e) =>
                    setNewOutletRow({
                      ...newOutletRow,
                      outlet_id: e.target.value
                    })
                  }
                >
                  <option value="">Select Outlet</option>

                  {AllOutlet.map((o: any) => (
                    <option
                      key={o.id}
                      value={o.id}
                      disabled={o.brand_id !== null}
                    >
                      {o.petpooja_outlet_id} {o.brand_id ? "(Assigned)" : ""}
                    </option>
                  ))}
                </select>

                {/* Location Dropdown */}
                <select
                  className="w-full p-2 bg-gray-800 rounded"
                  value={newOutletRow.location_id}
                  onChange={(e) =>
                    setNewOutletRow({
                      ...newOutletRow,
                      location_id: e.target.value
                    })
                  }
                >
                  <option value="">Select Location</option>

                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </option>
                  ))}
                </select>

                {/* Error */}
                {addOutletError && (
                  <p className="text-red-400 text-sm">{addOutletError}</p>
                )}

                {/* Button */}
                <button
                  onClick={handleAddOutlet}
                  disabled={addingOutlet}
                  className="w-full bg-cyan-600 py-2 rounded"
                >
                  {addingOutlet ? "Adding..." : "Add Outlet"}
                </button>
              </div>

              {/* Close */}
              <button
                onClick={() => setBrandOutletsModal(null)}
                className="mt-4 text-gray-400 text-sm"
              >
                Close
              </button>

            </div>
          </div>
        )}
        {isOutletModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 w-full max-w-lg rounded-xl shadow-xl p-6 space-y-5">

              {/* HEADER */}
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h2 className="text-xl font-bold text-white">Add Outlets</h2>
                <button onClick={() => setIsOutletModalOpen(false)} className="text-red-400 text-xl">✕</button>
              </div>

              {/* ROWS */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {outlets.map((o, index) => (
                  <div key={index} className="flex items-end gap-3">

                    {/* LOCATION DROPDOWN */}
                    <div className="flex-1">
                      {index === 0 && <label className="text-xs text-gray-400 mb-1 block">Location name</label>}
                      <select
                        value={o.location_id}
                        onChange={(e) => {
                          const updated = [...outlets];
                          const loc = locations.find(l => l.id === e.target.value);
                          updated[index].location_id = e.target.value;
                          updated[index].address = loc?.full_address || "";
                          setOutlets(updated);
                        }}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      >
                        <option value="">Select location</option>
                        {locations.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.location_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* OUTLET NAME DROPDOWN */}
                    <div className="flex-1">
                      {index === 0 && <label className="text-xs text-gray-400 mb-1 block">Outlet name</label>}
                      <select
                        value={o.name}
                        onChange={(e) => {
                          const updated = [...outlets];
                          updated[index].name = e.target.value;
                          setOutlets(updated);
                        }}
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      >
                        <option value="">Select outlet</option>
                        {AllOutlet.map((r: any) => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* REMOVE */}
                    <button
                      onClick={() => setOutlets(outlets.filter((_, i) => i !== index))}
                      className="text-red-400 hover:text-red-300 text-lg pb-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* ADD MORE */}
              <button
                onClick={() => setOutlets([...outlets, { name: "", contact: "", address: "", location_id: "" }])}
                className="text-sm text-cyan-400 hover:underline"
              >
                + Add more
              </button>

              {/* SAVE */}
              <button
                onClick={handleSaveOutlets}
                className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-semibold text-white"
              >
                Save all
              </button>
            </div>
          </div>
        )}
        {activeTab === "complaints" && (
          <div className="animate-fade-in">
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setComplaintFilter("active")}
                className={`px-4 py-2 rounded-full font-semibold text-sm ${complaintFilter === "active"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                Active (
                {
                  complaints.filter((c) => c.complaint?.status === "pending")
                    .length
                }
                )
              </button>
              <button
                onClick={() => setComplaintFilter("resolved")}
                className={`px-4 py-2 rounded-full font-semibold text-sm ${complaintFilter === "resolved"
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                Resolved
              </button>
            </div>
            {isLoadingComplaints ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No complaints found.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col md:flex-row gap-4"
                  >
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <p className="flex-1 min-w-0">
                          <strong className="text-gray-400">
                            Complaint ID:
                          </strong>{" "}
                          <span className="text-white font-mono break-all">
                            {order.complaint?.id}
                          </span>
                        </p>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full capitalize shrink-0 ${order.complaint?.status === "pending"
                            ? "bg-yellow-900 text-yellow-300"
                            : order.complaint?.status === "approved"
                              ? "bg-green-900 text-green-300"
                              : "bg-red-900 text-red-300"
                            }`}
                        >
                          {order.complaint?.status}
                        </span>
                      </div>
                      <p>
                        <strong className="text-gray-400">Order ID:</strong>{" "}
                        <span className="text-cyan-400 font-mono">
                          {order.id}
                        </span>
                      </p>
                      <p>
                        <strong className="text-gray-400">Customer:</strong>{" "}
                        {order.customer.name} ({order.customer.phone})
                      </p>
                      <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                        <p className="font-semibold text-red-300 mb-1">
                          Issue Items:
                        </p>
                        <ul className="list-disc list-inside pl-1 text-gray-300">
                          {order.complaint?.itemNames.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                        <p className="font-semibold text-gray-300 mb-1">
                          Comments:
                        </p>
                        <p className="italic text-gray-400">
                          "{order.complaint?.comments}"
                        </p>
                      </div>
                    </div>
                    {order.complaint?.status === "pending" && (
                      <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                        <button
                          onClick={() => handleApproveRefund(order)}
                          disabled={!!processingComplaintId}
                          className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md text-sm flex items-center justify-center gap-2"
                        >
                          {processingComplaintId === order.id ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <Icon type="check-circle" className="w-4 h-4" />
                          )}
                          Approve Refund
                        </button>

                        <button
                          onClick={() => handleRejectComplaint(order.id)}
                          disabled={!!processingComplaintId}
                          className="bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Icon type="x-circle" className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="space-y-6 animate-fade-in max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-center">
              Loyalty Configuration
            </h2>
            {loyaltySuccess && (
              <p className="text-green-400 text-center font-semibold">
                {loyaltySuccess}
              </p>
            )}
            <div className="bg-gray-800 p-6 rounded-lg">
              <label
                htmlFor="rupeesPerPoint"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Spend amount (₹) to earn 1 Point
              </label>
              <input
                id="rupeesPerPoint"
                type="number"
                value={loyaltyConfig.rupeesPerPoint}
                onChange={handleLoyaltyConfigChange}
                className="block w-full rounded-md border-gray-600 bg-gray-900 py-3 px-4 text-white text-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleSaveLoyaltyConfig}
              disabled={isSavingLoyalty}
              className="w-full rounded-md bg-cyan-600 px-4 py-3 text-lg font-semibold text-white shadow-sm hover:bg-cyan-500 disabled:bg-gray-600 transition-colors"
            >
              {isSavingLoyalty ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        )}
        {activeTab === "Outlet" && (
          <div className="animate-fade-in">
            {isLoadingOutlets ? (
              <div className="flex justify-center p-8">
                <Spinner className="w-8 h-8" />
              </div>
            ) : AllOutlet.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No restaurants found.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Restaurant Name</th>
                        <th className="px-4 py-3">State</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {AllOutlet.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm text-white">
                            {r?.name}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-cyan-400">
                            {r?.state || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {r?.city || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {r?.contact || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {r?.address && r?.city && r?.state
                              ? `${r?.address}, ${r?.city}, ${r?.state}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setAddTableFor(r);
                                setTableNumber("");
                                setCapacity("");
                                setTableError(null);
                                console.log(r);
                              }}
                              className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            >
                              <Icon type="plus-circle" className="w-4 h-4" />
                              Add Table
                            </button>{" "}
                            <button
                              onClick={() => {
                                setShowTablesFor(r);
                                loadTables(r.id);
                              }}
                              className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            >
                              <Icon type="plus-circle" className="w-4 h-4" />
                              View Tables
                            </button>
                            <button
                              onClick={() => setTimingsModalOutlet(r)}
                              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            >
                              Timings
                            </button>
                            {""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </>
            )}
            {tableError && (
              <p className="mt-4 text-center text-sm text-red-400">
                {tableError}
              </p>
            )}
          </div>
        )}
        {activeTab === "location" && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">All Locations</h2>
              <button
                onClick={openAddLocation}
                className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md text-sm font-semibold"
              >
                + Add Location
              </button>
            </div>

            {isLoadingLocations ? (
              <div className="flex justify-center p-8"><Spinner className="w-8 h-8" /></div>
            ) : locations.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No locations found.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Location Name</th>
                        <th className="px-4 py-3">Latitude</th>
                        <th className="px-4 py-3">Longitude</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Created At</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {locations.map((loc) => (
                        <tr key={loc.id}>
                          <td className="px-4 py-3 text-sm text-white font-medium">{loc.location_name}</td>
                          <td className="px-4 py-3 text-sm text-cyan-400 font-mono">{loc.lat}</td>
                          <td className="px-4 py-3 text-sm text-cyan-400 font-mono">{loc.long}</td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{loc.full_address || "-"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{new Date(loc.created_at).toLocaleDateString()}</td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditLocation(loc)}
                                className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(loc.id)}
                                className="inline-flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Page {locationCurrentPage} of {locationTotalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setLocationCurrentPage((p) => Math.max(p - 1, 1))} disabled={locationCurrentPage === 1} className="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50">Previous</button>
                    <button onClick={() => setLocationCurrentPage((p) => Math.min(p + 1, locationTotalPages))} disabled={locationCurrentPage === locationTotalPages} className="px-3 py-1.5 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50">Next</button>
                  </div>
                </div>
              </>
            )}
            {locationError && <p className="mt-4 text-center text-sm text-red-400">{locationError}</p>}
          </div>
        )}
        <div className="text-center mt-8">
          <button
            onClick={() => handleNavigate("#login")}
            className="text-sm text-cyan-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            ← Logout
          </button>
        </div>
      </div>
      {addTableFor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Add Table for{" "}
              <span className="font-mono text-cyan-400">
                {addTableFor?.restaurants?.name || "Unknown Restaurant"} -{" "}
                {addTableFor?.address || "No Address"}
              </span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Table Number
                </label>
                <input
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Capacity
                </label>
                <input
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              {tableError && (
                <p className="text-sm text-red-400">{tableError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
                disabled={isSavingTable}
                onClick={() => {
                  setAddTableFor(null);
                  setTableNumber("");
                  setCapacity("");
                  setTableError(null);
                }}
              >
                Close
              </button>
              <button
                className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60"
                disabled={isSavingTable}
                onClick={async () => {
                  if (!tableNumber || !capacity) {
                    setTableError("Table number and capacity are required.");
                    return;
                  }
                  setIsSavingTable(true);
                  setTableError(null);
                  const res = await apiAddTable({
                    table_number: tableNumber,
                    capacity: Number(capacity),
                    is_booked: false,
                    is_active: true,
                    outlet_id: addTableFor?.id || null,
                  });

                  if (res.error) {
                    setTableError(res.error);
                  } else {
                    setAddTableFor(null);
                    setTableNumber("");
                    setCapacity("");
                    await fetchBrands(); // reload restaurants
                  }

                  setIsSavingTable(false);
                }}
              >
                {isSavingTable ? "Saving..." : "Save Table"}
              </button>
            </div>
          </div>
        </div>
      )}
      {TableId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Update Table {TableId?.table_number}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Table Number
                </label>
                <input
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Capacity
                </label>
                <input
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
              {tableError && (
                <p className="text-sm text-red-400">{tableError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
                disabled={isSavingTable}
                onClick={() => {
                  setTableId(null);
                  setTableNumber("");
                  setCapacity("");
                  setTableError(null);
                }}
              >
                Close
              </button>
              <button
                className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60"
                disabled={isSavingTable}
                onClick={async () => {
                  if (
                    !tableNumber ||
                    !capacity ||
                    !TableId?.table_number ||
                    !TableId?.capacity
                  ) {
                    setTableError("Table number and capacity are required.");
                    return;
                  }
                  setIsSavingTable(true);
                  setTableError(null);
                  const res = await apiUpdateTable(TableId?.id || "", {
                    table_number: tableNumber || TableId?.table_number || "",
                    capacity: Number(capacity) || TableId?.capacity || 0,
                    is_booked: false,
                    is_active: true,
                    outlet_id: TableId?.outlet_id || null,
                  });

                  if (res.error) {
                    setTableError(res.error);
                  } else {
                    setTableId(null);
                    setTableNumber("");
                    setCapacity("");
                    await fetchBrands(); // reload restaurants
                  }
                  setIsSavingTable(false);
                }}
              >
                {isSavingTable ? "Updating..." : "Update Table"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showOutlet && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold flex items-center justify-between mb-4">
              Tables for{" "}
              <span className="font-mono text-cyan-400">{showOutlet}</span>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  setshowOutlet(null);
                  setTables([]);
                }}
              >
                ✕
              </button>
            </h3>

            {loadingTables ? (
              <p className="text-gray-400 text-sm">Loading tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-gray-400 text-sm">No tables found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between bg-gray-800 border border-gray-700 px-3 py-2 rounded"
                  >
                    <span className="text-sm">
                      {t.table_name} ({t.capacity} seats)
                    </span>

                    <button
                      className={`px-2 py-1 rounded text-xs text-white ${t.is_active
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-red-600 hover:bg-red-500"
                        }`}
                      onClick={async () => {
                        await apiToggleTable(t.id, !t.is_active);
                        loadTables(showTablesFor!);
                      }}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showTablesFor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-[52rem] shadow-xl">
            <h3 className="text-lg font-semibold flex items-center justify-between mb-4">
              Tables for{" "}
              <span className="font-mono text-cyan-400">
                {" "}
                {showTablesFor?.restaurants?.name ||
                  "Unknown Restaurant"} -{" "}
                {showTablesFor?.address || "No Address"}
              </span>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  setShowTablesFor(null);
                  setTables([]);
                }}
              >
                ✕
              </button>
            </h3>

            {loadingTables ? (
              <p className="text-gray-400 text-sm">Loading tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-gray-400 text-sm">No tables found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between bg-gray-800 border border-gray-700 px-3 py-2 rounded"
                  >
                    <span className="text-sm">
                      {t.table_number} ({t.capacity} seats)
                    </span>
                    <div className="flex gap-2">
                      <button
                        className={`px-2 py-1 rounded text-xs text-white ${t.is_active
                          ? "bg-green-600 hover:bg-green-500"
                          : "bg-red-600 hover:bg-red-500"
                          }`}
                        onClick={async () => {
                          console.log(t);
                          await apiToggleTable(t.id, !t.is_active);
                          loadTables(showTablesFor.id!);
                        }}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </button>
                      <button
                        className={`px-2 py-1 rounded text-xs text-white ${!t.is_booked
                          ? "bg-green-600 hover:bg-green-500"
                          : "bg-red-600 hover:bg-red-500"
                          }`}
                      // onClick={async () => {
                      //   await apiToggleTable(t.id, !t.is_booked);
                      //   loadTables(showTablesFor.id!);
                      // }}
                      >
                        Seats {t.is_booked ? "Booked" : "Available"}
                      </button>
                      <button
                        onClick={() => {
                          setTableId(t);
                          setTableNumber(t.table_number);
                          setCapacity(t.capacity);
                          setShowTablesFor(null);
                        }}
                        className={`px-2 py-1 rounded text-xs text-white bg-cyan-600 hover:bg-cyan-500`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          DeleteTable(t.id, t.outlet_id);
                          console.log(t);

                          // setShowTablesFor(null);
                        }}
                        className="bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icon type="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {restaurentid &&
        (loadingTables ? (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto scrollbar-hide">
              <style >{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>

              {/* Sticky Header */}
              <div className="sticky top-0 bg-gray-900 px-6 py-4 border-b border-gray-700 flex items-center justify-between z-10">
                <h3 className="text-lg font-semibold text-cyan-400">
                  Brand Details
                </h3>
                <button
                  onClick={() => setrestaurentid(null)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">
                    Add Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setbrandName(e.target.value)}
                    placeholder="Add The Brand Name"
                    className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Short tagline"
                    className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="About this restaurant"
                    className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3 h-24"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* LOGO */}
                  <div className="space-y-2">
                    <label className="text-gray-400 text-sm">Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // instant preview
                        const localUrl = URL.createObjectURL(file);
                        setLogoUrl(localUrl);

                        // upload to storage
                        const url = await uploadImage(file, "logo");
                        if (url) setLogoUrl(url);
                      }}
                      className="w-full text-sm text-gray-300"
                    />
                    <img
                      src={logoUrl || DEFAULT_IMAGE}
                      alt="Logo Preview"
                      className="w-full h-40 object-cover border border-gray-700 rounded"
                    />
                  </div>

                  {/* HERO IMAGE */}
                  <div className="space-y-2">
                    <label className="text-gray-400 text-sm">Hero Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const localUrl = URL.createObjectURL(file);
                        setHeroImageUrl(localUrl);

                        const url = await uploadImage(file, "hero");
                        if (url) setHeroImageUrl(url);
                      }}
                      className="w-full text-sm text-gray-300"
                    />
                    <img
                      src={heroImageUrl || DEFAULT_IMAGE}
                      alt="Hero Preview"
                      className="w-full h-40 object-cover border border-gray-700 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">About Text</label>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Story / about section"
                    className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3 h-24"
                  />
                </div>

                {/* ABOUT IMAGE */}
                <div className="space-y-2">
                  <label className="text-gray-400 text-sm">About Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const localUrl = URL.createObjectURL(file);
                      setAboutImageUrl(localUrl);
                      const url = await uploadImage(file, "about");
                      if (url) setAboutImageUrl(url);
                    }}
                    className="w-full text-sm text-gray-300"
                  />
                  <img
                    src={aboutImageUrl || DEFAULT_IMAGE}
                    alt="About Preview"
                    className="w-full h-56 object-cover border border-gray-700 rounded"
                  />
                </div>

                {uploadError ? (
                  <p className="text-sm text-red-400">{uploadError}</p>
                ) : null}

                {isUploading ? (
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    <Spinner className="w-4 h-4" /> Uploading image...
                  </p>
                ) : null}
                <div className="bg-gray-900 border border-gray-700 p-5 rounded-md space-y-4">
                  <h3 className="text-lg font-semibold text-cyan-400">
                    Theme Configuration
                  </h3>

                  <input
                    type="color"
                    value={themePrimary}
                    onChange={(e) => setThemePrimary(e.target.value)}
                    className="w-full h-10 cursor-pointer"
                  />
                  <label className="text-gray-400 text-sm">Primary Color</label>

                  <input
                    type="color"
                    value={themeAccent}
                    onChange={(e) => setThemeAccent(e.target.value)}
                    className="w-full h-10 cursor-pointer"
                  />
                  <label className="text-gray-400 text-sm">Accent Color</label>

                  <input
                    type="color"
                    value={themeText}
                    onChange={(e) => setThemeText(e.target.value)}
                    className="w-full h-10 cursor-pointer"
                  />
                  <label className="text-gray-400 text-sm">
                    Text Color On Primary
                  </label>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setrestaurentid(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-md transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateRestaurant();
                    }}
                    disabled={isUploading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

      {cancelOrderFor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Icon type="warning" className="w-5 h-5 text-yellow-400" />
              Confirm Cancellation
            </h3>

            <textarea
              placeholder="Reason for cancellation..."
              className="w-full h-24 mt-4 bg-gray-800 text-gray-200 border border-gray-700 p-3 rounded-md"
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelError(null);
              }}
            />

            {cancelError && (
              <p className="text-sm text-red-400 mt-2">{cancelError}</p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
                disabled={isCancelling}
                onClick={() => setCancelOrderFor(null)}
              >
                Keep Order
              </button>

              <button
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-70"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">
              {editLocationData ? "Edit Location" : "Add Location"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Location Name</label>
                <input className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2" placeholder="e.g. Kolkata Central" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Latitude</label>
                <input className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2" placeholder="e.g. 22.572646" value={locationLat} onChange={(e) => setLocationLat(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Longitude</label>
                <input className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2" placeholder="e.g. 88.363895" value={locationLong} onChange={(e) => setLocationLong(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Full Address</label>
                <input
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
                  placeholder="e.g. 123 MG Road, Bengaluru, Karnataka"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </div>
              {locationError && <p className="text-sm text-red-400">{locationError}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
                disabled={isSavingLocation}
                onClick={() => { setShowAddLocationModal(false); setEditLocationData(null); setLocationError(null); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60"
                disabled={isSavingLocation}
                onClick={handleSaveLocation}
              >
                {isSavingLocation ? "Saving..." : editLocationData ? "Update" : "Add Location"}
              </button>
            </div>
          </div>
        </div>
      )}
      {refundOrder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Approve Refund</h3>

            <p className="text-sm text-gray-400 mb-1">Order ID:</p>
            <p className="font-mono text-cyan-400 mb-3">{refundOrder.id}</p>

            <p className="text-sm text-gray-400 mb-1">Order Value:</p>
            <p className="text-white font-bold mb-4">
              ₹{refundOrder.complaint?.totalAmount}
            </p>

            <label className="block text-sm text-gray-300 mb-1">
              Refund Amount
            </label>

            <input
              type="number"
              min={0}
              max={refundOrder.complaint?.totalAmount}
              value={refundAmount}
              onChange={(e) => {
                const value = Number(e.target.value);
                setRefundAmount(value);
                setRefundError(
                  value > Number(refundOrder.complaint?.totalAmount)
                    ? "Refund cannot exceed order value"
                    : null,
                );
              }}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-md p-2
             [appearance:textfield]
             [&::-webkit-outer-spin-button]:appearance-none
             [&::-webkit-inner-spin-button]:appearance-none"
            />

            {refundError && (
              <p className="text-sm text-red-400 mt-2">{refundError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRefundOrder(null)}
                className="px-4 py-2 rounded-md border border-gray-600 text-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-60"
              >
                {isRefunding ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
      {timingsModalOutlet && (
        <OutletTimingsModal
          outlet={timingsModalOutlet}
          onClose={() => setTimingsModalOutlet(null)}
        />
      )}
      {tagModalItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setTagModalItem(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-semibold text-cyan-400">
                Tag "{tagModalItem.name}"
              </h3>
              <button
                onClick={() => setTagModalItem(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Cuisine Type</label>
              <select
                value={cuisineTag}
                onChange={(e) => setCuisineTag(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
              >
                {CUISINE_TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Mood</label>
              <select
                value={moodTag}
                onChange={(e) => setMoodTag(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-2"
              >
                {MOOD_TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {tagError && <p className="text-sm text-red-400">{tagError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setTagModalItem(null)}
                disabled={isSavingTags}
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                disabled={isSavingTags}
                className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60"
              >
                {isSavingTags ? "Saving..." : "Save Tags"}
              </button>
            </div>
          </div>
        </div>
      )}
      {timingsModalOutlet && (
        <OutletTimingsModal
          outlet={timingsModalOutlet}
          onClose={() => setTimingsModalOutlet(null)}
        />
      )}
      {showDeliveryModal && selectedDelivery && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center"
          onClick={() => setShowDeliveryModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden w-[95vw] h-[85vh] sm:w-[75vw] sm:h-[82vh] md:w-[60vw] md:h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span>🚚</span>
                <h3 className="font-semibold text-white">Delivery Tracking</h3>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Rider Info */}
            {(selectedDelivery.name || selectedDelivery.contact) && (
              <div className="flex gap-6 px-5 py-3 bg-gray-800/50 border-b border-gray-700 text-sm text-gray-300">
                {selectedDelivery.name && (
                  <p><strong className="text-white">Name:</strong> {selectedDelivery.name}</p>
                )}
                {selectedDelivery.contact && (
                  <p><strong className="text-white">Contact:</strong> {selectedDelivery.contact}</p>
                )}
              </div>
            )}

            {/* Iframe */}
            {selectedDelivery.url ? (
              <iframe
                src={selectedDelivery.url}
                className="flex-1 w-full border-0"
                allow="geolocation"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                No tracking available
              </div>
            )}
          </div>
        </div>
      )}
      {discountModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl p-6 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-semibold text-cyan-400">
                {discountModal.mode === "edit" ? "Edit Discount" : "Add Discount"}
              </h3>
              <button
                onClick={() => setDiscountModal(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Discount Code */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Discount Code</label>
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3 font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">Will be saved in UPPERCASE automatically.</p>
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Discount Percentage (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="e.g. 15"
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-md p-3
            [appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Toggle active (edit only) */}
            {/* {discountModal.mode === "edit" && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-300">Active</label>
                <button
                  onClick={() =>
                    setDiscountModal((prev) =>
                      prev ? { ...prev, data: { ...prev.data, is_active: !prev.data?.is_active } } : prev
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${discountModal.data?.is_active
                      ? "bg-green-700 text-green-200"
                      : "bg-gray-700 text-gray-400"
                    }`}
                >
                  {discountModal.data?.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            )} */}

            {/* Error */}
            {discountError && (
              <p className="text-sm text-red-400">{discountError}</p>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDiscountModal(null)}
                disabled={isSavingDiscount}
                className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDiscount}
                disabled={isSavingDiscount}
                className="px-4 py-2 text-sm rounded-md bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60"
              >
                {isSavingDiscount
                  ? "Saving..."
                  : discountModal.mode === "edit"
                    ? "Update"
                    : "Add Discount"}
              </button>
            </div>

          </div>
        </div>
      )}
         {deliveryFailureOrder && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDeliveryFailureOrder(null)}
        >
          <div
            className="bg-gray-900 border border-yellow-600 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-xl">⚠️</span>
                <h3 className="text-lg font-semibold text-yellow-400">uEngage Delivery Failed</h3>
              </div>
              <button
                onClick={() => setDeliveryFailureOrder(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Order ID</p>
                <p className="font-mono text-cyan-400">{deliveryFailureOrder.id}</p>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-0.5">Vendor Order ID</p>
                <p className="font-mono text-gray-200">
                  {deliveryFailureOrder.delivery_message?.vendor_order_id || "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-0.5">Task ID</p>
                <p className="font-mono text-gray-200">
                  {deliveryFailureOrder.delivery_message?.taskId || "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-0.5">Status Code</p>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-900 text-red-300">
                  {deliveryFailureOrder.delivery_message?.status_code || "—"}
                </span>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Failure Reason</p>
                <p className="text-yellow-300 font-semibold">
                  {deliveryFailureOrder.delivery_message?.message || "Unknown error"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setDeliveryFailureOrder(null)}
              className="w-full mt-2 px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-200 hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
