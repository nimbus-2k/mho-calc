import "./App.css";
import { Analytics } from "@vercel/analytics/react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { type Item, conditionLabels } from "./data/stats";
import { type Hero, heroes } from "./data/heroes";
import { calculateItemTotals, calculateFinalStats } from "./utils/statCalculate";
import HeroSection from "./sections/HeroSection.tsx";
import StatsSection from "./sections/StatsSection.tsx";
import ItemsSection from "./sections/ItemsSection.tsx";
import InfinitySection from "./sections/InfinitySection.tsx";
import DamageSection from "./sections/DamageSection.tsx";
import SynergySection from "./sections/SynergySection.tsx";
import ModifierSection from "./sections/ModifierSection.tsx";

const MODIFIER_SLOT1_PRIMARY = ["Physical", "Energy", "Mental"] as const;
const DAMAGE_SECTION_UNIVERSAL_KEYWORDS = ["Physical", "Melee", "Energy", "Ranged", "Mental", "Area", "Summon", "Movement", "Signature"] as const;

function slot1LegendDefaultsForHero(heroName: string): Record<(typeof MODIFIER_SLOT1_PRIMARY)[number], boolean> {
    const hero = heroes.find((h) => h.name === heroName);
    const slot1Lower = new Set(MODIFIER_SLOT1_PRIMARY.map((t) => t.toLowerCase()));
    const raw = hero?.damageType ?? [];
    const included = new Set(
        raw.map((t) => t.trim().toLowerCase()).filter((t) => slot1Lower.has(t))
    );
    const out = {} as Record<(typeof MODIFIER_SLOT1_PRIMARY)[number], boolean>;
    for (const t of MODIFIER_SLOT1_PRIMARY) {
        out[t] = included.size > 0 ? included.has(t.toLowerCase()) : true;
    }
    return out;
}

export default function App() {
    const [activeTab, setActiveTab] = useState<"items" | "infinity" | "synergy" | "damage" | "modifiers">("items");
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    // Hero Section
    const [selectedHero, setSelectedHero] = useState<string>("Angela");
    const hero = heroes.find((h) => h.name === selectedHero);
    const [heroLevel, setHeroLevel] = useState<number>(60);
    const [combatState, setCombatState] = useState(false);
    const [heroAttributes, setHeroAttributes] = useState<Record<string, number>>({});

    // Items Section
    const [items, setItems] = useState<Item[]>([
        { id: 1, name: "", selectedStats: [], enabled: true },
    ]);

    // Infinity Section
    const [infinity, setInfinity] = useState<Record<string, number>>({});
    const [infinityAttributes, setInfinityAttributes] = useState<Record<string, number>>({});
    const [pointsRemaining, setPointsRemaining] = useState(80400);
    const [ranks, setRanks] = useState<Record<string, number>>({});
    const [usedPerGem, setUsedPerGem] = useState<Record<string, number>>({});

    // Synergy Section
    const [synergy, setSynergy] = useState<Record<string, number>>({});
    const [activatedHeroes, setActivatedHeroes] = useState<string[]>([]);

    // Damage Section
    const [damageCalculators, setDamageCalculators] = useState<Array<{ baseMin: number; baseMax: number; keywords?: string[] }>>(() =>
        Array(8).fill(null).map(() => ({
            baseMin: 0,
            baseMax: 0,
            attackSpeed: 1,
            keywords: [],
        }))
    );
    const [globalCheckedConditions, setGlobalCheckedConditions] = useState<boolean[]>(
        Array(conditionLabels.length).fill(false)
    );
    const [vuln, setVuln] = useState<number>(0);

    // Modifier Section 
    const [modifierChartTypeEnabled, setModifierChartTypeEnabled] = useState<Record<string, boolean>>({});

    const handleUserSelectHeroForModifiers = useCallback((heroName: string) => {
        setModifierChartTypeEnabled((prev) => ({
            ...prev,
            ...slot1LegendDefaultsForHero(heroName),
        }));
    }, []);

    // Fill missing primary-type keys when hero changes from load/init (does not override saved toggles).
    useEffect(() => {
        setModifierChartTypeEnabled((prev) => {
            const defs = slot1LegendDefaultsForHero(selectedHero);
            let changed = false;
            const next = { ...prev };
            for (const t of MODIFIER_SLOT1_PRIMARY) {
                if (next[t] === undefined) {
                    next[t] = defs[t];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [selectedHero]);

    // When switching heroes, drop any previously-selected hero-specific keywords that don't exist on the new hero.
    // (Keeps universal damage-type keywords like Physical/Melee/etc.)
    useEffect(() => {
        const heroBonusKeywordsLower = new Set((hero?.bonusDmgKeywords ?? []).map((k) => k.toLowerCase()));
        const universalLower = new Set(DAMAGE_SECTION_UNIVERSAL_KEYWORDS.map((k) => k.toLowerCase()));
        const allowedLower = new Set<string>([...heroBonusKeywordsLower, ...universalLower]);

        setDamageCalculators((prev) => {
            let changed = false;
            const next = prev.map((calc) => {
                const current = calc.keywords ?? [];
                const filtered = current.filter((k) => allowedLower.has(k.toLowerCase()));
                if (filtered.length !== current.length) changed = true;
                return filtered.length === current.length ? calc : { ...calc, keywords: filtered };
            });
            return changed ? next : prev;
        });
    }, [selectedHero]);

    // Toast notification
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const showToast = (message: string) => {
        setToast({ message, visible: true });
        window.clearTimeout((showToast as any)._tId);
        (showToast as any)._tId = window.setTimeout(() => setToast({ message: "", visible: false }), 1500);
    };

    // Ref for info modal
    const infoModalRef = useRef<HTMLDivElement>(null);
    const notesModalRef = useRef<HTMLDivElement>(null);

    const itemTotals = useMemo(() => calculateItemTotals(items), [items]);
    const finalStats = useMemo(
        () => calculateFinalStats(hero as Hero, heroLevel, combatState, heroAttributes, infinityAttributes, itemTotals, infinity, synergy),
        [hero, heroLevel, combatState, heroAttributes, infinityAttributes, itemTotals, infinity, synergy]
    );

    useEffect(() => {
        loadState();
    }, []);



    // Handle click outside to close info modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (infoModalOpen && infoModalRef.current && !infoModalRef.current.contains(event.target as Node)) {
                setInfoModalOpen(false);
            }
        };

        if (infoModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [infoModalOpen]);

    useEffect(() => {
        if (!infoModalOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const previousTransform = document.body.style.transform;
        document.body.style.overflow = "hidden";
        document.body.style.transform = "none";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.transform = previousTransform;
        };
    }, [infoModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notesModalOpen && notesModalRef.current && !notesModalRef.current.contains(event.target as Node)) {
                setNotesModalOpen(false);
            }
        };

        if (notesModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [notesModalOpen]);

    useEffect(() => {
        if (!notesModalOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const previousTransform = document.body.style.transform;
        document.body.style.overflow = "hidden";
        document.body.style.transform = "none";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.transform = previousTransform;
        };
    }, [notesModalOpen]);

    const saveState = () => {
        const stateToSave = {
            selectedHero,
            heroLevel,
            combatState,
            heroAttributes,
            infinityAttributes,
            items,
            infinity,
            pointsRemaining,
            ranks,
            usedPerGem,
            synergy,
            activatedHeroes,
            damageCalculators,
            globalCheckedConditions,
            vuln,
            modifierChartTypeEnabled,
        };

        try {
            localStorage.setItem("appState", JSON.stringify(stateToSave));
            console.log("State saved successfully.");
            showToast("Saved");
        } catch (error) {
            console.error("Failed to save state:", error);
            showToast("Save Failed");
        }
    };

    const loadState = () => {
        try {
            const savedState = localStorage.getItem("appState");
            if (!savedState) return;

            const parsedState = JSON.parse(savedState);

            if (parsedState.selectedHero) setSelectedHero(parsedState.selectedHero);
            if (parsedState.heroLevel) setHeroLevel(parsedState.heroLevel);
            if (parsedState.combatState !== undefined) setCombatState(parsedState.combatState);
            if (parsedState.heroAttributes) setHeroAttributes(parsedState.heroAttributes);
            if (parsedState.infinityAttributes) setInfinityAttributes(parsedState.infinityAttributes);
            if (parsedState.items) {
                // Handle backward compatibility for items without enabled field
                const itemsWithEnabled = parsedState.items.map((item: any) => ({
                    ...item,
                    enabled: item.enabled !== undefined ? item.enabled : true
                }));
                setItems(itemsWithEnabled);
            }
            if (parsedState.infinity) setInfinity(parsedState.infinity);
            if (parsedState.pointsRemaining !== undefined) setPointsRemaining(parsedState.pointsRemaining);
            if (parsedState.ranks) setRanks(parsedState.ranks);
            if (parsedState.usedPerGem) setUsedPerGem(parsedState.usedPerGem);
            if (parsedState.synergy) setSynergy(parsedState.synergy);
            if (parsedState.activatedHeroes) setActivatedHeroes(parsedState.activatedHeroes);
            if (parsedState.damageCalculators && parsedState.damageCalculators.length) {
                // Normalize to new shape with baseMin and baseMax
                const converted = parsedState.damageCalculators.map((c: any) => {
                    // New shape already present
                    if (c.baseMin !== undefined && c.baseMax !== undefined) {
                        return { baseMin: c.baseMin, baseMax: c.baseMax, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                    }
                    // Previous step: only baseMax existed
                    if (c.baseMax !== undefined && c.baseMin === undefined) {
                        return { baseMin: Number(c.baseMax) / 1.5, baseMax: c.baseMax, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                    }
                    // Oldest: only baseMin existed
                    if (c.baseMin !== undefined && c.baseMax === undefined) {
                        return { baseMin: c.baseMin, baseMax: Number(c.baseMin) * 1.5, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                    }
                    return { baseMin: 0, baseMax: 0, attackSpeed: c.attackSpeed ?? 1, keywords: [] };
                });
                setDamageCalculators(converted);
            }
            if (parsedState.globalCheckedConditions) setGlobalCheckedConditions(parsedState.globalCheckedConditions);
            if (parsedState.vuln !== undefined) setVuln(parsedState.vuln);
            if (parsedState.modifierChartTypeEnabled != null && typeof parsedState.modifierChartTypeEnabled === "object") {
                const raw = { ...(parsedState.modifierChartTypeEnabled as Record<string, boolean>) };
                const heroName = (parsedState.selectedHero as string) || "Angela";
                const defs = slot1LegendDefaultsForHero(heroName);
                for (const t of MODIFIER_SLOT1_PRIMARY) {
                    if (raw[t] === undefined) raw[t] = defs[t];
                }
                setModifierChartTypeEnabled(raw);
            }
            console.log("State loaded successfully.");
            showToast("Loaded");
        } catch (error) {
            console.error("Failed to load state:", error);
            showToast("Load Failed");
        }
    };

    const getCurrentState = () => ({
        selectedHero,
        heroLevel,
        combatState,
        heroAttributes,
        infinityAttributes,
        items,
        infinity,
        pointsRemaining,
        ranks,
        usedPerGem,
        synergy,
        activatedHeroes,
        damageCalculators,
        globalCheckedConditions,
        vuln,
        modifierChartTypeEnabled,
    });

    const applyLoadedState = (parsedState: any) => {
        if (parsedState.selectedHero) setSelectedHero(parsedState.selectedHero);
        if (parsedState.heroLevel) setHeroLevel(parsedState.heroLevel);
        if (parsedState.combatState !== undefined) setCombatState(parsedState.combatState);
        if (parsedState.heroAttributes) setHeroAttributes(parsedState.heroAttributes);
        if (parsedState.infinityAttributes) setInfinityAttributes(parsedState.infinityAttributes);
        if (parsedState.items) {
            const itemsWithEnabled = parsedState.items.map((item: any) => ({
                ...item,
                enabled: item.enabled !== undefined ? item.enabled : true
            }));
            setItems(itemsWithEnabled);
        }
        if (parsedState.infinity) setInfinity(parsedState.infinity);
        if (parsedState.pointsRemaining !== undefined) setPointsRemaining(parsedState.pointsRemaining);
        if (parsedState.ranks) setRanks(parsedState.ranks);
        if (parsedState.usedPerGem) setUsedPerGem(parsedState.usedPerGem);
        if (parsedState.synergy) setSynergy(parsedState.synergy);
        if (parsedState.activatedHeroes) setActivatedHeroes(parsedState.activatedHeroes);
        if (parsedState.damageCalculators && parsedState.damageCalculators.length) {
            const converted = parsedState.damageCalculators.map((c: any) => {
                if (c.baseMin !== undefined && c.baseMax !== undefined) {
                    return { baseMin: c.baseMin, baseMax: c.baseMax, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                }
                if (c.baseMax !== undefined && c.baseMin === undefined) {
                    return { baseMin: Number(c.baseMax) / 1.5, baseMax: c.baseMax, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                }
                if (c.baseMin !== undefined && c.baseMax === undefined) {
                    return { baseMin: c.baseMin, baseMax: Number(c.baseMin) * 1.5, attackSpeed: c.attackSpeed ?? 1, keywords: c.keywords ?? c.tags ?? [] };
                }
                return { baseMin: 0, baseMax: 0, attackSpeed: c.attackSpeed ?? 1, keywords: [] };
            });
            setDamageCalculators(converted);
        }
        if (parsedState.globalCheckedConditions) setGlobalCheckedConditions(parsedState.globalCheckedConditions);
        if (parsedState.vuln !== undefined) setVuln(parsedState.vuln);
        if (parsedState.modifierChartTypeEnabled != null && typeof parsedState.modifierChartTypeEnabled === "object") {
            const raw = { ...(parsedState.modifierChartTypeEnabled as Record<string, boolean>) };
            const heroName = (parsedState.selectedHero as string) || "Angela";
            const defs = slot1LegendDefaultsForHero(heroName);
            for (const t of MODIFIER_SLOT1_PRIMARY) {
                if (raw[t] === undefined) raw[t] = defs[t];
            }
            setModifierChartTypeEnabled(raw);
        }
    };

    const exportStateToFile = () => {
        try {
            const data = JSON.stringify(getCurrentState(), null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mho-calc-save-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Downloaded");
        } catch (error) {
            console.error("Failed to export state:", error);
            showToast("Export Failed");
        }
    };

    const importStateFromFile = async (file: File) => {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            applyLoadedState(parsed);
            localStorage.setItem("appState", JSON.stringify(parsed));
            showToast("Imported");
        } catch (error) {
            console.error("Failed to import state:", error);
            showToast("Import Failed");
        }
    };


    return (
        <>
            <Analytics />
            {/* Modal Overlay */}
            {infoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
                    <div ref={infoModalRef} className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            className="absolute top-2 right-4 text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
                            onClick={() => setInfoModalOpen(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        {/* MHO Calc Info */}
                        <div className="mb-4 text-xs text-center">
                            <p className="font-bold">MHO Calculator</p>
                            <p>by nimbus</p>
                            <br />
                            <p>MHServerEmu</p>
                            <p>Game Version: 1.52.0.1700 (2.16a)</p>
                        </div>
                        {/* Sources/Tools */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-center">
                            {/* Lace/Prinn */}
                            <div className="flex flex-col items-center">
                                <a className="underline" href="https://www.youtube.com/@WilfridWong" target="_blank" rel="noopener noreferrer">
                                    Lace / Wilfrid Wong
                                </a>
                                <span>Prinn's Spreadsheet</span>
                            </div>
                            {/* Alex Bond */}
                            <div className="flex flex-col items-center">
                                <a className="underline" href="https://github.com/AlexBond2/MHServerEmu/tree/v1.0" target="_blank" rel="noopener noreferrer">
                                    Database Browser - Alex Bond
                                </a>
                                <a className="underline" href="https://itembase.mhbugle.com/" target="_blank" rel="noopener noreferrer">
                                    Item Base - Alex Bond
                                </a>
                            </div>
                            {/* Crypto137 */}
                            <div className="flex flex-col items-center">
                                <a className="underline" href="https://github.com/Crypto137/MHDataParser" target="_blank" rel="noopener noreferrer">
                                    Data Parser - Crypto137
                                </a>
                            </div>
                        </div>
                        {/* Disclaimer */}
                        <div className="mt-4 text-xs text-center">
                            <span>
                                All Marvel-related visuals and characters shown here belong to Marvel Entertainment, LLC and Gazillion.
                                <br />
                                This website is fan-made, not an official Marvel or Gazillion project.
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {notesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8">
                    <div ref={notesModalRef} className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            className="absolute top-2 right-4 text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
                            onClick={() => setNotesModalOpen(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <div className="mb-4 text-xs">
                            <h1 className="flex items-center justify-center">Notes</h1>
                            <h2>To-Add: </h2>
                            <ul className="list-disc pl-6">
                                <li> Toughness Stat (Item Section)</li>
                                <li> Attribute Level Progression (Hero Section)</li>
                                <li> Blessings (Item Section)</li>
                                <li> Summoned Ally Stats</li>
                                <li> Avg. Effective Health</li>
                                <li> [Type] Brutal Strike (ex. Betty Ross' BigAss Sword)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            <div className="relative min-h-screen py-4 px-2 sm:py-8 sm:px-4 lg:py-12 lg:px-10">
                {/* Main Content */}
                <main>
                    {/* Toast */}
                    {toast.visible && (
                        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-3 py-2 rounded shadow">
                            {toast.message}
                        </div>
                    )}

                    {/* Desktop Layout */}
                    <div className="hidden xl:grid grid-cols-[290px_minmax(500px,_1fr)_345px] gap-4 items-start">
                        {/* Hero */}
                        <HeroSection
                            selectedHero={selectedHero} setSelectedHero={setSelectedHero}
                            onUserSelectHero={handleUserSelectHeroForModifiers}
                            heroLevel={heroLevel} setHeroLevel={setHeroLevel}
                            setCombatState={setCombatState}
                            setHeroAttributes={setHeroAttributes}
                            finalStats={finalStats}
                            setInfoModalOpen={setInfoModalOpen}
                            setNotesModalOpen={setNotesModalOpen}
                        />

                        {/* Main Content Tabs */}
                        <section className="flex-1 font-semibold">
                            {/* Tab/Header Modernized */}
                            <div className="sticky top-0 z-30 bg-[#081f39] backdrop-blur rounded-xl flex items-center px-4 gap-6 shadow-lg mb-1 py-2 border-b-2 border-blue-700/40">
                                {/* Tab Buttons Only */}
                                <nav className="flex gap-2 ml-6">
                                    <button
                                        onClick={() => setActiveTab("items")}
                                        className={`px-4 py-2 transition-colors duration-200 rounded-lg font-semibold text-base cursor-pointer ${activeTab === "items" ? "bg-blue-700/90 text-white shadow-md" : "text-sky-200 hover:bg-blue-800/50 hover:text-white"}`}
                                    >
                                        Items
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("infinity")}
                                        className={`px-4 py-2 transition-colors duration-200 rounded-lg font-semibold text-base cursor-pointer ${activeTab === "infinity" ? "bg-blue-700/90 text-white shadow-md" : "text-sky-200 hover:bg-blue-800/50 hover:text-white"}`}
                                    >
                                        Infinity
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("synergy")}
                                        className={`px-4 py-2 transition-colors duration-200 rounded-lg font-semibold text-base cursor-pointer ${activeTab === "synergy" ? "bg-blue-700/90 text-white shadow-md" : "text-sky-200 hover:bg-blue-800/50 hover:text-white"}`}
                                    >
                                        Synergy
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("modifiers")}
                                        className={`px-4 py-2 transition-colors duration-200 rounded-lg font-semibold text-base cursor-pointer ${activeTab === "modifiers" ? "bg-blue-700/90 text-white shadow-md" : "text-sky-200 hover:bg-blue-800/50 hover:text-white"}`}
                                    >
                                        Modifiers
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("damage")}
                                        className={`px-4 py-2 transition-colors duration-200 rounded-lg font-semibold text-base cursor-pointer ${activeTab === "damage" ? "bg-blue-700/90 text-white shadow-md" : "text-sky-200 hover:bg-blue-800/50 hover:text-white"}`}
                                    >
                                        Damage
                                    </button>
                                </nav>
                                <div className="ml-auto" />
                            </div>

                            {/* Tab Content */}
                            <div>
                                {activeTab === "items" && (
                                    <ItemsSection items={items} setItems={setItems} selectedHero={selectedHero} />
                                )}
                                {activeTab === "infinity" && (
                                    <InfinitySection
                                        infinity={infinity}
                                        setInfinity={setInfinity}
                                        infinityAttributes={infinityAttributes}
                                        setInfinityAttributes={setInfinityAttributes}
                                        pointsRemaining={pointsRemaining}
                                        setPointsRemaining={setPointsRemaining}
                                        ranks={ranks}
                                        setRanks={setRanks}
                                        usedPerGem={usedPerGem}
                                        setUsedPerGem={setUsedPerGem}
                                    />
                                )}
                                {activeTab === "synergy" && (
                                    <SynergySection
                                        heroLevel={heroLevel}
                                        synergy={synergy} setSynergy={setSynergy}
                                        activatedHeroes={activatedHeroes} setActivatedHeroes={setActivatedHeroes} />
                                )}
                                {activeTab === "damage" && (
                                    <DamageSection
                                        hero={hero ?? heroes[0]}
                                        finalStats={finalStats}
                                        heroLevel={heroLevel}
                                        heroKeywords={hero?.keywords ?? []}
                                        damageCalculators={damageCalculators}
                                        setDamageCalculators={setDamageCalculators}
                                        globalCheckedConditions={globalCheckedConditions}
                                        setGlobalCheckedConditions={setGlobalCheckedConditions}
                                        vuln={vuln}
                                        setVuln={setVuln}
                                    />
                                )}
                                {activeTab === "modifiers" && (
                                    <ModifierSection
                                        selectedHero={selectedHero}
                                        finalStats={finalStats}
                                        chartTypeEnabled={modifierChartTypeEnabled}
                                        onChartTypeEnabledChange={setModifierChartTypeEnabled}
                                    />
                                )}
                            </div>
                        </section>

                        {/* Stats */}
                        <StatsSection selectedHero={selectedHero}
                            finalStats={finalStats} onSave={saveState} onLoad={loadState} onExportFile={exportStateToFile} onImportFile={importStateFromFile} />
                    </div>

                    {/* Mobile/Tablet Layout */}
                    <div className="xl:hidden">
                        {/* Hero Section - Mobile */}
                        <div className="mb-6">
                            <HeroSection
                                selectedHero={selectedHero} setSelectedHero={setSelectedHero}
                                onUserSelectHero={handleUserSelectHeroForModifiers}
                                heroLevel={heroLevel} setHeroLevel={setHeroLevel}
                                setCombatState={setCombatState}
                                setHeroAttributes={setHeroAttributes}
                                finalStats={finalStats}
                                setInfoModalOpen={setInfoModalOpen}
                                setNotesModalOpen={setNotesModalOpen}
                            />
                        </div>

                        {/* Tab Headers - Mobile */}
                        <div className="sticky top-0 z-30 bg-[#081f39] backdrop-blur flex items-center gap-2 px-3 border-b border-blue-800/40 mb-4 overflow-x-auto py-2">
                            {/* Mobile: Tab Buttons Only */}
                            <button
                                onClick={() => setActiveTab("items")}
                                className={`px-3 py-2 transition-colors duration-200 rounded-lg text-xs font-semibold ${activeTab === "items" ? "bg-blue-700/90 text-white shadow" : "text-sky-200 hover:bg-blue-800/60 hover:text-white"}`}
                            >
                                Items
                            </button>
                            <button
                                onClick={() => setActiveTab("infinity")}
                                className={`px-3 py-2 transition-colors duration-200 rounded-lg text-xs font-semibold ${activeTab === "infinity" ? "bg-blue-700/90 text-white shadow" : "text-sky-200 hover:bg-blue-800/60 hover:text-white"}`}
                            >
                                Infinity
                            </button>
                            <button
                                onClick={() => setActiveTab("synergy")}
                                className={`px-3 py-2 transition-colors duration-200 rounded-lg text-xs font-semibold ${activeTab === "synergy" ? "bg-blue-700/90 text-white shadow" : "text-sky-200 hover:bg-blue-800/60 hover:text-white"}`}
                            >
                                Synergy
                            </button>
                            <button
                                onClick={() => setActiveTab("damage")}
                                className={`px-3 py-2 transition-colors duration-200 rounded-lg text-xs font-semibold ${activeTab === "damage" ? "bg-blue-700/90 text-white shadow" : "text-sky-200 hover:bg-blue-800/60 hover:text-white"}`}
                            >
                                Damage
                            </button>
                        </div>

                        {/* Tab Content - Mobile */}
                        <div className="mb-6">
                            {activeTab === "items" && (
                                <ItemsSection items={items} setItems={setItems} selectedHero={selectedHero} />
                            )}
                            {activeTab === "infinity" && (
                                <InfinitySection
                                    infinity={infinity}
                                    setInfinity={setInfinity}
                                    infinityAttributes={infinityAttributes}
                                    setInfinityAttributes={setInfinityAttributes}
                                    pointsRemaining={pointsRemaining}
                                    setPointsRemaining={setPointsRemaining}
                                    ranks={ranks}
                                    setRanks={setRanks}
                                    usedPerGem={usedPerGem}
                                    setUsedPerGem={setUsedPerGem}
                                />
                            )}
                            {activeTab === "synergy" && (
                                <SynergySection
                                    heroLevel={heroLevel}
                                    synergy={synergy} setSynergy={setSynergy}
                                    activatedHeroes={activatedHeroes} setActivatedHeroes={setActivatedHeroes} />
                            )}
                            {activeTab === "damage" && (
                                <DamageSection
                                    hero={hero ?? heroes[0]}
                                    finalStats={finalStats}
                                    heroLevel={heroLevel}
                                    heroKeywords={hero?.keywords ?? []}
                                    damageCalculators={damageCalculators}
                                    setDamageCalculators={setDamageCalculators}
                                    globalCheckedConditions={globalCheckedConditions}
                                    setGlobalCheckedConditions={setGlobalCheckedConditions}
                                    vuln={vuln}
                                    setVuln={setVuln}
                                />
                            )}
                        </div>

                        {/* Stats Section - Mobile */}
                        <StatsSection selectedHero={selectedHero}
                            finalStats={finalStats} onSave={saveState} onLoad={loadState} onExportFile={exportStateToFile} onImportFile={importStateFromFile} />
                    </div>
                </main >
            </div >
        </>
    );
}
