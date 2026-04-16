import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppCard,
  AppInput,
  AppScreen,
  AppText
} from "../src/components";
import { theme } from "../src/theme";

function parseAmount(value: string) {
  const normalized = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatWan(value: number) {
  const wanValue = value / 10000;
  return wanValue.toFixed(wanValue >= 10 ? 1 : 2);
}

export default function AssetsScreen() {
  const [cash, setCash] = useState("30000");
  const [deposit, setDeposit] = useState("50000");
  const [funds, setFunds] = useState("28000");
  const [stocks, setStocks] = useState("20000");
  const [creditDebt, setCreditDebt] = useState("6800");

  const totalAssets = useMemo(() => {
    return [cash, deposit, funds, stocks].reduce(
      (sum, item) => sum + parseAmount(item),
      0
    );
  }, [cash, deposit, funds, stocks]);

  return (
    <AppScreen
      scrollable
      header={
        <View style={styles.headerGroup}>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => router.replace("/(tabs)/me")}
              style={({ pressed }) => [styles.iconButton, pressed && styles.backPressed]}
            >
              <AppText variant="subtitle" color="primaryDark">
                ‹
              </AppText>
            </Pressable>
            <AppText variant="subtitle">资产信息</AppText>
          </View>
          <AppText variant="body" color="textMuted">
            Keep a lightweight picture of your available assets and short-term
            liabilities so the app can understand your current financial base.
          </AppText>
        </View>
      }
    >
      <View style={styles.summaryRow}>
        <AppCard tone="mint" style={styles.summaryCard}>
          <AppText variant="eyebrow" color="textSubtle">
            总资产
          </AppText>
          <View style={styles.summaryValueGroup}>
            <AppText variant="heroNumber" color="primary">
              {formatWan(totalAssets)}
            </AppText>
            <AppText variant="bodySmall" color="textMuted">
              万元
            </AppText>
          </View>
        </AppCard>

        <AppCard tone="accent" style={styles.summaryCard}>
          <AppText variant="eyebrow" color="textSubtle">
            待还款项
          </AppText>
          <View style={styles.summaryValueGroup}>
            <AppText variant="heroNumber" color="primary">
              {formatWan(parseAmount(creditDebt))}
            </AppText>
            <AppText variant="bodySmall" color="textMuted">
              万元
            </AppText>
          </View>
        </AppCard>
      </View>

      <AppCard>
        <AppText variant="subtitle">资产信息</AppText>
        <AppText variant="bodySmall" color="textMuted">
          先录入比较常见的资产类型，后面如果需要，我们再支持更多资产科目。
        </AppText>
        <View style={styles.formGroup}>
          <AppInput
            label="现金"
            value={cash}
            onChangeText={setCash}
            placeholder="例如 30000"
            suffix="元"
          />
          <AppInput
            label="存款"
            value={deposit}
            onChangeText={setDeposit}
            placeholder="例如 50000"
            suffix="元"
          />
          <AppInput
            label="基金"
            value={funds}
            onChangeText={setFunds}
            placeholder="例如 28000"
            suffix="元"
          />
          <AppInput
            label="股票"
            value={stocks}
            onChangeText={setStocks}
            placeholder="例如 20000"
            suffix="元"
          />
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">负债信息</AppText>
        <AppText variant="bodySmall" color="textMuted">
          先记录短期最常见的待还款项，便于后续一起分析净资产和资金压力。
        </AppText>
        <View style={styles.formGroup}>
          <AppInput
            label="信用卡待还"
            value={creditDebt}
            onChangeText={setCreditDebt}
            placeholder="例如 6800"
            suffix="元"
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerGroup: {
    gap: theme.spacing.md
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  backPressed: {
    opacity: 0.86
  },
  summaryRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  summaryCard: {
    flex: 1,
    minHeight: 156
  },
  summaryValueGroup: {
    gap: theme.spacing.xs
  },
  formGroup: {
    gap: theme.spacing.lg
  }
});

