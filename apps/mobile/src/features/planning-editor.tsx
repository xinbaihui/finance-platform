import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppInput,
  AppScreen,
  AppText
} from "../components";
import { API_BASE_URL, DEMO_USER_ID } from "../config/api";
import { theme } from "../theme";

type PlanItem = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  period: "year" | "month";
};

type ApiNamedAmount = {
  id: number;
  name: string;
  amount: number;
  period?: "year" | "month";
};

type PlanningEditorProps = {
  mode: "income" | "expense";
};

const CURRENT_YEAR = 2026;

function parseAmount(value: string) {
  const normalized = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatWan(value: number) {
  const wanValue = value / 10000;
  return wanValue.toFixed(wanValue >= 10 ? 1 : 2);
}

function normalizeIncomeItems(items: ApiNamedAmount[]): PlanItem[] {
  const salaryLikeItems = items.filter(
    (item) => item.name === "工资" || item.name === "月工资" || item.name === "年终奖"
  );
  const otherItems = items.filter(
    (item) => item.name !== "工资" && item.name !== "月工资" && item.name !== "年终奖"
  );

  const normalizedItems: PlanItem[] = [];

  if (salaryLikeItems.length > 0) {
    normalizedItems.push({
      id: salaryLikeItems.map((item) => item.id).join("-") || "salary",
      label: "工资",
      value: String(salaryLikeItems.reduce((sum, item) => sum + item.amount, 0)),
      placeholder: "例如 246000",
      period: salaryLikeItems.every((item) => item.period === "month") ? "month" : "year"
    });
  }

  return normalizedItems.concat(
    otherItems.map((item) => ({
      id: String(item.id),
      label: item.name,
      value: String(item.amount),
      placeholder: "例如 12000",
      period: item.period ?? "year"
    }))
  );
}

export function PlanningEditor({ mode }: PlanningEditorProps) {
  const [items, setItems] = useState<PlanItem[]>(
    mode === "income"
      ? [
          {
            id: "salary",
            label: "工资",
            value: "246000",
            placeholder: "例如 246000",
            period: "year"
          }
        ]
      : [
          {
            id: "insurance",
            label: "保险",
            value: "6000",
            placeholder: "例如 6000",
            period: "year"
          },
          {
            id: "fitness",
            label: "健身",
            value: "3000",
            placeholder: "例如 3000",
            period: "year"
          },
          {
            id: "property-fee",
            label: "物业",
            value: "2400",
            placeholder: "例如 2400",
            period: "year"
          },
          {
            id: "rent",
            label: "房租",
            value: "54000",
            placeholder: "例如 54000",
            period: "year"
          },
          {
            id: "car-expense",
            label: "养车",
            value: "12000",
            placeholder: "例如 12000",
            period: "year"
          }
        ]
  );
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [draftPeriod, setDraftPeriod] = useState<"year" | "month">("year");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const endpoint = mode === "income" ? "annual-income" : "annual-expenses";
  const pageTitle = mode === "income" ? "年度收入" : "年度支出";
  const addLabel = mode === "income" ? "添加收入项" : "添加固定支出项";
  const itemNameLabel = mode === "income" ? "收入名称" : "支出名称";
  const itemHint =
    mode === "income"
      ? "例如副业收入、项目奖金、租金收入。"
      : "例如停车费、学费、保姆或其他长期固定支出。";
  const placeholder = mode === "income" ? "例如 12000" : "例如 3600";
  const loadingText =
    mode === "income" ? "正在加载年度收入..." : "正在加载年度支出...";

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${DEMO_USER_ID}/${endpoint}?year=${CURRENT_YEAR}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${endpoint}.`);
        }

        const payload = (await response.json()) as { items: ApiNamedAmount[] };

        if (!cancelled && payload.items.length > 0) {
          setItems(
            mode === "income"
              ? normalizeIncomeItems(payload.items)
              : payload.items.map((item) => ({
                  id: String(item.id),
                  label: item.name,
                  value: String(item.amount),
                  placeholder,
                  period: item.period ?? "year"
                }))
          );
        }
      } catch {
        if (!cancelled) {
          setSaveMessage(`暂时无法加载${pageTitle}，先显示本地默认值。`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [endpoint, mode, pageTitle, placeholder]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const amount = parseAmount(item.value);
      return sum + (item.period === "month" ? amount * 12 : amount);
    }, 0);
  }, [items]);

  function updateItem(id: string, value: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, value } : item))
    );
  }

  function updatePeriod(id: string, period: "year" | "month") {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, period } : item))
    );
  }

  function openAddModal() {
    setDraftLabel("");
    setDraftValue("");
    setDraftPeriod("year");
    setShowModal(true);
  }

  function closeAddModal() {
    setDraftLabel("");
    setDraftValue("");
    setDraftPeriod("year");
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
        id: `${mode}-${current.length + 1}`,
        label,
        value: draftValue,
        placeholder,
        period: draftPeriod
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
      const listResponse = await fetch(
        `${API_BASE_URL}/users/${DEMO_USER_ID}/${endpoint}?year=${CURRENT_YEAR}`
      );
      if (!listResponse.ok) {
        throw new Error(`Failed to load ${endpoint}.`);
      }

      const listPayload = (await listResponse.json()) as { items: ApiNamedAmount[] };

      const deleteResponses = await Promise.all(
        listPayload.items.map((item) =>
          fetch(`${API_BASE_URL}/users/${DEMO_USER_ID}/${endpoint}/${item.id}`, {
            method: "DELETE"
          })
        )
      );

      if (deleteResponses.some((response) => !response.ok)) {
        throw new Error(`Failed to delete ${endpoint}.`);
      }

      const createResponses = await Promise.all(
        items
          .filter((item) => item.label.trim())
          .map((item) =>
            fetch(
              `${API_BASE_URL}/users/${DEMO_USER_ID}/${endpoint}?year=${CURRENT_YEAR}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  name: item.label.trim(),
                  amount: parseAmount(item.value),
                  period: item.period
                })
              }
            )
          )
      );

      if (createResponses.some((response) => !response.ok)) {
        throw new Error(`Failed to create ${endpoint}.`);
      }

      setSaveMessage(`${pageTitle}已保存。`);
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
            <AppText variant="subtitle">{pageTitle}</AppText>
          </View>
        </View>
      }
    >
      {loading ? (
        <AppText variant="bodySmall" color="textMuted">
          {loadingText}
        </AppText>
      ) : null}
      <View style={styles.formGroup}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemGroup}>
            <View style={styles.itemRow}>
              <View style={styles.inputWrap}>
                <AppInput
                  label={item.label}
                  value={item.value}
                  onChangeText={(value) => updateItem(item.id, value)}
                  placeholder={item.placeholder}
                  suffix="元"
                />
              </View>
              <View style={styles.periodSwitch}>
                <Pressable
                  onPress={() => updatePeriod(item.id, "year")}
                  style={[
                    styles.periodOption,
                    item.period === "year" && styles.periodOptionActive
                  ]}
                >
                  <AppText
                    variant="bodySmall"
                    color={item.period === "year" ? "white" : "textMuted"}
                  >
                    年
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => updatePeriod(item.id, "month")}
                  style={[
                    styles.periodOption,
                    item.period === "month" && styles.periodOptionActive
                  ]}
                >
                  <AppText
                    variant="bodySmall"
                    color={item.period === "month" ? "white" : "textMuted"}
                  >
                    月
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
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
            <AppText variant="subtitle">{addLabel}</AppText>
            <AppText variant="bodySmall" color="textMuted">
              {itemHint}
            </AppText>

            <View style={styles.formGroup}>
              <AppInput
                label={itemNameLabel}
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder={
                  mode === "income" ? "例如 副业收入" : "例如 停车费"
                }
                keyboardType="default"
              />
              <AppInput
                label="金额"
                value={draftValue}
                onChangeText={setDraftValue}
                placeholder={placeholder}
                suffix="元"
              />
              <View style={styles.draftPeriodRow}>
                <AppText variant="bodySmall" color="textMuted">
                  周期
                </AppText>
                <View style={styles.periodSwitch}>
                  <Pressable
                    onPress={() => setDraftPeriod("year")}
                    style={[
                      styles.periodOption,
                      draftPeriod === "year" && styles.periodOptionActive
                    ]}
                  >
                    <AppText
                      variant="bodySmall"
                      color={draftPeriod === "year" ? "white" : "textMuted"}
                    >
                      年
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setDraftPeriod("month")}
                    style={[
                      styles.periodOption,
                      draftPeriod === "month" && styles.periodOptionActive
                    ]}
                  >
                    <AppText
                      variant="bodySmall"
                      color={draftPeriod === "month" ? "white" : "textMuted"}
                    >
                      月
                    </AppText>
                  </Pressable>
                </View>
              </View>
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
  itemGroup: {
    gap: theme.spacing.md
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm
  },
  inputWrap: {
    flex: 1
  },
  periodSwitch: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    minHeight: 40
  },
  periodOption: {
    minWidth: 38,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm
  },
  periodOptionActive: {
    backgroundColor: theme.colors.primary
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
  draftPeriodRow: {
    gap: theme.spacing.sm
  },
  textAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm
  }
});
