import type { PropsWithChildren, ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { theme } from "../theme";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  header?: ReactNode;
}>;

export function AppScreen({
  children,
  scrollable = false,
  header
}: AppScreenProps) {
  const content = (
    <View style={styles.content}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  scrollContent: {
    flexGrow: 1
  }
});

