/**
 * Inline SVG provider logos for the Agent Settings panel.
 * Each icon is designed to render cleanly at 18–20 px inside a 32 px avatar.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Anthropic — stylised "A" mark */
export function AnthropicIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M13.827 3h3.48L24 21h-3.48l-6.693-18Zm-7.154 0H10.2l2.846 7.663-3.263 8.812L.307 21H3.76l3.913-18Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** OpenAI — hexagonal knot mark */
export function OpenAIIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.68 4.533a5.998 5.998 0 0 0-4.004 2.88 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.026 24a6.056 6.056 0 0 0 5.763-4.178 5.99 5.99 0 0 0 4.004-2.88 6.042 6.042 0 0 0-.511-7.121Zm-9.256 12.616a4.484 4.484 0 0 1-2.882-1.04l.142-.081 4.794-2.769a.778.778 0 0 0 .395-.678V11.1l2.026 1.17a.072.072 0 0 1 .04.056v5.6a4.508 4.508 0 0 1-4.515 4.511ZM3.603 18.292a4.477 4.477 0 0 1-.535-3.014l.142.085 4.783 2.762a.793.793 0 0 0 .787 0l5.843-3.373v2.343a.071.071 0 0 1-.029.062l-4.836 2.793a4.504 4.504 0 0 1-6.155-1.658ZM2.34 7.896a4.485 4.485 0 0 1 2.345-1.972l-.002.164v5.537a.768.768 0 0 0 .395.678l5.843 3.374-2.026 1.17a.073.073 0 0 1-.069.006L3.989 14.06a4.512 4.512 0 0 1-1.649-6.164ZM19.27 12.12l-5.844-3.374 2.026-1.17a.074.074 0 0 1 .069-.005l4.837 2.793a4.504 4.504 0 0 1-.698 8.127v-5.702a.782.782 0 0 0-.39-.669Zm2.014-3.025-.142-.085-4.784-2.763a.789.789 0 0 0-.786 0L9.728 9.62V7.278a.07.07 0 0 1 .028-.061l4.837-2.794a4.505 4.505 0 0 1 6.691 4.672ZM8.572 13.29l-2.026-1.17a.071.071 0 0 1-.04-.056V6.466a4.505 4.505 0 0 1 7.389-3.46l-.142.08-4.793 2.77a.78.78 0 0 0-.396.677l-.002 6.757Zm1.1-2.368 2.602-1.502 2.602 1.502v3.005L12.274 15.43l-2.601-1.502v-3.005Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** xAI — bold "x" glyph */
export function XAIIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="m3 3 7.797 10.899L3.122 21h2.093l6.327-5.862L16.5 21H21l-8.2-11.47L19.8 3h-2.063l-5.92 5.487L7.5 3H3Zm3.093 1.5H7.5l10.407 15H16.5L6.093 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Google AI / Gemini — four-point sparkle star */
export function GoogleAIIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2C12 2 14.5 8.5 12 12C9.5 15.5 2 12 2 12C2 12 8.5 14.5 12 12C15.5 9.5 12 2 12 2Z"
        fill="currentColor"
        opacity={0.7}
      />
      <path
        d="M12 22C12 22 9.5 15.5 12 12C14.5 8.5 22 12 22 12C22 12 15.5 9.5 12 12C8.5 14.5 12 22 12 22Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** OpenRouter — split path / router symbol */
export function OpenRouterIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2v6m0 8v6m-6-10H2m20 0h-4"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={12} cy={12} r={3.5} stroke="currentColor" strokeWidth={2} fill="none" />
      <circle cx={5} cy={5} r={1.8} fill="currentColor" opacity={0.5} />
      <circle cx={19} cy={5} r={1.8} fill="currentColor" opacity={0.5} />
      <circle cx={5} cy={19} r={1.8} fill="currentColor" opacity={0.5} />
      <circle cx={19} cy={19} r={1.8} fill="currentColor" opacity={0.5} />
    </svg>
  );
}

/** Ollama — llama head silhouette */
export function OllamaIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8.5 3C7 3 5.5 4 5 6C4.5 8 5 9 5 10C4 10.5 3 11.5 3 13.5C3 16 5 17 6 17L6.5 21H9L9.5 17H14.5L15 21H17.5L18 17C19 17 21 16 21 13.5C21 11.5 20 10.5 19 10C19 9 19.5 8 19 6C18.5 4 17 3 15.5 3C14.5 3 13.5 3.5 13 4L12 4.5L11 4C10.5 3.5 9.5 3 8.5 3Z"
        fill="currentColor"
        opacity={0.9}
      />
      <circle cx={9} cy={10} r={1.2} fill="currentColor" opacity={0.3} />
      <circle cx={15} cy={10} r={1.2} fill="currentColor" opacity={0.3} />
    </svg>
  );
}

/** LM Studio — terminal/model chip icon */
export function LMStudioIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x={3}
        y={4}
        width={18}
        height={16}
        rx={3}
        stroke="currentColor"
        strokeWidth={1.8}
        fill="none"
      />
      <path
        d="M7 9l3 3-3 3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={13}
        y1={15}
        x2={17}
        y2={15}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Map of provider id → icon component */
export const PROVIDER_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  xai: XAIIcon,
  google: GoogleAIIcon,
  openrouter: OpenRouterIcon,
  ollama: OllamaIcon,
  lmstudio: LMStudioIcon,
};
