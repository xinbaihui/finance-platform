import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { theme } from "../theme";
import { AppText } from "./AppText";

type AppInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  suffix?: string;
};

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "numeric",
  suffix
}: AppInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="bodySmall" color="textMuted">
        {label}
      </AppText>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused]}
        />
        {suffix ? (
          <AppText variant="bodySmall" color="textMuted" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm
  },
  inputWrap: {
    minHeight: 46,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingVertical: 10,
    outlineStyle: "none",
    outlineWidth: 0,
    boxShadow: "none"
  },
  inputFocused: {
    fontSize: 16,
    paddingVertical: 10
  },
  suffix: {
    marginLeft: theme.spacing.md
  }
});
