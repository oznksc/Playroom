# react-native-reanimated Best Practices

## Core Concepts

- Worklets run on the UI thread — JS thread never blocks rendering
- Shared Values are reactive state bridging JS ↔ UI thread
- Animated props and styles update synchronously on the UI thread

## Shared Values

```tsx
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";

const offset = useSharedValue(0);

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value }],
}));

<Animated.View style={[styles.box, style]} />
```

- Initialize with `useSharedValue(initialValue)`
- Access via `.value` — reads on UI thread are synchronous
- writes trigger re-renders only on the animated component

## Animations

### Declarative (withTiming / withSpring)

```tsx
offset.value = withTiming(200, { duration: 300 });
offset.value = withSpring(200, { damping: 15, stiffness: 120 });
```

### Sequencing

```tsx
offset.value = withSequence(
  withTiming(200, { duration: 300 }),
  withTiming(0, { duration: 300 })
);
```

### Delay

```tsx
offset.value = withDelay(500, withTiming(200, { duration: 300 }));
```

### Repeat

```tsx
offset.value = withRepeat(
  withTiming(200, { duration: 500 }),
  -1, // infinite
  true // reverse
);
```

## Worklets

```tsx
"use worklet";

function processValue(v) {
  "worklet";
  return v * 2;
}
```

- Mark worklet-bound functions with `"worklet"` directive
- Worklets cannot access closures from JS thread unless they're shared values
- Use `useAnimatedReaction` for reactive computations:

```tsx
useAnimatedReaction(
  () => scrollY.value,
  (result) => {
    headerOpacity.value = interpolate(result, [0, 100], [1, 0]);
  }
);
```

## Animated Props & Styles

```tsx
<Animated.View
  style={useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))}
/>
```

- Only `Animated.*` components accept animated styles
- Wrap non-animated components with `Animated.createAnimatedComponent`

## Layout Animations

```tsx
import { Layout, FadeIn, FadeOut } from "react-native-reanimated";

<Animated.View
  entering={FadeIn.duration(300)}
  exiting={FadeOut.duration(200)}
  layout={Layout.springify()}
>
  <Text>Animated content</Text>
</Animated.View>
```

- `entering` / `exiting` animate mount/unmount
- `layout` animates position/size changes
- Chain: `FadeIn.delay(100).duration(300)`

## Gesture Integration

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const pan = Gesture.Pan()
  .onUpdate((e) => {
    offset.value = { x: e.translationX, y: e.translationY };
  })
  .onEnd(() => {
    offset.value = withSpring({ x: 0, y: 0 });
  });

<GestureDetector gesture={pan}>
  <Animated.View style={animatedStyle} />
</GestureDetector>
```

- Always use `GestureDetector` (not `PanGestureHandler` — that's v1 API)
- Animated values update synchronously inside gesture callbacks

## Performance

- Avoid creating new objects/functions inside `useAnimatedStyle` — memoize worklets
- Use `useDerivedValue` for computed values instead of recalculating in every `useAnimatedStyle`
- Never put heavy JS logic in worklets — keep them minimal
- Use `cancelAnimation` to stop ongoing animations
- Profile with Reanimated's `log` worklet for UI thread debugging

## Common Pitfalls

- Don't read `.value` outside worklets or `useAnimatedStyle` — it won't be reactive
- Don't mutate shared values from both threads simultaneously without `withTiming`/`withSpring`
- `useAnimatedStyle` must return a stable object reference — avoid spreading
- Circular dependencies between shared values cause infinite loops

## Reanimated 3 specific

- `useReducedMotion` for accessibility-aware animations
- `Easing` library for custom easing curves
- `interpolate` with `extrapolateLeft`/`extrapolateRight` for clamping
