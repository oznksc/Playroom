# React Native Performance Best Practices

## Rendering Optimization

### FlatList over ScrollView

```tsx
<FlatList
  data={items}
  renderItem={({ item }) => <ItemRow item={item} />}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  windowSize={5}
  maxToRenderPerBatch={10}
  removeClippedSubviews={true}
/>
```

- Always set `keyExtractor` with stable, unique IDs
- Use `getItemLayout` when items have fixed height — skips measurement
- `windowSize` controls how many screens of content are rendered (default: 21)
- `removeClippedSubviews` offloads offscreen views from native hierarchy

### Memoization

```tsx
const MemoizedItem = React.memo(ItemRow, (prev, next) => {
  return prev.item.id === next.item.id && prev.selected === next.selected;
});
```

- `React.memo` for components that receive the same props frequently
- Avoid inline function props — use `useCallback`
- Avoid inline object/array creation — use `useMemo`

### Avoid Unnecessary Re-renders

- Move `useContext` consumers as deep as possible — context changes re-render all consumers
- Split large contexts into focused providers
- Use `useRef` for values that don't need re-renders

## Hermes Engine

- Enable in `android/app/build.gradle`: `hermesEnabled = true`
- iOS: enabled by default since RN 0.70
- Provides faster startup, lower memory, smaller APK
- Bytecode precompilation for release builds

## Startup Performance

- Minimize `App.tsx` complexity — lazy load heavy screens
- Use `React.lazy` + `Suspense` for code splitting
- Defer non-critical initialization to after first render
- Use `InteractionManager.runAfterInteractions` for post-navigation setup

## Image Optimization

- Use `resizeMode="contain"` or `"cover"` — avoid `"stretch"`
- Provide `width`/`height` to avoid layout thrashing
- Use WebP format for smaller file sizes
- Cache with `FastImage` (SDWebImage/Glide) over `Image`

## List Performance

- Avoid `ScrollView` for long lists — use `FlatList` or `SectionList`
- Use `FlashList` (Shopify) for better performance on large lists
- Set `initialNumToRender` to fill viewport only
- Use `onEndReachedThreshold` for lazy loading

## Memory Management

- Clear timers in `useEffect` cleanup
- Remove event listeners on unmount
- Avoid retaining large images in state — load on demand
- Use `useCallback`/`useMemo` to prevent unnecessary object creation

## Native Module Calls

- Batch native calls — avoid per-frame bridge communication
- Use `useAnimatedStyle` for UI-thread-native animations
- Prefer Reanimated worklets over `Animated` for complex animations

## Profiling

- Flipper for network, layout, and performance inspection
- React DevTools Profiler for render timing
- `console.time` / `console.timeEnd` for custom measurements
- Android: Systrace for frame-level profiling
- iOS: Instruments for memory and CPU profiling

## Build Optimization

- Enable ProGuard/R8 for Android release builds
- Use `metro.config.js` to exclude unused polyfills
- Strip console.log in production: `babel.config.js` plugin
- Enable lazy loading for Hermes bundles

## Network

- Use `AbortController` for cancellable fetches
- Cache responses with proper `Cache-Control` headers
- Debounce/throttle rapid API calls
- Prefetch data before navigation where possible
