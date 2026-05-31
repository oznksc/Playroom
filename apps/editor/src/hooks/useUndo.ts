import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

export function useUndo<T>(initial: T) {
  const [current, setCurrent] = useState<T>(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef(0);
  const bypassRef = useRef(false);

  const push = useCallback((mutator: (draft: T) => void) => {
    const prev = historyRef.current[indexRef.current];
    const draft = structuredClone(prev) as T;
    mutator(draft);

    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(draft);

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      indexRef.current = indexRef.current + 1;
    }

    historyRef.current = newHistory;
    bypassRef.current = true;
    setCurrent(draft);
    setCanUndo(indexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current = indexRef.current - 1;
    bypassRef.current = true;
    setCurrent(structuredClone(historyRef.current[indexRef.current]) as T);
    setCanUndo(indexRef.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current = indexRef.current + 1;
    bypassRef.current = true;
    setCurrent(structuredClone(historyRef.current[indexRef.current]) as T);
    setCanUndo(true);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  const reset = useCallback((value: T) => {
    historyRef.current = [value];
    indexRef.current = 0;
    bypassRef.current = true;
    setCurrent(value);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { current, setCurrent, push, undo, redo, reset, canUndo, canRedo, bypassRef };
}