import { StyleSheet, View } from "react-native";

import { theme } from "../theme";
import { AppText } from "./AppText";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? (
        <AppText variant="eyebrow" color="primary">
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {description ? (
        <AppText variant="body" color="textMuted">
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm
  }
});

