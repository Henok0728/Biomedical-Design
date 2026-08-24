import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "ghost" | "light";
};

export function BigButton({ title, onPress, variant = "primary" }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "danger" && styles.danger,
        variant === "ghost" && styles.ghost,
        variant === "light" && styles.light,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "ghost" && { color: colors.navy },
          variant === "light" && { color: colors.ink },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
  },
  base: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  primary: { backgroundColor: colors.navy },
  danger: { backgroundColor: colors.red },
  ghost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  light: { backgroundColor: "rgba(255,255,255,0.92)" },
  pressed: { opacity: 0.85 },
  label: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
});
