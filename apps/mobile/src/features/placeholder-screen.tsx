import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  SectionHeader,
  StatCard
} from "../components";
import { theme } from "../theme";

type PlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCardTitle: string;
  primaryCardBody: string;
  secondaryLabel: string;
  secondaryValue: string;
  secondaryMeta: string;
  tertiaryLabel: string;
  tertiaryValue: string;
  tertiaryMeta: string;
};

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  primaryCardTitle,
  primaryCardBody,
  secondaryLabel,
  secondaryValue,
  secondaryMeta,
  tertiaryLabel,
  tertiaryValue,
  tertiaryMeta
}: PlaceholderScreenProps) {
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <AppScreen
      scrollable
      header={hasHeader ? (
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
      ) : undefined}
    >
      <AppCard tone="mint">
        <AppText variant="eyebrow" color="primary">
          {primaryCardTitle}
        </AppText>
        <AppText variant="body" color="textMuted">
          {primaryCardBody}
        </AppText>
      </AppCard>

      <View style={styles.statsRow}>
        <StatCard
          label={secondaryLabel}
          value={secondaryValue}
          meta={secondaryMeta}
        />
        <StatCard
          label={tertiaryLabel}
          value={tertiaryValue}
          meta={tertiaryMeta}
          tone="accent"
        />
      </View>

      <AppCard>
        <AppText variant="subtitle">Ready for the next step</AppText>
        <AppText variant="body" color="textMuted">
          The navigation shell is now in place, so we can start building each
          tab as a real product screen instead of a standalone mock.
        </AppText>
        <View style={styles.buttonRow}>
          <AppButton label="Primary path" />
          <AppButton label="Secondary path" tone="secondary" />
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
