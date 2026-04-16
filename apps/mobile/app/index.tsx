import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Finance Agent</Text>
        <Text style={styles.title}>Mobile app scaffold is ready.</Text>
        <Text style={styles.body}>
          This screen stays intentionally minimal while we set up the monorepo,
          app boundaries, and shared foundation.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f3ee"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 12
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#0f766e"
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
    color: "#17332e"
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#567068"
  }
});

