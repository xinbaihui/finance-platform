import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { theme } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryDark,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.94)",
          borderTopColor: theme.colors.border,
          height: 84,
          paddingTop: 10,
          paddingBottom: 16
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "700"
        },
        tabBarIconStyle: {
          marginBottom: 2
        }
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "分析",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "我的",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
