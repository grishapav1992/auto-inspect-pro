import { AnimatePresence } from "framer-motion";
import { ChevronRight, Check, AlertTriangle } from "lucide-react";

export interface StepCTAReason {
  text: string;
  onClick?: () => void;
}

interface StepCTAProps {
  onClick: () => void;
  disabled: boolean;
  reasons?: (string | StepCTAReason)[];
  label?: string;
  icon?: "next" | "done";
}

const StepCTA = ({
  onClick,
  disabled,
  reasons = [],
  label = "Продолжить",
  icon = "next",
}: StepCTAProps) => {
  const IconComponent = icon === "done" ? Check : ChevronRight;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {disabled && reasons.length > 0 && (
          <div className="rounded-lg border border-[hsl(var(--warning)/0.25)] bg-[hsl(var(--warning)/0.04)] px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-[hsl(var(--warning))]" />
              <p className="text-[11px] font-medium text-[hsl(var(--warning))]">
                Для продолжения:
              </p>
            </div>
            {reasons.map((reason, i) => {
              const isObj = typeof reason === "object";
              const text = isObj ? reason.text : reason;
              const handler = isObj ? reason.onClick : undefined;
              return handler ? (
                <div key={i} className="flex items-center justify-between pl-4 pr-1">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    • {text}
                  </p>
                  <button
                    type="button"
                    onClick={handler}
                    className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline transition-colors shrink-0"
                  >
                    перейти
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                  • {text}
                </p>
              );
            })}
          </div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-all disabled:opacity-40 active:opacity-90"
      >
        {label}
        <IconComponent className="h-4 w-4" />
      </button>
    </div>
  );
};

export default StepCTA;
