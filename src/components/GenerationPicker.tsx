import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Generation, Restyling } from "@/types/generation";

interface GenerationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (generation: Generation, restyling: Restyling) => void;
  generations: Generation[];
  selectedRestylingId?: number | null;
}

const slideVariants = {
  enterFromRight: { x: "100%", opacity: 0 },
  enterFromLeft: { x: "-100%", opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: "-50%", opacity: 0 },
  exitToRight: { x: "50%", opacity: 0 },
};

function parseYear(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

function getRestylingLabel(r: Restyling): string {
  const start = parseYear(r.yearStart.date);
  const end = r.yearEnd ? parseYear(r.yearEnd.date) : "н.в.";
  const restNum = parseInt(r.restyling);
  const suffix = restNum === 0 ? "" : ` рест. ${restNum}`;
  return `${start}–${end}${suffix}`;
}

function getRestylingPhoto(r: Restyling): string | null {
  const mPhoto = r.photos.find((p) => p.size === "m");
  const sPhoto = r.photos.find((p) => p.size === "s");
  return mPhoto?.urlX1 || sPhoto?.urlX1 || null;
}

const GenerationPicker = ({
  open,
  onOpenChange,
  onSelect,
  generations,
  selectedRestylingId,
}: GenerationPickerProps) => {
  const [step, setStep] = useState<"generation" | "restyling">("generation");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pickedGen, setPickedGen] = useState<Generation | null>(null);

  const resetState = () => {
    setStep("generation");
    setPickedGen(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  const goToRestylings = (gen: Generation) => {
    // If only one restyling, select it directly
    if (gen.restylings.length === 1) {
      onSelect(gen, gen.restylings[0]);
      handleOpenChange(false);
      return;
    }
    setPickedGen(gen);
    setDirection(1);
    setStep("restyling");
  };

  const goBack = () => {
    setDirection(-1);
    setStep("generation");
  };

  const handleRestylingSelect = (r: Restyling) => {
    if (pickedGen) {
      onSelect(pickedGen, r);
      handleOpenChange(false);
    }
  };

  const title = step === "generation" ? "Выберите поколение" : `Поколение ${pickedGen?.generation} — рестайлинг`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {step === "restyling" && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-full p-1 transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
            )}
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {step === "generation" ? (
              <motion.div
                key="gen-list"
                custom={direction}
                initial={direction === -1 ? "enterFromLeft" : "enterFromRight"}
                animate="center"
                exit={direction === 1 ? "exitToLeft" : "exitToRight"}
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-3 pb-4 grid gap-3">
                  {generations.map((gen) => {
                    const firstRestyling = gen.restylings[0];
                    const photo = firstRestyling ? getRestylingPhoto(firstRestyling) : null;
                    const frameLabel = gen.frames.map((f) => f.frame).join(" / ");
                    const yearRange = gen.restylings.length > 0
                      ? `${parseYear(gen.restylings[gen.restylings.length - 1].yearStart.date)}–${
                          gen.restylings[0].yearEnd
                            ? parseYear(gen.restylings[0].yearEnd.date)
                            : "н.в."
                        }`
                      : "";

                    return (
                      <motion.button
                        key={gen.id}
                        type="button"
                        onClick={() => goToRestylings(gen)}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
                      >
                        {photo && (
                          <img
                            src={photo}
                            alt={`Поколение ${gen.generation}`}
                            className="h-16 w-24 rounded-lg object-cover bg-muted flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            Поколение {gen.generation}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {frameLabel} · {yearRange}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {gen.restylings.length} рестайлинг(ов)
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="restyling-list"
                custom={direction}
                initial={direction === 1 ? "enterFromRight" : "enterFromLeft"}
                animate="center"
                exit={direction === -1 ? "exitToRight" : "exitToLeft"}
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-3 pb-4 grid gap-3">
                  {pickedGen?.restylings.map((r) => {
                    const photo = getRestylingPhoto(r);
                    const label = getRestylingLabel(r);
                    const frameLabel = r.frames.map((f) => f.frame).join(" / ");
                    const isSelected = selectedRestylingId === r.id;

                    return (
                      <motion.button
                        key={r.id}
                        type="button"
                        onClick={() => handleRestylingSelect(r)}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent ${
                          isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        {photo && (
                          <img
                            src={photo}
                            alt={label}
                            className="h-16 w-24 rounded-lg object-cover bg-muted flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{frameLabel}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerationPicker;
