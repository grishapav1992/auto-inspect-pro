import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { brands, type Brand } from "@/data/brands";
import { getModelsByBrandId, type CarModel } from "@/data/models";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "brand" | "model";

interface BrandModelPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (brand: Brand, model: CarModel) => void;
  selectedBrandId?: number | null;
  selectedModelId?: number | null;
}

const slideVariants = {
  enterFromRight: { x: "100%", opacity: 0 },
  enterFromLeft: { x: "-100%", opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: "-50%", opacity: 0 },
  exitToRight: { x: "50%", opacity: 0 },
};

const BrandModelPicker = ({
  open,
  onOpenChange,
  onSelect,
  selectedBrandId,
  selectedModelId,
}: BrandModelPickerProps) => {
  const [step, setStep] = useState<Step>("brand");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [search, setSearch] = useState("");
  const [pickedBrand, setPickedBrand] = useState<Brand | null>(null);

  const resetState = useCallback(() => {
    setStep("brand");
    setSearch("");
    setPickedBrand(null);
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
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

  const goToModels = (brand: Brand) => {
    setPickedBrand(brand);
    setSearch("");
    setDirection(1);
    setStep("model");
  };

  const goBackToBrands = () => {
    setSearch("");
    setDirection(-1);
    setStep("brand");
  };

  const handleModelSelect = (model: CarModel) => {
    if (pickedBrand) {
      onSelect(pickedBrand, model);
      handleOpenChange(false);
    }
  };

  const title = step === "brand" ? "Выберите марку" : `${pickedBrand?.name} — модель`;
  const placeholder = step === "brand" ? "Поиск марки..." : "Поиск модели...";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {step === "model" && (
              <button
                type="button"
                onClick={goBackToBrands}
                className="rounded-full p-1 transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
            )}
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
        </DialogHeader>

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

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {step === "brand" ? (
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
                      onClick={() => goToModels(brand)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                        selectedBrandId === brand.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      <span>{brand.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
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
                        selectedModelId === m.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      <span>{m.model}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandModelPicker;
