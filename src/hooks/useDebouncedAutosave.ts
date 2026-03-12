import { useEffect, useRef, useCallback } from "react";
import { saveDraft, type ReportDraft } from "@/lib/draftStorage";

/**
 * useDebouncedAutosave — автосохранение черновика с debounce.
 * Сохраняет при каждом изменении данных (с задержкой) и при unmount.
 * При ошибках (напр. QuotaExceeded) подавляет повторные попытки на 30 секунд.
 */
export function useDebouncedAutosave(
  buildDraft: () => ReportDraft,
  finalized: React.MutableRefObject<boolean>,
  delay = 3000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const buildDraftRef = useRef(buildDraft);
  buildDraftRef.current = buildDraft;
  const isFirstRender = useRef(true);
  const errorCooldownRef = useRef(false);

  const doSave = useCallback(() => {
    if (finalized.current || errorCooldownRef.current) return;
    const draft = buildDraftRef.current();
    if (draft.vin || draft.plate || draft.mileage || draft.carResult || draft.currentStep > 0) {
      saveDraft(draft).catch(() => {
        // Suppress repeated save attempts for 30s after error
        errorCooldownRef.current = true;
        setTimeout(() => { errorCooldownRef.current = false; }, 30000);
      });
    }
  }, [finalized]);

  // Debounced save on every buildDraft change (= any state change)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (finalized.current || errorCooldownRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(doSave, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [buildDraft, finalized, delay, doSave]);

  // Save on unmount (immediate)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      doSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
