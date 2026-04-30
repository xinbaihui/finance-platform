import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppCard, AppScreen, AppText } from "../../src/components";
import { API_BASE_URL, DEMO_USER_ID } from "../../src/config/api";
import { theme } from "../../src/theme";

const quickTags = ["本月分析", "全年预测", "目标差距"] as const;
const welcomePrefix =
  "你好，我会基于你的年度规划、资产信息和分析结果，帮助你理解本月支出、全年走势和目标差距。你也可以先到“";
const welcomeSuffix = "”页面补充收入、资产等信息，分析结果会更准确。";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  tone?: "default" | "error" | "progress";
};

type ToolStep = {
  name: string;
  label: string;
  status: "started" | "done";
};

type StreamProgress = {
  status: string;
  tools: ToolStep[];
};

type SseEvent =
  | { event: "status"; data: { message: string } }
  | { event: "tool"; data: ToolStep }
  | { event: "chunk"; data: { text: string } }
  | { event: "done"; data: { reply: string } }
  | { event: "error"; data: { message: string } };

const STREAM_STEP_MS = 22;

function renderAssistantContent(content: string, tone: ChatMessage["tone"]) {
  const color = tone === "error" ? "text" : "textMuted";
  const lines = content.split("\n").filter((line, index, array) => line.trim() || index < array.length - 1);

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isBullet = /^[-*]\s+/.test(trimmed);
    const isOrdered = /^\d+\.\s+/.test(trimmed);

    if (!trimmed) {
      return <View key={`spacer-${index}`} style={styles.lineSpacer} />;
    }

    if (isBullet) {
      return (
        <View key={`line-${index}`} style={styles.listRow}>
          <AppText variant="bodySmall" color={color} style={styles.listMarker}>
            •
          </AppText>
          <AppText variant="bodySmall" color={color} style={styles.listContent}>
            {trimmed.replace(/^[-*]\s+/, "")}
          </AppText>
        </View>
      );
    }

    if (isOrdered) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
      return (
        <View key={`line-${index}`} style={styles.listRow}>
          <AppText variant="bodySmall" color={color} style={styles.orderedMarker}>
            {match?.[1] ?? ""}
          </AppText>
          <AppText variant="bodySmall" color={color} style={styles.listContent}>
            {match?.[2] ?? trimmed}
          </AppText>
        </View>
      );
    }

    return (
      <AppText key={`line-${index}`} variant="bodySmall" color={color} style={styles.messageLine}>
        {trimmed}
      </AppText>
    );
  });
}

function parseSseBlock(block: string): SseEvent | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));

  if (!eventLine || !dataLine) {
    return null;
  }

  const event = eventLine.replace("event:", "").trim();
  const rawData = dataLine.replace("data:", "").trim();

  try {
    return {
      event: event as SseEvent["event"],
      data: JSON.parse(rawData)
    } as SseEvent;
  } catch {
    return null;
  }
}

export default function ChatTab() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `${welcomePrefix}我的${welcomeSuffix}`
    }
  ]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function appendAssistantText(messageId: string, nextText: string) {
    const units = Array.from(nextText);

    for (const unit of units) {
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                tone: "default",
                content: `${item.tone === "progress" ? "" : item.content}${unit}`
              }
            : item
        )
      );

      await new Promise((resolve) => {
        setTimeout(resolve, STREAM_STEP_MS);
      });
    }
  }

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

    const streamingAssistantId = `assistant-stream-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: streamingAssistantId,
        role: "assistant",
        content: "正在读取财务数据...",
        tone: "progress"
      }
    ]);
    setProgress({
      status: "准备开始分析...",
      tools: []
    });

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
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

      if (!response.body) {
        throw new Error("当前环境不支持流式响应。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const parsed = parseSseBlock(part);
          if (!parsed) {
            continue;
          }

          if (parsed.event === "status") {
            setProgress((current) => ({
              status: parsed.data.message,
              tools: current?.tools ?? []
            }));

            setMessages((current) =>
              current.map((item) =>
                item.id === streamingAssistantId && item.tone === "progress"
                  ? {
                      ...item,
                      content: `${parsed.data.message}...`
                    }
                  : item
              )
            );
          }

          if (parsed.event === "tool") {
            setProgress((current) => {
              const nextTools = [...(current?.tools ?? [])];
              const index = nextTools.findIndex((tool) => tool.name === parsed.data.name);

              if (index >= 0) {
                nextTools[index] = parsed.data;
              } else {
                nextTools.push(parsed.data);
              }

              return {
                status: current?.status ?? "正在分析...",
                tools: nextTools
              };
            });
          }

          if (parsed.event === "chunk") {
            await appendAssistantText(streamingAssistantId, parsed.data.text);
          }

          if (parsed.event === "done") {
            setProgress(null);
          }

          if (parsed.event === "error") {
            throw new Error(parsed.data.message);
          }
        }
      }
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "请求失败，请检查服务端是否已经启动。";

      setProgress(null);
      setMessages((current) =>
        current.map((item) =>
          item.id === streamingAssistantId
            ? {
                ...item,
                content: `暂时无法连接模型服务：${fallback}`,
                tone: "error"
              }
            : item
        )
      );
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
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.messageStack}
          showsVerticalScrollIndicator
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
            {messages.map((item) =>
              item.role === "assistant" ? (
                <AppCard
                  key={item.id}
                  tone={item.tone === "error" ? "default" : "mint"}
                  style={[
                    styles.assistantCard,
                    item.tone === "error" && styles.errorCard,
                    item.tone === "progress" && styles.progressBubble
                  ]}
                >
                  <View style={styles.messageContent}>
                    {item.id === "welcome" ? (
                      <AppText variant="bodySmall" color="textMuted" style={styles.messageLine}>
                        {welcomePrefix}
                        <AppText
                          variant="bodySmall"
                          color="primaryDark"
                          style={styles.inlineLink}
                          onPress={() => router.push("/(tabs)/me")}
                        >
                          我的
                        </AppText>
                        {welcomeSuffix}
                      </AppText>
                    ) : (
                      renderAssistantContent(item.content, item.tone)
                    )}
                  </View>
                </AppCard>
              ) : (
                <View key={item.id} style={styles.userBubble}>
                  <AppText variant="bodySmall" color="white">
                    {item.content}
                  </AppText>
                </View>
              )
            )}
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
    flex: 1,
    ...(Platform.OS === "web"
      ? {
          overflowY: "scroll" as const
        }
      : null)
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
  progressBubble: {
    opacity: 0.92
  },
  errorCard: {
    backgroundColor: "#fff4f2",
    borderColor: "#f3c7bf"
  },
  messageContent: {
    gap: 4
  },
  messageLine: {
    lineHeight: 21
  },
  inlineLink: {
    textDecorationLine: "underline"
  },
  lineSpacer: {
    height: 6
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 8,
    gap: 4
  },
  listMarker: {
    width: 10,
    lineHeight: 21
  },
  orderedMarker: {
    width: 18,
    lineHeight: 21
  },
  listContent: {
    flex: 1,
    lineHeight: 21
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
});
