import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type UploadStage = "files" | "report" | "done" | "error";

interface UploadProgressDialogProps {
  open: boolean;
  onComplete: () => void;
  onError: () => void;
}

const STAGES: { key: UploadStage; label: string }[] = [
  { key: "files", label: "Загрузка файлов на сервер…" },
  { key: "report", label: "Отправка результатов осмотра…" },
  { key: "done", label: "Отчёт успешно сохранён!" },
];

/**
 * UploadProgressDialog — модальное окно с прогресс-баром,
 * имитирующее выгрузку файлов и данных на сервер.
 * В будущем mock-логика будет заменена реальными API-вызовами.
 */
const UploadProgressDialog = ({ open, onComplete, onError }: UploadProgressDialogProps) => {
  const [stage, setStage] = useState<UploadStage>("files");
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("files");
      setProgress(0);
      return;
    }

    // --- MOCK: имитация загрузки ---
    // Этап 1: загрузка файлов (0–60%)
    // Этап 2: отправка отчёта (60–100%)
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += Math.random() * 8 + 2;
      if (current >= 100) {
        current = 100;
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      setProgress(current);

      if (current < 60) {
        setStage("files");
      } else if (current < 100) {
        setStage("report");
      } else {
        setStage("done");
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  // Auto-close after "done"
  useEffect(() => {
    if (stage === "done") {
      const t = setTimeout(() => onComplete(), 1200);
      return () => clearTimeout(t);
    }
  }, [stage, onComplete]);

  if (!open) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5"
        >
          {/* Icon */}
          <div className="flex justify-center">
            {stage === "done" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-14 w-14 rounded-full bg-green-500/15 flex items-center justify-center"
              >
                <Check className="h-7 w-7 text-green-500" />
              </motion.div>
            ) : stage === "error" ? (
              <div className="h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary animate-pulse" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-center text-base font-semibold text-foreground">
            {stage === "error" ? "Ошибка загрузки" : "Выгрузка отчёта"}
          </h3>

          {/* Progress bar */}
          {stage !== "error" && (
            <div className="space-y-2">
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(Math.min(progress, 100))}%
              </p>
            </div>
          )}

          {/* Stages list */}
          <div className="space-y-2.5">
            {STAGES.map((s, i) => {
              const isDone = currentStageIndex > i || stage === "done";
              const isActive = currentStageIndex === i && stage !== "done";
              return (
                <div key={s.key} className="flex items-center gap-2.5">
                  {isDone ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      isDone
                        ? "text-muted-foreground line-through"
                        : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error retry */}
          {stage === "error" && (
            <button
              onClick={onError}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Попробовать снова
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadProgressDialog;
