import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppInput,
  AppScreen,
  AppText
} from "../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../src/config/api";
import { theme } from "../src/theme";

const CURRENT_YEAR = 2026;

export default function SavingsScreen() {
  const [targetSaving, setTargetSaving] = useState("60000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSaving() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${DEMO_USER_ID}/annual-saving?year=${CURRENT_YEAR}`
        );
        if (!response.ok) {
          throw new Error("Failed to load savings.");
        }

        const payload = (await response.json()) as {
          target_amount: number;
        };

        if (!cancelled) {
          setTargetSaving(String(payload.target_amount));
        }
      } catch {
        if (!cancelled) {
          setSaveMessage("暂时无法加载储蓄信息，先显示本地默认值。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSaving();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${DEMO_USER_ID}/annual-saving`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            year: CURRENT_YEAR,
            target_amount: Number(targetSaving || "0"),
            current_amount: 0
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save savings.");
      }

      setSaveMessage("储蓄信息已保存。");
      router.replace("/(tabs)/me");
    } catch {
      setSaveMessage("保存失败，请确认服务端是否正常运行。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen
      scrollable
      header={
        <View style={styles.headerGroup}>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => router.replace("/(tabs)/me")}
              style={({ pressed }) => [styles.iconButton, pressed && styles.backPressed]}
            >
              <AppText variant="subtitle" color="primaryDark">
                ‹
              </AppText>
            </Pressable>
            <AppText variant="subtitle">储蓄</AppText>
          </View>
        </View>
      }
    >
      {loading ? (
        <AppText variant="bodySmall" color="textMuted">
          正在加载储蓄信息...
        </AppText>
      ) : null}

      <View style={styles.formGroup}>
        <AppInput
          label="目标储蓄"
          value={targetSaving}
          onChangeText={setTargetSaving}
          placeholder="例如 60000"
          suffix="元"
        />
      </View>

      <AppButton
        label={saving ? "保存中..." : "保存"}
        style={styles.saveButton}
        onPress={handleSave}
      />
      {saveMessage ? (
        <AppText variant="bodySmall" color="textMuted">
          {saveMessage}
        </AppText>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerGroup: {
    gap: theme.spacing.md
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  backPressed: {
    opacity: 0.86
  },
  formGroup: {
    gap: theme.spacing.lg
  },
  saveButton: {
    marginTop: theme.spacing.xs
  }
});
