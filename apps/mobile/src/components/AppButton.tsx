import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { theme } from "../theme";
import { AppText } from "./AppText";

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  tone?: "primary" | "secondary";
  style?: ViewStyle;
};

export function AppButton({
  label,
  onPress,
  icon,
  tone = "primary",
  style
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        toneStyles[tone],
        pressed && styles.pressed,
        style
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <AppText
          variant="bodySmall"
          color={tone === "primary" ? "white" : "primaryDark"}
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  label: {
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.88
  }
});

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primaryDark
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  }
});

