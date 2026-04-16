import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { theme } from "../theme";

type TextVariant =
  | "eyebrow"
  | "title"
  | "subtitle"
  | "body"
  | "bodySmall"
  | "stat"
  | "heroNumber";

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
    color?: keyof typeof theme.colors;
  }
>;

const variantStyles: Record<TextVariant, TextStyle> = {
  eyebrow: {
    ...theme.typography.eyebrow,
    textTransform: "uppercase"
  },
  title: theme.typography.title,
  subtitle: theme.typography.subtitle,
  body: theme.typography.body,
  bodySmall: theme.typography.bodySmall,
  stat: theme.typography.stat,
  heroNumber: theme.typography.heroNumber
};

export function AppText({
  children,
  style,
  variant = "body",
  color = "text",
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        { color: theme.colors[color] },
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text
  }
});
