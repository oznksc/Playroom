# React Native Best Practices

## Project Structure

```
src/
├── components/      # Reusable UI components
├── screens/         # Screen-level components
├── hooks/           # Custom hooks
├── services/        # API calls, storage
├── utils/           # Helper functions
├── types/           # TypeScript types
└── navigation/      # Navigation configuration
```

- Group by feature for large apps: `features/auth/`, `features/profile/`
- Keep components small — extract hooks and utils

## Navigation

```tsx
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- Use `@react-navigation/native-stack` (native) over `ystack` (JS) for performance
- Pass minimal data via `params` — fetch full data in destination screen
- Use `React Navigation` deep linking for URL-based navigation

## Styling

```tsx
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

- Use `StyleSheet.create` — enables static analysis and optimization
- Avoid inline styles — they create new objects per render
- Use `flex` for layout — React Native uses flexbox by default (column direction)
- Use platform-specific files: `Component.ios.tsx` / `Component.android.tsx`

## Platform Differences

```tsx
import { Platform } from "react-native";

const styles = {
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
    },
    android: {
      elevation: 4,
    },
  }),
};
```

- Use `Platform.select` for platform-specific values
- Use `Platform.OS` for conditional logic
- Use file extensions for platform-specific components

## Accessibility

```tsx
<Text accessible={true} accessibilityLabel="Submit form" accessibilityRole="button">
  Submit
</Text>
```

- Set `accessibilityLabel` on interactive elements
- Use `accessibilityRole` for semantic meaning
- Test with VoiceOver (iOS) and TalkBack (Android)
- Minimum touch target: 44x44 points

## Common Components

- `Pressable` over `TouchableOpacity` (more flexible, better API)
- `FlatList` for lists — never `ScrollView` with mapped children
- `KeyboardAvoidingView` or `KeyboardAwareScrollView` for form screens
- `SafeAreaView` for notched devices (iOS only, use `useSafeAreaInsets` for Android)

## Permissions

- Use `react-native-permissions` for structured permission handling
- Always request permissions just before they're needed
- Handle denial gracefully — provide settings link

## Debugging

- Flipper for network, layout, and performance inspection
- React DevTools for component tree inspection
- `console.log` with `__DEV__` guard for production builds
- Remote debugging with Chrome DevTools (Hermes)

## Build & Release

- Use `react-native-gradle-plugin` for Android builds
- Set `bundleIdentifier` and package name early — changing later is painful
- Use environment variables for API URLs: `react-native-config`
- Code signing: use `Fastlane` for iOS, Gradle signing for Android
