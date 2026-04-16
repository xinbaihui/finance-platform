import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppCard,
  AppScreen,
  AppText
} from "../../src/components";
import { theme } from "../../src/theme";

const profile = {
  name: "Ellaxin",
  subtitle: "平衡型建议 · 关注重点：储蓄与现金流",
  annualGoal: "今年目标：存够 ¥60,000"
};

const quickStats = [
  {
    label: "当前资产",
    value: "12.8",
    unit: "万元"
  },
  {
    label: "目标存入",
    value: "6.0",
    unit: "万元"
  }
] as const;

const targetProgress = {
  current: 128000,
  goal: 200000
};

const shortcuts = [
  {
    title: "年度财务规划",
    description: "收入、固定支出、储蓄目标与大额支出计划"
  },
  {
    title: "资产信息",
    description: "现金、存款、基金 / 股票与待还款项"
  }
] as const;

function EntryCard({
  title,
  description,
  href
}: {
  title: string;
  description: string;
  href?: "/planning" | "/assets";
}) {
  return (
    <Pressable
      onPress={href ? () => router.push(href) : undefined}
      style={({ pressed }) => [styles.entryCard, pressed && styles.entryPressed]}
    >
      <View style={styles.entryCopy}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="bodySmall" color="textMuted">
          {description}
        </AppText>
      </View>
      <AppText variant="subtitle" color="textSubtle">
        ›
      </AppText>
    </Pressable>
  );
}

export default function MeTab() {
  const completionRate = Math.min(
    targetProgress.current / targetProgress.goal,
    1
  );

  return (
    <AppScreen scrollable>
      <AppCard style={styles.profileCard}>
        <View style={styles.profileCopy}>
          <AppText variant="title" color="white">
            {profile.name}
          </AppText>
          <AppText variant="body" color="white" style={styles.profileBody}>
            {profile.subtitle}
          </AppText>
          <AppText variant="bodySmall" color="white" style={styles.profileGoal}>
            {profile.annualGoal}
          </AppText>
        </View>
      </AppCard>

      <View style={styles.quickStatsRow}>
        {quickStats.map((item) => (
          <View key={item.label} style={styles.quickStatItem}>
            <View style={styles.quickStatCircle}>
              <AppText variant="subtitle" color="primaryDark">
                {item.value}
              </AppText>
              <AppText variant="bodySmall" color="textMuted">
                {item.unit}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="textMuted">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>

      <AppCard tone="mint">
        <View style={styles.progressHeader}>
          <AppText variant="subtitle">目标完成度</AppText>
          <AppText variant="bodySmall" color="textMuted">
            {Math.round(completionRate * 100)}%
          </AppText>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(completionRate * 100, 8)}%` }
            ]}
          />
        </View>
        <AppText variant="bodySmall" color="textMuted">
          当前资产 ¥128,000 / 目标存入 ¥200,000
        </AppText>
      </AppCard>

      <View style={styles.shortcutGroup}>
        {shortcuts.map((item) => (
          <EntryCard
            key={item.title}
            title={item.title}
            description={item.description}
            href={
              item.title === "年度财务规划"
                ? "/planning"
                : item.title === "资产信息"
                  ? "/assets"
                  : undefined
            }
          />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark
  },
  profileCopy: {
    gap: theme.spacing.xs
  },
  profileBody: {
    color: "rgba(255,255,255,0.82)"
  },
  profileGoal: {
    color: "rgba(255,255,255,0.72)",
    marginTop: theme.spacing.xs
  },
  shortcutGroup: {
    gap: theme.spacing.md
  },
  quickStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.lg
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.sm
  },
  quickStatCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: "#d1e9df",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    shadowColor: "#102722",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressTrack: {
    height: 12,
    borderRadius: theme.radii.pill,
    backgroundColor: "#dcefe8",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary
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
