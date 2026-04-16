import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  SectionHeader,
  StatCard
} from "../src/components";
import { theme } from "../src/theme";

export default function Index() {
  return (
    <AppScreen
      scrollable
      header={
        <SectionHeader
          eyebrow="Finance Agent"
          title="Mobile design foundation is ready."
          description="This is a starter screen for the app theme and base components. We can now build the real product pages on top of a shared visual system."
        />
      }
    >
      <AppCard tone="mint">
        <AppText variant="eyebrow" color="primary">
          Design Direction
        </AppText>
        <AppText variant="subtitle">
          Warm neutral backgrounds with deep green emphasis.
        </AppText>
        <AppText variant="body" color="textMuted">
          The goal is to keep the product feeling calm and premium instead of
          looking like a generic dashboard.
        </AppText>
      </AppCard>

      <View style={styles.statsRow}>
        <StatCard label="Primary" value="#17332E" meta="Core text + buttons" />
        <StatCard
          label="Accent"
          value="#0F766E"
          meta="Highlights + emphasis"
          tone="accent"
        />
      </View>

      <AppCard>
        <AppText variant="subtitle">Base components included</AppText>
        <AppText variant="body" color="textMuted">
          AppScreen, AppText, AppCard, AppButton, SectionHeader, and StatCard
          are ready for reuse across chat, analysis, profile, and planning
          screens.
        </AppText>
        <View style={styles.buttonRow}>
          <AppButton label="Primary action" />
          <AppButton label="Secondary" tone="secondary" />
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm
  }
});
