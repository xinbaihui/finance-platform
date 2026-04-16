import { StyleSheet, View } from "react-native";

import { theme } from "../theme";
import { AppCard } from "./AppCard";
import { AppText } from "./AppText";

type StatCardProps = {
  label: string;
  value: string;
  meta?: string;
  tone?: "default" | "mint" | "accent";
};

export function StatCard({
  label,
  value,
  meta,
  tone = "default"
}: StatCardProps) {
  return (
    <AppCard tone={tone} style={styles.card}>
      <AppText variant="eyebrow" color="textSubtle">
        {label}
      </AppText>
      <AppText variant="stat">{value}</AppText>
      {meta ? (
        <AppText variant="bodySmall" color="textMuted">
          {meta}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 150
  }
});

