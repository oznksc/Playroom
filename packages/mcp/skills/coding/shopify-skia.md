# @shopify/react-native-skia Best Practices

## Core Concepts

- Skia renders on the UI thread via a dedicated GPU-accelerated canvas
- All drawing happens inside `<Canvas>` — never mix Skia and React Native views inside the canvas
- Use `Skia.View` or `Skia.Path` for native view integration when needed

## Canvas Setup

```tsx
import { Canvas, Fill } from "@shopify/react-native-skia";

<Canvas style={{ flex: 1 }}>
  <Fill color="cyan" />
</Canvas>
```

- Always set `style` with explicit dimensions or `flex: 1`
- Use `onSize` callback to react to canvas resizes
- For performance, avoid re-creating `Skia.Path` / `Skia.Paint` inside render — memoize with `useMemo`

## Drawing Primitives

- `<Rect>`, `<Circle>`, `<Line>`, `<Path>`, `<Text>`, `<Image>` are the building blocks
- Use `Skia.Path` for complex shapes — build with `.moveTo`, `lineTo`, `cubicTo`, `addArc`
- Prefer `<RRect>` over `<Rect>` for rounded corners (no extra path math)

## Paint & Shaders

```tsx
const paint = usePaint(() =>
  Skia.Paint({
    color: Skia.Color("blue"),
    style: PaintStyle.Fill,
    strokeWidth: 2,
  })
);
```

- Cache paints with `useMemo` or `usePaint` — never recreate per frame
- Use `shader` property for gradients, images, and noise
- `PaintStyle.Fill` (default), `PaintStyle.Stroke`, `PaintStyle.StrokeAndFill`

## Animations

- Use `useValue` / `useDerivedValue` for animated values — they run on the UI thread
- `useTiming` and `useSpring` for declarative animations
- `useClockValue` for frame-driven animations

```tsx
const progress = useValue(0);
useEffect(() => {
  progress.current = withTiming(1, { duration: 500 });
}, []);
```

- **Never** use `Animated.*` or `react-native-reanimated` inside Canvas — use Skia's own animation primitives
- `useAnimatedReaction` can bridge Reanimated values to Skia values

## Performance

- Keep `<Canvas>` children minimal — offload static content to images
- Use `layerMode="gpu"` for hardware acceleration (default on iOS, optional on Android)
- Avoid `save()`/`restore()` heavy stacks — flatten where possible
- Use `useImage` hook for async image loading with caching
- Profile with Skia's built-in `onDraw` timing

## React Native Integration

- `<Canvas>` sits inside the React Native view hierarchy — it's just a view
- Use `TouchHandler` for gesture detection on canvas content
- `onTouchesBegan`, `onTouchesMoved`, `onTouchesEnded` for raw touch events
- Bridge Skia ↔ Reanimated with `useDerivedValue` reading shared values

## Common Patterns

### Reactive Drawing

```tsx
const x = useValue(100);
const r = useDerivedValue(() => x.current + 50);

<Canvas>
  <Circle cx={x} cy={100} r={r} color="red" />
</Canvas>
```

### Image Filters

```tsx
import { ColorMatrix, Blur } from "@shopify/react-native-skia";

<Blur sigma={4} />
<ColorMatrix matrix={[...]} />
```

### SVG Path from String

```tsx
const path = useMemo(() => Skia.Path.MakeFromSVGString(svgD), [svgD]);
```

## Debugging

- Use `debug` prop on `<Canvas>` to see draw call counts
- Check FPS with `useClockValue` and frame delta timing
- Android: enable Skia GPU logging for shader compilation issues
