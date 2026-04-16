import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppCard, AppScreen, AppText } from "../../src/components";
import { theme } from "../../src/theme";

const quickTags = ["本月分析", "全年预测", "目标差距"] as const;

export default function ChatTab() {
  const [message, setMessage] = useState("");

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="body" style={styles.headerTitle}>
            理财副驾驶
          </AppText>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.chatArea}>
          <View style={styles.messageStack}>
            <AppCard tone="mint" style={styles.assistantCard}>
              <AppText variant="body" color="textMuted">
                你好，我会基于你的年度规划、资产信息和分析结果，帮助你理解本月支出、全年走势和目标差距。
              </AppText>
            </AppCard>

            <View style={styles.userBubble}>
              <AppText variant="bodySmall" color="white">
                我今年还能完成储蓄目标吗？
              </AppText>
            </View>

            <AppCard style={styles.assistantCard}>
              <AppText variant="bodySmall" color="textMuted">
                按当前数据看，你距离年度目标还差 0.4 万元。如果接下来两个月把餐饮和购物支出再压低一点，还是有机会追回的。
              </AppText>
            </AppCard>
          </View>
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footer}>
          <View style={styles.tagRow}>
            {quickTags.map((tag) => (
              <Pressable key={tag} style={({ pressed }) => [styles.tag, pressed && styles.tagPressed]}>
                <AppText variant="bodySmall" color="primaryDark">
                  {tag}
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="问点什么，比如“我今年会不会超支？”"
              style={styles.input}
            />
            <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.sendPressed]}>
              <Ionicons name="arrow-up" size={16} color={theme.colors.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.lg
  },
  header: {
    alignItems: "center",
    paddingTop: theme.spacing.sm
  },
  headerTitle: {
    textAlign: "center"
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.colors.border
  },
  chatArea: {
    flex: 1,
    justifyContent: "flex-end"
  },
  footerDivider: {
    height: 1,
    backgroundColor: theme.colors.border
  },
  messageStack: {
    gap: theme.spacing.md
  },
  assistantCard: {
    shadowOpacity: 0.04
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  footer: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs
  },
  tagRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  tag: {
    minHeight: 32,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: "#d1e9df"
  },
  tagPressed: {
    opacity: 0.88
  },
  inputWrap: {
    minHeight: 42,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: 8,
    outlineStyle: "none",
    outlineWidth: 0,
    boxShadow: "none"
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryDark
  },
  sendPressed: {
    opacity: 0.88
  }
});
