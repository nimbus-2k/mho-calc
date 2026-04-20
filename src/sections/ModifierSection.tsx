import { useCallback, useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { heroes } from "../data/heroes";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type ModifierSectionProps = {
    selectedHero: string;
    finalStats: Record<string, number>;
    chartTypeEnabled: Record<string, boolean>;
    onChartTypeEnabledChange: Dispatch<SetStateAction<Record<string, boolean>>>;
};

const SLOT1 = ["Physical", "Energy", "Mental"] as const;
const SLOT2 = ["Melee", "Ranged"] as const;
const SLOT3 = ["Area", "Movement", "Signature"];
const SLOT4 = ["Summon", "None"] as const;

const ALL_TYPES = [
    "Physical", "Energy", "Mental",
    "Melee", "Ranged",
    "Area", "Movement", "Signature",
    "Summon",
];

const COLORS: Record<string, string> = {
    Physical: "#D4537E",
    Energy: "#378ADD",
    Mental: "#7F77DD",
    Melee: "#1D9E75",
    Ranged: "#639922",
    Area: "#BA7517",
    Movement: "#EF9F27",
    Signature: "#D85A30",
    Summon: "#888780",
};

function isSlot1Type(type: string): type is (typeof SLOT1)[number] {
    return (SLOT1 as readonly string[]).includes(type);
}

function allSubsets(arr: string[]): string[][] {
    const res: string[][] = [[]];
    for (const el of arr) {
        const len = res.length;
        for (let i = 0; i < len; i++) res.push([...res[i], el]);
    }
    return res;
}

export default function ModifierSection({
    selectedHero,
    finalStats = {},
    chartTypeEnabled,
    onChartTypeEnabledChange,
}: ModifierSectionProps) {
    const slot3Combos = useMemo(() => allSubsets(SLOT3), []);

    const slot1IncludedFromHero = useMemo(() => {
        const slot1Lower = new Set(SLOT1.map((t) => t.toLowerCase()));
        const raw = heroes.find((h) => h.name === selectedHero)?.damageType ?? [];
        return new Set(
            raw.map((t) => t.trim().toLowerCase()).filter((t) => slot1Lower.has(t))
        );
    }, [selectedHero]);

    const isPrimaryLayerVisible = useCallback(
        (type: string) => {
            if (!isSlot1Type(type)) return chartTypeEnabled[type] !== false;
            const v = chartTypeEnabled[type];
            if (v === false) return false;
            if (v === true) return true;
            if (slot1IncludedFromHero.size === 0) return true;
            return slot1IncludedFromHero.has(type.toLowerCase());
        },
        [chartTypeEnabled, slot1IncludedFromHero]
    );

    const allCombos = useMemo(() => {
        const result: { label: string; types: string[] }[] = [];
        for (const s1 of SLOT1) {
            for (const s2 of SLOT2) {
                for (const s3 of slot3Combos) {
                    for (const s4 of SLOT4) {
                        const types = [
                            s1,
                            s2,
                            ...s3,
                            ...(s4 !== "None" ? [s4] : []),
                        ];
                        result.push({ label: types.join(", "), types });
                    }
                }
            }
        }
        return result;
    }, [slot3Combos]);

    const usedTypes = useMemo(() => {
        const used = new Set<string>();

        for (const type of SLOT1) {
            const value = finalStats[`Total ${type} DMG%`] ?? 0;
            const inHeroDefault =
                slot1IncludedFromHero.size === 0 ||
                slot1IncludedFromHero.has(type.toLowerCase());
            const userTurnedOn = chartTypeEnabled[type] === true;
            if (value > 0 || inHeroDefault || userTurnedOn) {
                for (const combo of allCombos) {
                    if (combo.types.includes(type)) {
                        used.add(type);
                        break;
                    }
                }
            }
        }

        for (const type of ALL_TYPES) {
            if ((SLOT1 as readonly string[]).includes(type)) continue;
            const value = finalStats[`Total ${type} DMG%`] ?? 0;
            if (value <= 0) continue;

            for (const combo of allCombos) {
                if (combo.types.includes(type)) {
                    used.add(type);
                    break;
                }
            }
        }

        return Array.from(used);
    }, [allCombos, chartTypeEnabled, finalStats, slot1IncludedFromHero]);

    useEffect(() => {
        if (usedTypes.length === 0) return;
        onChartTypeEnabledChange((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const type of usedTypes) {
                if (isSlot1Type(type)) continue;
                if (next[type] === undefined) {
                    next[type] = true;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [onChartTypeEnabledChange, usedTypes]);

    // Filter combos: every tag except Melee/Ranged must have non-zero DMG%.
    // Melee & Ranged may be zero — the bar still shows so you can compare combos.
    const validCombos = useMemo(() => {
        return allCombos.filter((combo) => {
            return combo.types.every((type) => {
                if ((SLOT2 as readonly string[]).includes(type)) return true;
                const value = finalStats[`Total ${type} DMG%`] ?? 0;
                return value > 0;
            });
        });
    }, [allCombos, finalStats]);

    const displayedCombos = useMemo(() => {
        const extraTypes = ALL_TYPES.filter((t) => !(SLOT1 as readonly string[]).includes(t));
        const hasAnyExtraTypeValue = extraTypes.some((t) => (finalStats[`Total ${t} DMG%`] ?? 0) > 0);

        // If there are no values for non-primary tags, show only {Physical/Energy/Mental}
        if (!hasAnyExtraTypeValue) {
            const out: Array<{ label: string; types: string[] }> = [];
            for (const type of SLOT1) {
                const inHeroDefault =
                    slot1IncludedFromHero.size === 0 ||
                    slot1IncludedFromHero.has(type.toLowerCase());
                const userTurnedOn = chartTypeEnabled[type] === true;

                if (!isPrimaryLayerVisible(type)) continue;
                if (!inHeroDefault && !userTurnedOn) continue;

                out.push({ label: type, types: [type] });
            }
            return out;
        }

        return validCombos.filter((combo) => {
            const containsHiddenType = combo.types.some((type) =>
                isSlot1Type(type)
                    ? !isPrimaryLayerVisible(type)
                    : chartTypeEnabled[type] === false
            );
            if (containsHiddenType) return false;

            const slot1TypesInCombo = combo.types.filter(t => SLOT1.includes(t as any));
            return !slot1TypesInCombo.some(t => {
                const val = finalStats[`Total ${t} DMG%`] ?? 0;
                return val <= 0;
            });
        });
    }, [chartTypeEnabled, isPrimaryLayerVisible, validCombos, finalStats, slot1IncludedFromHero]);

    const handleLegendClick = useCallback((_e: unknown, legendItem: { text?: string }) => {
        const type = legendItem?.text;
        if (!type) return;

        onChartTypeEnabledChange((prev) => ({
            ...prev,
            [type]: !(prev[type] ?? true),
        }));
    }, [onChartTypeEnabledChange]);

    const chartData = useMemo(
        () => ({
            labels: displayedCombos.map((c) => c.label),
            datasets: usedTypes.map((type) => ({
                label: type,
                data: displayedCombos.map((c) => {
                    const value = finalStats[`Total ${type} DMG%`] ?? 0;

                    if (!c.types.includes(type)) return null;

                    return value > 0 ? parseFloat((value).toFixed(2)) : null;
                }),
                backgroundColor: COLORS[type] ?? "#888780",
                hidden: !isPrimaryLayerVisible(type),
                borderWidth: 0,
            })),
        }),
        [chartTypeEnabled, displayedCombos, finalStats, isPrimaryLayerVisible, usedTypes]
    );

    return (
        <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: displayedCombos.length * 22, height: 600 }}>
                <Bar
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        scales: {
                            x: {
                                stacked: true,
                                ticks: {
                                    font: { size: 12 },
                                    maxRotation: 90,
                                    autoSkip: false,
                                },
                                grid: { display: false },
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: {
                                    callback: (v) => `${v}%`,
                                },
                            },
                        },
                        plugins: {
                            legend: {
                                position: "top",
                                onClick: handleLegendClick,
                                labels: {
                                    boxWidth: 12,
                                    padding: 16,
                                    font: { size: 12 },
                                },
                            },
                            tooltip: {
                                filter: (item) => (item.parsed.y ?? 0) > 0,
                                callbacks: {
                                    label: (ctx) =>
                                        `${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(2)}%`,
                                    footer: (items) => {
                                        if (items.length === 0) return '';

                                        // Get the combo for this bar
                                        const comboIndex = items[0].dataIndex;
                                        const combo = displayedCombos[comboIndex];

                                        // Calculate total by summing all types in this combo
                                        const total = combo.types.reduce((sum, type) => {
                                            const value = finalStats[`Total ${type} DMG%`] ?? 0;
                                            return sum + (value > 0 ? value : 0);
                                        }, 0);

                                        return `Total: ${total.toFixed(2)}%`;
                                    },
                                },
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
}