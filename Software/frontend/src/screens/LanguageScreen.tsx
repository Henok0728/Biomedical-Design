import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Language">;

export function LanguageScreen() {
  const navigation = useNavigation<Nav>();
  const copy = t("en");

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>PPH mat · PHCU</Text>
      <Text style={styles.title}>{copy.appName}</Text>
      <Text style={styles.sub}>{copy.chooseLanguage}</Text>
      <Pressable
        style={styles.btn}
        onPress={() => navigation.replace("Ward", { language: "am" })}
      >
        <Text style={styles.btnText}>{copy.amharic} / አማርኛ</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, styles.secondary]}
        onPress={() => navigation.replace("Ward", { language: "en" })}
      >
        <Text style={[styles.btnText, { color: colors.navy }]}>
          {copy.english}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.navy,
    padding: 24,
    justifyContent: "center",
  },
  kicker: { color: "#9BB8C9", fontSize: 14, marginBottom: 8 },
  title: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 12,
  },
  sub: { color: colors.white, fontSize: 20, marginBottom: 28 },
  btn: {
    backgroundColor: colors.white,
    minHeight: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.white,
  },
  btnText: { fontSize: 20, fontWeight: "700", color: colors.navy },
});
