import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { theme } from "../theme";

type AppCardProps = PropsWithChildren<{
  header?: ReactNode;
  tone?: "default" | "mint" | "accent";
  style?: ViewStyle;
}>;

export function AppCard({
  children,
  header,
  tone = "default",
  style
}: AppCardProps) {
  return (
    <View style={[styles.base, toneStyles[tone], style]}>
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#102722",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4
  }
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface
  },
  mint: {
    backgroundColor: theme.colors.surfaceTint,
    borderColor: "#d1e9df"
  },
  accent: {
    backgroundColor: theme.colors.surfaceAccent,
    borderColor: "#d6def7"
  }
});

