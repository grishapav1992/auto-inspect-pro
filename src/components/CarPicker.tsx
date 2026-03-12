import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { brands, type Brand } from "@/data/brands";
import { getModelsByBrandId, type CarModel } from "@/data/models";
import { mockCamryGenerations } from "@/data/mockGenerations";
import type { Generation, Restyling } from "@/types/generation";
import { Search, ChevronRight, ArrowLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "brand" | "model" | "generation" | "restyling";

export interface CarPickerResult {
  brand: Brand;
  model: CarModel;
  generation?: Generation;
  restyling?: Restyling;
}

interface CarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: CarPickerResult) => void;
  initialBrand?: Brand | null;
  initialModel?: CarModel | null;
  initialRestylingId?: number | null;
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

const stepTitles: Record<Step, string> = {
  brand: "Выберите марку",
  model: "Выберите модель",
  generation: "Выберите поколение",
  restyling: "Выберите рестайлинг",
};

const CarPicker = ({
  open,
  onOpenChange,
  onSelect,
  initialBrand,
  initialModel,
  initialRestylingId,
}: CarPickerProps) => {
  const [step, setStep] = useState<Step>("brand");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [search, setSearch] = useState("");
  const [pickedBrand, setPickedBrand] = useState<Brand | null>(null);
  const [pickedModel, setPickedModel] = useState<CarModel | null>(null);
  const [pickedGen, setPickedGen] = useState<Generation | null>(null);

  const resetState = useCallback(() => {
    setStep("brand");
    setSearch("");
    setPickedBrand(null);
    setPickedModel(null);
    setPickedGen(null);
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  // Navigation helpers
  const goTo = (nextStep: Step, dir: 1 | -1 = 1) => {
    setSearch("");
    setDirection(dir);
    setStep(nextStep);
  };

  // Brand list
  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [search]);

  // Model list
  const models = useMemo(
    () => (pickedBrand ? getModelsByBrandId(pickedBrand.id) : []),
    [pickedBrand]
  );
  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter((m) => m.model.toLowerCase().includes(q));
  }, [search, models]);

  // Generations (mock for now)
  const generations = mockCamryGenerations;

  // Handlers
  const handleBrandSelect = (brand: Brand) => {
    setPickedBrand(brand);
    goTo("model");
  };

  const handleModelSelect = (model: CarModel) => {
    setPickedModel(model);
    goTo("generation");
  };

  const handleGenSelect = (gen: Generation) => {
    if (gen.restylings.length === 1) {
      // Auto-select single restyling
      if (pickedBrand && pickedModel) {
        onSelect({ brand: pickedBrand, model: pickedModel, generation: gen, restyling: gen.restylings[0] });
        handleOpenChange(false);
      }
      return;
    }
    setPickedGen(gen);
    goTo("restyling");
  };

  const handleRestylingSelect = (r: Restyling) => {
    if (pickedBrand && pickedModel && pickedGen) {
      onSelect({ brand: pickedBrand, model: pickedModel, generation: pickedGen, restyling: r });
      handleOpenChange(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case "model":
        goTo("brand", -1);
        break;
      case "generation":
        goTo("model", -1);
        break;
      case "restyling":
        goTo("generation", -1);
        break;
      default:
        handleOpenChange(false);
    }
  };

  // Breadcrumb
  const breadcrumb: string[] = [];
  if (pickedBrand && step !== "brand") breadcrumb.push(pickedBrand.name);
  if (pickedModel && (step === "generation" || step === "restyling")) breadcrumb.push(pickedModel.model);
  if (pickedGen && step === "restyling") breadcrumb.push(`Пок. ${pickedGen.generation}`);

  const showSearch = step === "brand" || step === "model";
  const placeholder = step === "brand" ? "Поиск марки..." : "Поиск модели...";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full p-1 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">{stepTitles[step]}</DialogTitle>
              {breadcrumb.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">{breadcrumb.join(" → ")}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Search (brand/model only) */}
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {/* BRAND LIST */}
            {step === "brand" && (
              <motion.div
                key="brand-list"
                custom={direction}
                initial={direction === -1 ? "enterFromLeft" : "enterFromRight"}
                animate="center"
                exit={direction === 1 ? "exitToLeft" : "exitToRight"}
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-2 pb-4">
                  {filteredBrands.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
                  )}
                  {filteredBrands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => handleBrandSelect(brand)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                        initialBrand?.id === brand.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      <span>{brand.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* MODEL LIST */}
            {step === "model" && (
              <motion.div
                key="model-list"
                custom={direction}
                initial={direction === 1 ? "enterFromRight" : "enterFromLeft"}
                animate="center"
                exit={direction === -1 ? "exitToRight" : "exitToLeft"}
                variants={slideVariants}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-2 pb-4">
                  {filteredModels.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Нет моделей</p>
                  )}
                  {filteredModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModelSelect(m)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                        initialModel?.id === m.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      <span>{m.model}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* GENERATION LIST */}
            {step === "generation" && (
              <motion.div
                key="gen-list"
                custom={direction}
                initial={direction === 1 ? "enterFromRight" : "enterFromLeft"}
                animate="center"
                exit={direction === -1 ? "exitToRight" : "exitToLeft"}
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
                          gen.restylings[0].yearEnd ? parseYear(gen.restylings[0].yearEnd.date) : "н.в."
                        }`
                      : "";

                    return (
                      <motion.button
                        key={gen.id}
                        type="button"
                        onClick={() => handleGenSelect(gen)}
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
                          <p className="text-sm font-semibold text-foreground">Поколение {gen.generation}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{frameLabel} · {yearRange}</p>
                          <p className="text-xs text-muted-foreground">{gen.restylings.length} рестайлинг(ов)</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* RESTYLING LIST */}
            {step === "restyling" && (
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
                    const isSelected = initialRestylingId === r.id;

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

export default CarPicker;
