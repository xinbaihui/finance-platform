import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppCard, AppScreen, AppText } from "../../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../../src/config/api";
import { theme } from "../../src/theme";

const quickTags = ["本月分析", "全年预测", "目标差距"] as const;

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  tone?: "default" | "error";
};

export default function ChatTab() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好，我会基于你的年度规划、资产信息和分析结果，帮助你理解本月支出、全年走势和目标差距。"
    }
  ]);
  const [sending, setSending] = useState(false);

  async function sendMessage(nextMessage?: string) {
    const content = (nextMessage ?? message).trim();
    if (!content || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content
    };

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: DEMO_USER_ID,
          message: content,
          year: 2026,
          month: 4
        })
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;

        throw new Error(errorPayload?.detail ?? "Chat request failed.");
      }

      const data = (await response.json()) as { reply: string };

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "请求失败，请检查服务端是否已经启动。";

      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `暂时无法连接模型服务：${fallback}`,
          tone: "error"
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="body" style={styles.headerTitle}>
            理财副驾驶
          </AppText>
        </View>

        <View style={styles.headerDivider} />

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.messageStack}
          showsVerticalScrollIndicator
        >
            {messages.map((item) =>
              item.role === "assistant" ? (
                <AppCard
                  key={item.id}
                  tone={item.tone === "error" ? "default" : "mint"}
                  style={[
                    styles.assistantCard,
                    item.tone === "error" && styles.errorCard
                  ]}
                >
                  <AppText
                    variant="bodySmall"
                    color={item.tone === "error" ? "text" : "textMuted"}
                  >
                    {item.content}
                  </AppText>
                </AppCard>
              ) : (
                <View key={item.id} style={styles.userBubble}>
                  <AppText variant="bodySmall" color="white">
                    {item.content}
                  </AppText>
                </View>
              )
            )}

            {sending ? (
              <AppCard tone="mint" style={styles.assistantCard}>
                <View style={styles.loadingRow}>
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                  <View style={styles.loadingDot} />
                  <AppText variant="bodySmall" color="textMuted">
                    正在思考...
                  </AppText>
                </View>
              </AppCard>
            ) : null}
        </ScrollView>

        <View style={styles.footerDivider} />

        <View style={styles.footer}>
          <View style={styles.tagRow}>
            {quickTags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => sendMessage(tag)}
                style={({ pressed }) => [styles.tag, pressed && styles.tagPressed]}
              >
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
              editable={!sending}
              style={styles.input}
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={sending}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.sendPressed,
                sending && styles.sendDisabled
              ]}
            >
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
    flex: 1
  },
  footerDivider: {
    height: 1,
    backgroundColor: theme.colors.border
  },
  messageStack: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.xs
  },
  assistantCard: {
    shadowOpacity: 0.04
  },
  errorCard: {
    backgroundColor: "#fff4f2",
    borderColor: "#f3c7bf"
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
  },
  sendDisabled: {
    opacity: 0.5
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary
  }
});
