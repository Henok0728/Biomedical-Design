import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ConnectScreen } from "../screens/ConnectScreen";
import { CriticalScreen } from "../screens/CriticalScreen";
import { LanguageScreen } from "../screens/LanguageScreen";
import { LiveMonitoringScreen } from "../screens/LiveMonitoringScreen";
import { NewSessionScreen } from "../screens/NewSessionScreen";
import { SessionSummaryScreen } from "../screens/SessionSummaryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SyncQueueScreen } from "../screens/SyncQueueScreen";
import { WardScreen } from "../screens/WardScreen";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Language"
        screenOptions={{
          headerTintColor: colors.navy,
          headerStyle: { backgroundColor: colors.white },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen
          name="Language"
          component={LanguageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Ward"
          component={WardScreen}
          options={{ title: "Ward" }}
        />
        <Stack.Screen
          name="Connect"
          component={ConnectScreen}
          options={{ title: "Connect" }}
        />
        <Stack.Screen
          name="NewSession"
          component={NewSessionScreen}
          options={{ title: "Session" }}
        />
        <Stack.Screen
          name="Live"
          component={LiveMonitoringScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Critical"
          component={CriticalScreen}
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="Summary"
          component={SessionSummaryScreen}
          options={{ title: "Summary" }}
        />
        <Stack.Screen
          name="Sync"
          component={SyncQueueScreen}
          options={{ title: "Sync" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
