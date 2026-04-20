import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  AppCard,
  AppScreen,
  AppText
} from "../../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../../src/config/api";
import { theme } from "../../src/theme";

type AnalysisCategory = {
  name: string;
  amount: number;
  ratio: number;
};

type AnalysisResponse = {
  metrics: {
    income: number;
    expense: number;
    saved: number;
    target_rate: number;
  };
  categories: AnalysisCategory[];
  forecast: {
    projected_year_expense: number;
    projected_overspend: number;
    projected_year_saving: number;
    target_gap: number;
  };
  insights: string[];
};

const CURRENT_YEAR = 2026;
const categoryColors = ["#ef6a5b", "#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4"];

function formatWan(value: number) {
  const wanValue = value / 10000;
  return `${wanValue.toFixed(wanValue >= 10 ? 1 : 2)} 万元`;
}

function AmountValue({ value }: { value: string }) {
  const [number, unit] = value.split(" ");

  return (
    <View style={styles.amountValue}>
      <AppText variant="stat">{number}</AppText>
      {unit ? (
        <AppText variant="bodySmall" color="textMuted">
          {unit}
        </AppText>
      ) : null}
    </View>
  );
}

function InlineAmountValue({ value }: { value: string }) {
  const [number, unit] = value.split(" ");

  return (
    <View style={styles.inlineAmountValue}>
      <AppText variant="body">{number}</AppText>
      {unit ? (
        <AppText variant="bodySmall" color="textMuted">
          {unit}
        </AppText>
      ) : null}
    </View>
  );
}

function PieChart({
  categories
}: {
  categories: Array<AnalysisCategory & { color: string; amount: string }>;
}) {
  const size = 156;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeRatio = 0;

  return (
    <View style={styles.pieChartWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2ece7"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {categories.map((item) => {
          const dash = (item.ratio / 100) * circumference;
          const gap = circumference - dash;
          const segment = (
            <Circle
              key={item.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-((cumulativeRatio / 100) * circumference)}
              strokeLinecap="butt"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          );
          cumulativeRatio += item.ratio;
          return segment;
        })}
      </Svg>
      <View style={styles.pieChartCenter}>
        <AppText variant="bodySmall" color="textMuted">
          支出
        </AppText>
        <AppText variant="subtitle">结构</AppText>
      </View>
    </View>
  );
}

export default function AnalysisTab() {
  const [selectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          year: String(selectedYear),
          scope: "yearly",
          month: "4"
        });
        const response = await fetch(
          `${API_BASE_URL}/users/${DEMO_USER_ID}/analysis?${query.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to load analysis.");
        }

        const payload = (await response.json()) as AnalysisResponse;
        if (!cancelled) {
          setAnalysis(payload);
        }
      } catch {
        if (!cancelled) {
          setError("暂时无法加载分析数据。");
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const metrics = useMemo(() => {
    if (!analysis) {
      return {
        income: "0.00 万元",
        expense: "0.00 万元",
        saved: "0.00 万元",
        target: "0%"
      };
    }

    return {
      income: formatWan(analysis.metrics.income),
      expense: formatWan(analysis.metrics.expense),
      saved: formatWan(analysis.metrics.saved),
      target: `${analysis.metrics.target_rate}%`
    };
  }, [analysis]);

  const categories = useMemo(() => {
    return (analysis?.categories ?? []).map((item, index) => ({
      ...item,
      amount: formatWan(item.amount),
      color: categoryColors[index % categoryColors.length]
    }));
  }, [analysis]);

  const forecast = useMemo(() => {
    if (!analysis) {
      return {
        projectedYearExpense: "0.00 万元",
        projectedOverspend: "0.00 万元",
        projectedYearSaving: "0.00 万元",
        targetGap: "0.00 万元"
      };
    }

    return {
      projectedYearExpense: formatWan(analysis.forecast.projected_year_expense),
      projectedOverspend: formatWan(analysis.forecast.projected_overspend),
      projectedYearSaving: formatWan(analysis.forecast.projected_year_saving),
      targetGap: formatWan(analysis.forecast.target_gap)
    };
  }, [analysis]);

  return (
    <AppScreen scrollable>
      <View style={styles.pageHeader}>
        <AppText variant="body" style={styles.pageTitle}>
          精准分析
        </AppText>
      </View>

      {loading ? (
        <AppText variant="bodySmall" color="textMuted">
          正在加载分析数据...
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="bodySmall" color="textMuted">
          {error}
        </AppText>
      ) : null}

      <View style={styles.metricGrid}>
        <AppCard tone="mint" style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            当前收入
          </AppText>
          <AmountValue value={metrics.income} />
        </AppCard>

        <AppCard tone="accent" style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            当前支出
          </AppText>
          <AmountValue value={metrics.expense} />
        </AppCard>
      </View>

      <AppCard>
        <View style={styles.progressHeader}>
          <AppText variant="eyebrow" color="textSubtle">
            当前储蓄
          </AppText>
          <InlineAmountValue value={metrics.saved} />
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: metrics.target
              }
            ]}
          />
        </View>
        <View style={styles.progressFooter}>
          <AppText variant="bodySmall" color="textMuted">
            目标完成
          </AppText>
          <AppText variant="bodySmall" color="textMuted">
            {metrics.target}
          </AppText>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">支出结构</AppText>
        {categories.length > 0 ? (
          <View style={styles.pieSection}>
            <PieChart categories={categories} />
          </View>
        ) : null}
        <View style={styles.categoryList}>
          {categories.map((item) => (
            <View key={item.name} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleWrap}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: item.color }]}
                  />
                  <AppText variant="body">{item.name}</AppText>
                </View>
                <View style={styles.categoryMeta}>
                  <InlineAmountValue value={item.amount} />
                  <AppText variant="bodySmall" color="textMuted">
                    ({item.ratio}%)
                  </AppText>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${item.ratio}%`,
                      backgroundColor: item.color
                    }
                  ]}
                />
              </View>
            </View>
          ))}
          {!loading && categories.length === 0 ? (
            <AppText variant="bodySmall" color="textMuted">
              暂无支出结构数据。
            </AppText>
          ) : null}
        </View>
      </AppCard>

      <AppCard tone="mint">
        <AppText variant="subtitle">全年预测</AppText>
        <View style={styles.forecastBlock}>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              预计全年支出
            </AppText>
            <InlineAmountValue value={forecast.projectedYearExpense} />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              预计超支
            </AppText>
            <InlineAmountValue value={forecast.projectedOverspend} />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              年底预计储蓄
            </AppText>
            <InlineAmountValue value={forecast.projectedYearSaving} />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              离年度目标还差
            </AppText>
            <InlineAmountValue value={forecast.targetGap} />
          </View>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">AI 洞察</AppText>
        <View style={styles.insightList}>
          {(analysis?.insights ?? []).map((item) => (
            <View key={item} style={styles.insightItem}>
              <View style={styles.insightMarker} />
              <AppText variant="bodySmall" color="textMuted" style={styles.insightText}>
                {item}
              </AppText>
            </View>
          ))}
          {!loading && (analysis?.insights.length ?? 0) === 0 ? (
            <AppText variant="bodySmall" color="textMuted">
              暂无洞察。
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    alignItems: "center"
  },
  pageTitle: {
    textAlign: "center"
  },
  metricGrid: {
    flexDirection: "row",
    gap: theme.spacing.md,
    zIndex: 1
  },
  metricCard: {
    flex: 1,
    minHeight: 134
  },
  amountValue: {
    alignItems: "flex-start",
    gap: 2
  },
  inlineAmountValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4
  },
  categoryList: {
    gap: theme.spacing.lg
  },
  pieSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm
  },
  pieChartWrap: {
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center"
  },
  pieChartCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  categoryItem: {
    gap: theme.spacing.sm
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  categoryTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  track: {
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: "#e2ece7",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: theme.radii.pill
  },
  forecastBlock: {
    gap: theme.spacing.md
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radii.pill,
    backgroundColor: "#e2ece7",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  forecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  insightList: {
    gap: theme.spacing.md
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  insightMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: theme.colors.primary
  },
  insightText: {
    flex: 1
  }
});
