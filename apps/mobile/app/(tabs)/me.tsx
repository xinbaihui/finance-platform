import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppCard,
  AppScreen,
  AppText
} from "../../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../../src/config/api";
import { theme } from "../../src/theme";

const CURRENT_YEAR = 2026;

const metrics = [
  { title: "我的资产", key: "assetTotal", href: "/assets", tone: "asset" },
  { title: "年度收入", key: "annualIncome", href: "/planning-income", tone: "income" },
  { title: "年度支出", key: "annualExpense", href: "/planning-expense", tone: "expense" },
  { title: "储蓄目标", key: "savingTarget", href: "/savings", tone: "saving" }
] as const;

function MetricCard({
  title,
  value,
  href,
  tone
}: {
  title: string;
  value: string;
  href?: "/planning-income" | "/planning-expense" | "/assets" | "/savings";
  tone: "asset" | "income" | "expense" | "saving";
}) {
  return (
    <Pressable
      onPress={href ? () => router.push(href) : undefined}
      style={({ pressed }) => [
        styles.entryCard,
        toneStyles[tone],
        pressed && href && styles.entryPressed
      ]}
    >
      <View style={styles.entryCopy}>
        <AppText variant="subtitle">{title}</AppText>
        <View style={styles.metricValue}>
          <AppText variant="stat" color="primary">
            {value}
          </AppText>
          <AppText variant="bodySmall" color="textMuted">
            万元
          </AppText>
        </View>
      </View>
      <AppText variant="subtitle" color="textSubtle">
        ›
      </AppText>
    </Pressable>
  );
}

export default function MeTab() {
  const [name, setName] = useState("EllaXin");
  const [assetTotal, setAssetTotal] = useState(0);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [annualExpense, setAnnualExpense] = useState(0);
  const [savingTarget, setSavingTarget] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [
          profileResponse,
          assetsResponse,
          incomeResponse,
          expenseResponse,
          savingTargetResponse
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}`),
          fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/assets/current-value`),
          fetch(
            `${API_BASE_URL}/users/${DEMO_USER_ID}/annual-income?year=${CURRENT_YEAR}`
          ),
          fetch(
            `${API_BASE_URL}/users/${DEMO_USER_ID}/annual-expenses?year=${CURRENT_YEAR}`
          ),
          fetch(
            `${API_BASE_URL}/users/${DEMO_USER_ID}/annual-saving-target?year=${CURRENT_YEAR}`
          )
        ]);

        if (
          !profileResponse.ok ||
          !assetsResponse.ok ||
          !incomeResponse.ok ||
          !expenseResponse.ok ||
          !savingTargetResponse.ok
        ) {
          throw new Error("Failed to load profile data.");
        }

        const profilePayload = (await profileResponse.json()) as { name: string };
        const assetsPayload = (await assetsResponse.json()) as { total_amount: number };
        const incomePayload = (await incomeResponse.json()) as { total_amount: number };
        const expensePayload = (await expenseResponse.json()) as { total_amount: number };
        const savingTargetPayload = (await savingTargetResponse.json()) as {
          amount: number;
        };

        if (!cancelled) {
          setName(profilePayload.name);
          setAssetTotal(assetsPayload.total_amount);
          setAnnualIncome(incomePayload.total_amount);
          setAnnualExpense(expensePayload.total_amount);
          setSavingTarget(savingTargetPayload.amount);
        }
      } catch {
        if (!cancelled) {
          setName("EllaXin");
          setAssetTotal(0);
          setAnnualIncome(0);
          setAnnualExpense(0);
          setSavingTarget(0);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const assetTotalWan = useMemo(() => {
    return (assetTotal / 10000).toFixed(assetTotal >= 100000 ? 1 : 2);
  }, [assetTotal]);

  const annualIncomeWan = useMemo(() => {
    return (annualIncome / 10000).toFixed(annualIncome >= 100000 ? 1 : 2);
  }, [annualIncome]);

  const annualExpenseWan = useMemo(() => {
    return (annualExpense / 10000).toFixed(annualExpense >= 100000 ? 1 : 2);
  }, [annualExpense]);

  const savingTargetWan = useMemo(() => {
    return (savingTarget / 10000).toFixed(savingTarget >= 100000 ? 1 : 2);
  }, [savingTarget]);

  const metricValues = {
    assetTotal: assetTotalWan,
    annualIncome: annualIncomeWan,
    annualExpense: annualExpenseWan,
    savingTarget: savingTargetWan
  } as const;

  return (
    <AppScreen scrollable>
      <AppCard>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <AppText variant="subtitle" color="primaryDark">
              E
            </AppText>
          </View>
          <View style={styles.profileCopy}>
            <AppText variant="title">
              {name}
            </AppText>
          </View>
        </View>
      </AppCard>

      <View style={styles.metricGroup}>
        {metrics.map((item) => (
          <MetricCard
            key={item.key}
            title={item.title}
            value={metricValues[item.key]}
            href={item.href}
            tone={item.tone}
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceTint
  },
  profileCopy: {
    gap: theme.spacing.xs,
    flex: 1
  },
  metricGroup: {
    gap: theme.spacing.md
  },
  metricValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    shadowColor: "#102722",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3
  },
  entryCopy: {
    flex: 1,
    gap: theme.spacing.xs
  },
  entryPressed: {
    opacity: 0.9
  }
});

const toneStyles = StyleSheet.create({
  asset: {
    backgroundColor: "#edf8f2",
    borderColor: "#d6eadf"
  },
  income: {
    backgroundColor: "#eef4ff",
    borderColor: "#d8e3fb"
  },
  expense: {
    backgroundColor: "#fff4eb",
    borderColor: "#f2dfcc"
  },
  saving: {
    backgroundColor: "#f1fbf7",
    borderColor: "#d7eee4"
  }
});
