import React, { useState } from "react";
import { Icon } from "./Icon";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FoodFinderPreferences {
  cuisineKey: string | null;       // raw Q1 option key, "not_sure" if skipped
  partySize: string | null;        // Q2 answer label
  partyCount: number | null;       // for "Office Party" custom count
  mood: string | null;             // Q3 answer label
  allergies: string[];             // Q4 selected allergen keywords
}

export type FoodFinderResult =
  | { status: "selected" }
  | { status: "closed"; brandName: string; opensAt?: string | null }
  | { status: "not_found" };

interface FoodFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the quiz completes and a specific brand match is requested.
   * `cuisineKeywords` are the keyword(s) to match against brand_name.
   * Returns a result describing whether a brand was selected, found-but-closed, or not found at all.
   */
  onFinish: (cuisineKeywords: string[] | null, prefs: FoodFinderPreferences) => FoodFinderResult;
}

// ─── Static option config ───────────────────────────────────────────────────

const CUISINE_OPTIONS: { key: string; label: string; keywords: string[] | null }[] = [
  { key: "niraamish", label: "Pure Veg – Bengali/North Indian – Niraamish", keywords: ["niraamish"] },
  { key: "banglar_jhale_jhole", label: "Authentic Bengali – Banglar Jhale Jhole", keywords: ["banglar", "jhale", "jhole"] },
  { key: "indo_chinese", label: "Authentic Indo-Chinese – HOT", keywords: ["teretti", "teritty"] },
  { key: "biryani", label: "Biryani – Hyderabad/Kolkata", keywords: ["biryani"] },
  { key: "not_sure", label: "Not sure – Show All Brands", keywords: null },
];

const PARTY_OPTIONS = ["1", "2", "Family of 4", "Office Party"];

const MOOD_OPTIONS = ["Light", "Spicy", "Comfort", "Special"];

// Keywords used later (on BrandPage) to soft-sort/highlight menu items per mood
export const MOOD_KEYWORDS: Record<string, string[]> = {
  Light: ["light", "salad", "soup", "steamed", "grilled", "fresh"],
  Spicy: ["spicy", "chilli", "chili", "hot", "fiery", "pepper"],
  Comfort: ["comfort", "creamy", "curry", "rice", "khichuri", "dal", "stew"],
  Special: ["special", "signature", "chef", "premium", "platter"],
};

const ALLERGY_OPTIONS = [
  { key: "nuts", label: "Nuts" },
  { key: "dairy", label: "Dairy" },
  { key: "gluten", label: "Gluten" },
  { key: "egg", label: "Egg" },
  { key: "shellfish", label: "Shellfish" },
];

// ─── Step indicator ──────────────────────────────────────────────────────────

const StepDots: React.FC<{ step: number; total: number }> = ({ step, total }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className={`h-1.5 rounded-full transition-all duration-300 ${
          i === step ? "w-8 bg-cyan-500" : i < step ? "w-4 bg-cyan-700" : "w-4 bg-gray-700"
        }`}
      />
    ))}
  </div>
);

// ─── Option button ──────────────────────────────────────────────────────────

const OptionButton: React.FC<{
  label: string;
  selected?: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={[
      "w-full text-left px-4 py-3 rounded-xl border transition-all font-medium",
      selected
        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
        : "border-gray-700 bg-gray-800 text-gray-200 hover:border-cyan-600 hover:bg-gray-750",
    ].join(" ")}
  >
    {label}
  </button>
);

// ─── Main component ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const FoodFinderModal: React.FC<FoodFinderModalProps> = ({ isOpen, onClose, onFinish }) => {
  const [step, setStep] = useState(0);
  const [cuisineKey, setCuisineKey] = useState<string | null>(null);
  const [partySize, setPartySize] = useState<string | null>(null);
  const [partyCount, setPartyCount] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noMatchNotice, setNoMatchNotice] = useState(false);
  const [closedInfo, setClosedInfo] = useState<{ brandName: string; opensAt?: string | null } | null>(null);

  const reset = () => {
    setStep(0);
    setCuisineKey(null);
    setPartySize(null);
    setPartyCount(null);
    setMood(null);
    setAllergies([]);
    setNoMatchNotice(false);
    setClosedInfo(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleAllergy = (key: string) => {
    if (key === "none") {
      setAllergies([]);
      return;
    }
    setAllergies((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  };

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    const selectedCuisine = CUISINE_OPTIONS.find((c) => c.key === cuisineKey) || null;
    const prefs: FoodFinderPreferences = {
      cuisineKey,
      partySize,
      partyCount,
      mood,
      allergies,
    };

    // "Not sure" → always just close the modal and land on the landing page
    // (the grid of all brands), no notice, no further branching needed.
    if (!selectedCuisine || selectedCuisine.key === "not_sure") {
      onFinish(null, prefs);
      handleClose();
      return;
    }

    const result = onFinish(selectedCuisine.keywords, prefs);

    if (result.status === "selected") {
      handleClose();
      return;
    }

    if (result.status === "closed") {
      setClosedInfo({ brandName: result.brandName, opensAt: result.opensAt });
      setNoMatchNotice(true);
      setTimeout(() => {
        handleClose();
      }, 2200);
      return;
    }

    if (result.status === "not_found") {
      setNoMatchNotice(true);
      setTimeout(() => {
        handleClose();
      }, 1600);
      return;
    }

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 relative animate-fade-in"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <Icon type="x" className="w-5 h-5" />
        </button>

        {noMatchNotice ? (
          <div className="text-center py-10">
            {closedInfo ? (
              <>
                <p className="text-gray-200 font-semibold mb-1">
                  {closedInfo.brandName} is currently closed.
                </p>
                {closedInfo.opensAt && (
                  <p className="text-gray-400 text-sm mb-1">
                    Opens at <span className="text-cyan-400 font-semibold">{closedInfo.opensAt}</span>
                  </p>
                )}
                <p className="text-gray-500 text-sm">Showing all open brands instead...</p>
              </>
            ) : (
              <>
                <p className="text-gray-200 font-semibold mb-1">
                  That brand isn't available right now.
                </p>
                <p className="text-gray-500 text-sm">Showing all open brands instead...</p>
              </>
            )}
          </div>
        ) : (
          <>
            <StepDots step={step} total={TOTAL_STEPS} />

            {step === 0 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-xl font-serif font-bold text-white mb-1">
                  What do you want to eat?
                </h3>
                <p className="text-gray-500 text-sm mb-4">Pick a cuisine to get started.</p>
                {CUISINE_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.key}
                    label={opt.label}
                    selected={cuisineKey === opt.key}
                    onClick={() => {
                      setCuisineKey(opt.key);
                      if (opt.key === "not_sure") {
                        // Skip the rest of the quiz entirely — close and land on the grid.
                        onFinish(null, {
                          cuisineKey: opt.key,
                          partySize,
                          partyCount,
                          mood,
                          allergies,
                        });
                        handleClose();
                        return;
                      }
                      goNext();
                    }}
                  />
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-xl font-serif font-bold text-white mb-1">
                  How many people?
                </h3>
                <p className="text-gray-500 text-sm mb-4">Helps us size your order.</p>
                {PARTY_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt}
                    label={opt}
                    selected={partySize === opt}
                    onClick={() => {
                      setPartySize(opt);
                      if (opt !== "Office Party") {
                        setPartyCount(null);
                        goNext();
                      }
                    }}
                  />
                ))}

                {partySize === "Office Party" && (
                  <div className="pt-2 animate-fade-in">
                    <label className="text-xs text-gray-400 block mb-1">
                      Number of people
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        value={partyCount ?? ""}
                        onChange={(e) =>
                          setPartyCount(e.target.value ? parseInt(e.target.value) : null)
                        }
                        placeholder="e.g. 12"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={goNext}
                        disabled={!partyCount || partyCount < 1}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={goBack}
                  className="text-gray-500 hover:text-gray-300 text-sm mt-2"
                >
                  ← Back
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-xl font-serif font-bold text-white mb-1">
                  What's the mood?
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  We'll highlight dishes that match.
                </p>
                {MOOD_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt}
                    label={opt}
                    selected={mood === opt}
                    onClick={() => {
                      setMood(opt);
                      goNext();
                    }}
                  />
                ))}
                <button
                  onClick={goBack}
                  className="text-gray-500 hover:text-gray-300 text-sm mt-2"
                >
                  ← Back
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-serif font-bold text-white mb-1">
                  Any allergies?
                </h3>
                <p className="text-gray-500 text-sm mb-2">
                  We'll filter these out of the menu for you.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleAllergy("none")}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
                      allergies.length === 0
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600",
                    ].join(" ")}
                  >
                    None
                  </button>
                  {ALLERGY_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => toggleAllergy(opt.key)}
                      className={[
                        "px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
                        allergies.includes(opt.key)
                          ? "border-red-500 bg-red-500/10 text-red-300"
                          : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={goBack}
                    className="text-gray-500 hover:text-gray-300 text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={finish}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-2.5 rounded-full transition-colors shadow-md"
                  >
                    Find My Food →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FoodFinderModal;