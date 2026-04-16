import { router } from "expo-router";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppInput,
  AppScreen,
  AppText,
  SectionHeader
} from "../src/components";
import { theme } from "../src/theme";

type PlanItem = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
};

type DraftType = "income" | "expense" | null;

function parseAmount(value: string) {
  const normalized = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatWan(value: number) {
  const wanValue = value / 10000;

  return wanValue.toFixed(wanValue >= 10 ? 1 : 2);
}

export default function PlanningScreen() {
  const [incomeItems, setIncomeItems] = useState<PlanItem[]>([
    {
      id: "monthly-salary",
      label: "月工资",
      value: "18000",
      placeholder: "例如 18000"
    },
    {
      id: "annual-bonus",
      label: "年终奖",
      value: "30000",
      placeholder: "例如 30000"
    }
  ]);
  const [expenseItems, setExpenseItems] = useState<PlanItem[]>([
    {
      id: "insurance",
      label: "保险",
      value: "6000",
      placeholder: "例如 6000"
    },
    {
      id: "fitness",
      label: "健身",
      value: "3000",
      placeholder: "例如 3000"
    },
    {
      id: "property-fee",
      label: "物业",
      value: "2400",
      placeholder: "例如 2400"
    },
    {
      id: "rent",
      label: "房租",
      value: "54000",
      placeholder: "例如 54000"
    },
    {
      id: "car-expense",
      label: "养车",
      value: "12000",
      placeholder: "例如 12000"
    }
  ]);
  const [draftType, setDraftType] = useState<DraftType>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");

  function updateItem(
    items: PlanItem[],
    setItems: Dispatch<SetStateAction<PlanItem[]>>,
    id: string,
    value: string
  ) {
    setItems(items.map((item) => (item.id === id ? { ...item, value } : item)));
  }

  function addItem(
    items: PlanItem[],
    setItems: Dispatch<SetStateAction<PlanItem[]>>,
    prefix: string,
    label: string,
    value: string,
    placeholder: string
  ) {
    setItems([
      ...items,
      {
        id: `${prefix}-${items.length + 1}`,
        label,
        value,
        placeholder
      }
    ]);
  }

  function openAddModal(type: Exclude<DraftType, null>) {
    setDraftType(type);
    setDraftLabel("");
    setDraftValue("");
  }

  function closeAddModal() {
    setDraftType(null);
    setDraftLabel("");
    setDraftValue("");
  }

  function submitDraft() {
    const label = draftLabel.trim();

    if (!draftType || !label) {
      return;
    }

    if (draftType === "income") {
      addItem(
        incomeItems,
        setIncomeItems,
        "income",
        label,
        draftValue,
        "例如 12000"
      );
    } else {
      addItem(
        expenseItems,
        setExpenseItems,
        "expense",
        label,
        draftValue,
        "例如 3600"
      );
    }

    closeAddModal();
  }

  const annualIncome = useMemo(() => {
    return incomeItems.reduce((sum, item) => {
      if (item.id === "monthly-salary") {
        return sum + parseAmount(item.value) * 12;
      }

      return sum + parseAmount(item.value);
    }, 0);
  }, [incomeItems]);

  const annualFixedExpense = useMemo(() => {
    return expenseItems.reduce((sum, item) => sum + parseAmount(item.value), 0);
  }, [expenseItems]);

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
            <AppText variant="subtitle">年度财务规划</AppText>
          </View>
          <AppText variant="body" color="textMuted">
            Start with annual income and fixed costs so the app can later
            evaluate your savings pace, spending pressure, and year-end
            projection.
          </AppText>
        </View>
      }
    >
      <View style={styles.summaryRow}>
        <AppCard tone="mint" style={styles.summaryCard}>
          <AppText variant="eyebrow" color="textSubtle">
            年度收入
          </AppText>
          <View style={styles.summaryValueGroup}>
            <AppText variant="heroNumber" color="primary">
              {formatWan(annualIncome)}
            </AppText>
            <AppText variant="bodySmall" color="textMuted">
              万元
            </AppText>
          </View>
        </AppCard>

        <AppCard tone="accent" style={styles.summaryCard}>
          <AppText variant="eyebrow" color="textSubtle">
            年度固定支出
          </AppText>
          <View style={styles.summaryValueGroup}>
            <AppText variant="heroNumber" color="primary">
              {formatWan(annualFixedExpense)}
            </AppText>
            <AppText variant="bodySmall" color="textMuted">
              万元
            </AppText>
          </View>
        </AppCard>
      </View>

      <AppCard>
        <AppText variant="subtitle">年度收入</AppText>
        <AppText variant="bodySmall" color="textMuted">
          先输入最稳定的收入部分，额外收入通过弹窗录入，保持主页面整洁。
        </AppText>
        <View style={styles.formGroup}>
          {incomeItems.map((item) => (
            <View key={item.id} style={styles.itemGroup}>
              <AppInput
                label={item.label}
                value={item.value}
                onChangeText={(value) =>
                  updateItem(incomeItems, setIncomeItems, item.id, value)
                }
                placeholder={item.placeholder}
                suffix="元"
              />
            </View>
          ))}
          <AppButton
            label="添加收入项"
            tone="secondary"
            onPress={() => openAddModal("income")}
          />
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="subtitle">年度固定支出</AppText>
        <AppText variant="bodySmall" color="textMuted">
          输入每年相对稳定、可预期的固定支出，新增项也通过弹窗录入。
        </AppText>
        <View style={styles.formGroup}>
          {expenseItems.map((item) => (
            <View key={item.id} style={styles.itemGroup}>
              <AppInput
                label={item.label}
                value={item.value}
                onChangeText={(value) =>
                  updateItem(expenseItems, setExpenseItems, item.id, value)
                }
                placeholder={item.placeholder}
                suffix="元"
              />
            </View>
          ))}
          <AppButton
            label="添加固定支出项"
            tone="secondary"
            onPress={() => openAddModal("expense")}
          />
        </View>
      </AppCard>

      <Modal
        visible={draftType !== null}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="subtitle">
              {draftType === "income" ? "添加收入项" : "添加固定支出项"}
            </AppText>
            <AppText variant="bodySmall" color="textMuted">
              {draftType === "income"
                ? "例如副业收入、项目奖金、租金收入。"
                : "例如停车费、学费、保姆或其他长期固定支出。"}
            </AppText>

            <View style={styles.formGroup}>
              <AppInput
                label={draftType === "income" ? "收入名称" : "支出名称"}
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder={draftType === "income" ? "例如 副业收入" : "例如 停车费"}
                keyboardType="default"
              />
              <AppInput
                label="金额"
                value={draftValue}
                onChangeText={setDraftValue}
                placeholder="例如 12000"
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
  summaryRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
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
  summaryCard: {
    flex: 1,
    minHeight: 156
  },
  summaryValueGroup: {
    gap: theme.spacing.xs
  },
  formGroup: {
    gap: theme.spacing.lg
  },
  itemGroup: {
    gap: theme.spacing.md
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
