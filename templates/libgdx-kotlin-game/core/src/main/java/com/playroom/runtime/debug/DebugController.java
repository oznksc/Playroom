package com.playroom.runtime.debug;

import com.badlogic.gdx.graphics.profiling.GLProfiler;
import java.util.HashSet;
import java.util.Set;

/**
 * Shared live-debug state. HTTP requests mutate this; the render thread reads it.
 */
public final class DebugController {
    private static DebugController INSTANCE = new DebugController();

    public static DebugController get() {
        return INSTANCE;
    }

    public static boolean isKeyHeld(int keycode) {
        return INSTANCE.heldKeys.contains(keycode);
    }

    public static boolean isKeyJustPressed(int keycode) {
        return INSTANCE.justPressedKeys.contains(keycode);
    }

    public volatile boolean paused = false;
    public volatile int pendingSteps = 0;
    public volatile boolean captureRequested = false;
    public volatile String lastCapturePath = "";
    public volatile String lastCaptureError = "";
    public volatile String lastCaptureBase64 = "";
    public volatile int lastCaptureWidth = 0;
    public volatile int lastCaptureHeight = 0;
    public volatile String renderMode = "default";
    public volatile boolean lifecyclePaused = false;

    public GLProfiler profiler;
    public int lastFps = 0;
    public float lastDelta = 0f;
    public int lastDrawCalls = 0;
    public int lastShaderSwitches = 0;
    public int lastTextureBindings = 0;
    public int lastCalls = 0;
    public float lastVertexCount = 0f;
    public int lastBatchRenderCalls = 0;
    public long frameIndex = 0;
    public long startedAtMs = System.currentTimeMillis();
    public int port = 17478;

    public String customShaderName = "spritebatch-default";
    public String customShaderVertPath = "";
    public String customShaderFragPath = "";
    public String customShaderLog = "";
    public boolean customShaderCompiled = true;

    private final Set<Integer> heldKeys = new HashSet<>();
    private final Set<Integer> justPressedKeys = new HashSet<>();
    private final Set<Integer> oneShotKeys = new HashSet<>();

    public synchronized boolean consumeStep() {
        if (!paused) return true;
        if (pendingSteps > 0) {
            pendingSteps--;
            return true;
        }
        return false;
    }

    public synchronized void requestStep(int frames) {
        paused = true;
        pendingSteps += Math.max(1, frames);
    }

    public synchronized void holdKey(int keycode, boolean down) {
        if (down) heldKeys.add(keycode);
        else heldKeys.remove(keycode);
    }

    public synchronized void tapKey(int keycode) {
        heldKeys.add(keycode);
        justPressedKeys.add(keycode);
        oneShotKeys.add(keycode);
    }

    public synchronized void endFrame() {
        for (Integer key : oneShotKeys) {
            heldKeys.remove(key);
        }
        oneShotKeys.clear();
        justPressedKeys.clear();
    }

    public synchronized void clearInput() {
        heldKeys.clear();
        justPressedKeys.clear();
        oneShotKeys.clear();
    }

    public synchronized int[] heldKeyArray() {
        int[] out = new int[heldKeys.size()];
        int i = 0;
        for (Integer k : heldKeys) out[i++] = k;
        return out;
    }
}
