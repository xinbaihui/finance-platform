import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppInput,
  AppScreen,
  AppText
} from "../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../src/config/api";
import { theme } from "../src/theme";

type ApiNamedAmount = {
  id: number;
  name: string;
  amount: number;
};

type AssetItem = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
};

function parseAmount(value: string) {
  const normalized = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

export default function AssetsScreen() {
  const [items, setItems] = useState<AssetItem[]>([
    {
      id: "cash",
      label: "现金",
      value: "30000",
      placeholder: "例如 30000"
    },
    {
      id: "deposit",
      label: "存款",
      value: "50000",
      placeholder: "例如 50000"
    },
    {
      id: "funds",
      label: "基金",
      value: "28000",
      placeholder: "例如 28000"
    },
    {
      id: "stocks",
      label: "股票",
      value: "20000",
      placeholder: "例如 20000"
    }
  ]);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/assets`);
        if (!response.ok) {
          throw new Error("Failed to load assets.");
        }

        const payload = (await response.json()) as { items: ApiNamedAmount[] };

        if (!cancelled && payload.items.length > 0) {
          setItems(
            payload.items.map((item) => ({
              id: String(item.id),
              label: item.name,
              value: String(item.amount),
              placeholder: "例如 30000"
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setSaveMessage("暂时无法加载我的资产，先显示本地默认值。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateItem(id: string, value: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, value } : item))
    );
  }

  function openAddModal() {
    setDraftLabel("");
    setDraftValue("");
    setShowModal(true);
  }

  function closeAddModal() {
    setDraftLabel("");
    setDraftValue("");
    setShowModal(false);
  }

  function submitDraft() {
    const label = draftLabel.trim();
    if (!label) {
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: `asset-${current.length + 1}`,
        label,
        value: draftValue,
        placeholder: "例如 30000"
      }
    ]);
    closeAddModal();
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const listResponse = await fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/assets`);
      if (!listResponse.ok) {
        throw new Error("Failed to load assets.");
      }

      const listPayload = (await listResponse.json()) as { items: ApiNamedAmount[] };

      const deleteResponses = await Promise.all(
        listPayload.items.map((item) =>
          fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/assets/${item.id}`, {
            method: "DELETE"
          })
        )
      );

      if (deleteResponses.some((response) => !response.ok)) {
        throw new Error("Failed to clear assets.");
      }

      const createResponses = await Promise.all(
        items
          .filter((item) => item.label.trim())
          .map((item) =>
            fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/assets`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: item.label.trim(),
                amount: parseAmount(item.value)
              })
            })
          )
      );

      if (createResponses.some((response) => !response.ok)) {
        throw new Error("Failed to save assets.");
      }

      setSaveMessage("我的资产已保存。");
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
            <AppText variant="subtitle">我的资产</AppText>
          </View>
        </View>
      }
    >
      {loading ? (
        <AppText variant="bodySmall" color="textMuted">
          正在加载我的资产...
        </AppText>
      ) : null}

      <View style={styles.formGroup}>
        {items.map((item) => (
          <AppInput
            key={item.id}
            label={item.label}
            value={item.value}
            onChangeText={(value) => updateItem(item.id, value)}
            placeholder={item.placeholder}
            suffix="元"
          />
        ))}
        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [styles.addIconButton, pressed && styles.backPressed]}
        >
          <AppText variant="subtitle" color="primary">
            +
          </AppText>
        </Pressable>
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

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="subtitle">添加资产项</AppText>
            <View style={styles.formGroup}>
              <AppInput
                label="资产名称"
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder="例如 黄金 / 理财 / 债券"
                keyboardType="default"
              />
              <AppInput
                label="金额"
                value={draftValue}
                onChangeText={setDraftValue}
                placeholder="例如 30000"
                suffix="元"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={closeAddModal} style={styles.textAction}>
                <AppText variant="bodySmall" color="textMuted">
                  取消
                </AppText>
              </Pressable>
              <AppButton label="确认添加" onPress={submitDraft} />
            </View>
          </View>
        </View>
      </Modal>
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
  addIconButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  saveButton: {
    marginTop: theme.spacing.xs
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    backgroundColor: "rgba(10, 22, 19, 0.34)"
  },
  modalCard: {
    gap: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  textAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm
  }
});
