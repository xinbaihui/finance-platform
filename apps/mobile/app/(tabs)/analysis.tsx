import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppCard,
  AppScreen,
  AppText
} from "../../src/components";
import { theme } from "../../src/theme";

type Scope = "yearly" | "monthly";

const CURRENT_YEAR = 2026;
const CURRENT_MONTH = 4;
const yearlyOptions = [CURRENT_YEAR];
const monthlyOptions = Array.from({ length: CURRENT_MONTH }, (_, index) => index + 1);

const yearlyMetrics = {
  income: "7.2 万元",
  expense: "3.2 万元",
  saved: "1.9 万元",
  target: "31%"
};

const monthlyMetrics = {
  income: "1.8 万元",
  expense: "0.8 万元",
  saved: "0.5 万元",
  target: "67%"
};

const categories = [
  {
    name: "住房",
    amount: "1.23 万元",
    ratio: 38,
    color: "#ef6a5b"
  },
  {
    name: "餐饮",
    amount: "0.78 万元",
    ratio: 24,
    color: "#2563eb"
  },
  {
    name: "购物",
    amount: "0.58 万元",
    ratio: 18,
    color: "#f59e0b"
  },
  {
    name: "其他",
    amount: "0.65 万元",
    ratio: 20,
    color: "#10b981"
  }
] as const;

const insights = [
  "住房占比稳定，但餐饮与购物仍是超支主因。",
  "按当前支出速度，全年预计支出 97,200，较年度预算超支 9,200。",
  "若接下来两个月减少高频可变支出，年度储蓄目标仍有机会追回。"
] as const;

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

export default function AnalysisTab() {
  const [scope, setScope] = useState<Scope>("yearly");
  const [selectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);

  const metrics = useMemo(
    () => (scope === "yearly" ? yearlyMetrics : monthlyMetrics),
    [scope]
  );

  return (
    <AppScreen scrollable>
      <View style={styles.pageHeader}>
        <AppText variant="body" style={styles.pageTitle}>
          精准分析
        </AppText>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.scopeSwitch}>
          <Pressable
            onPress={() => setScope("yearly")}
            style={[
              styles.scopeButton,
              scope === "yearly" && styles.scopeButtonActive
            ]}
          >
            <AppText
              variant="bodySmall"
              color={scope === "yearly" ? "white" : "textMuted"}
            >
              年度
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setScope("monthly")}
            style={[
              styles.scopeButton,
              scope === "monthly" && styles.scopeButtonActive
            ]}
          >
            <AppText
              variant="bodySmall"
              color={scope === "monthly" ? "white" : "textMuted"}
            >
              月度
            </AppText>
          </Pressable>
        </View>

        <View style={styles.dropdownWrap}>
          {scope === "yearly" ? (
            <View style={styles.dropdownContainer}>
              <Pressable
                onPress={() => setYearMenuOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.dropdownTrigger,
                  pressed && styles.dropdownPressed
                ]}
              >
                <AppText variant="bodySmall" color="textMuted">
                  {selectedYear} 年
                </AppText>
                <AppText variant="bodySmall" color="textSubtle">
                  ▾
                </AppText>
              </Pressable>
              {yearMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {yearlyOptions.map((year) => (
                    <Pressable
                      key={year}
                      onPress={() => setYearMenuOpen(false)}
                      style={styles.dropdownItem}
                    >
                      <AppText variant="bodySmall">{year} 年</AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.dropdownContainer}>
              <Pressable
                onPress={() => setMonthMenuOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.dropdownTrigger,
                  pressed && styles.dropdownPressed
                ]}
              >
                <AppText variant="bodySmall" color="textMuted">
                  {selectedMonth} 月
                </AppText>
                <AppText variant="bodySmall" color="textSubtle">
                  ▾
                </AppText>
              </Pressable>
              {monthMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {monthlyOptions.map((month) => (
                    <Pressable
                      key={month}
                      onPress={() => {
                        setSelectedMonth(month);
                        setMonthMenuOpen(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <AppText variant="bodySmall">{month} 月</AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={styles.metricGrid}>
        <AppCard tone="mint" style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            {scope === "yearly" ? "年度总收入" : "本月收入"}
          </AppText>
          <AmountValue value={metrics.income} />
        </AppCard>

        <AppCard tone="accent" style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            {scope === "yearly" ? "年度总支出" : "本月支出"}
          </AppText>
          <AmountValue value={metrics.expense} />
        </AppCard>
      </View>

      <View style={styles.metricGrid}>
        <AppCard style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            {scope === "yearly" ? "年度已储蓄" : "本月结余"}
          </AppText>
          <AmountValue value={metrics.saved} />
        </AppCard>

        <AppCard style={styles.metricCard}>
          <AppText variant="eyebrow" color="textSubtle">
            目标完成
          </AppText>
          <AppText variant="stat">{metrics.target}</AppText>
        </AppCard>
      </View>

      <AppCard>
        <AppText variant="subtitle">支出结构</AppText>
        <AppText variant="bodySmall" color="textMuted">
          先用比例条展示主要支出分类，后面可以升级成饼图和趋势图。
        </AppText>
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
        </View>
      </AppCard>

      <AppCard tone="mint">
        <AppText variant="subtitle">全年预测</AppText>
        <View style={styles.forecastBlock}>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              预计全年支出
            </AppText>
            <InlineAmountValue value="9.7 万元" />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              预计超支
            </AppText>
            <InlineAmountValue value="0.9 万元" />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              年底预计储蓄
            </AppText>
            <InlineAmountValue value="5.6 万元" />
          </View>
          <View style={styles.forecastRow}>
            <AppText variant="body" color="textMuted">
              离年度目标还差
            </AppText>
            <InlineAmountValue value="0.4 万元" />
          </View>
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">AI 洞察</AppText>
        <View style={styles.insightList}>
          {insights.map((item) => (
            <View key={item} style={styles.insightItem}>
              <View style={styles.insightMarker} />
              <AppText variant="bodySmall" color="textMuted" style={styles.insightText}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
    zIndex: 30
  },
  pageHeader: {
    alignItems: "center"
  },
  pageTitle: {
    textAlign: "center"
  },
  scopeSwitch: {
    flexDirection: "row",
    padding: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  scopeButton: {
    minWidth: 72,
    minHeight: 36,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  scopeButtonActive: {
    backgroundColor: theme.colors.primaryDark
  },
  dropdownWrap: {
    alignItems: "flex-end",
    flex: 1,
    zIndex: 40
  },
  dropdownContainer: {
    position: "relative",
    minWidth: 108,
    zIndex: 50
  },
  dropdownTrigger: {
    minHeight: 36,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  dropdownPressed: {
    opacity: 0.9
  },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 108,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    shadowColor: "#102722",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    zIndex: 10
  },
  dropdownItem: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    alignItems: "flex-start",
    justifyContent: "center"
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
