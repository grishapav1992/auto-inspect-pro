import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { getModelsByBrandId, type CarModel } from "@/data/models";

interface ModelPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (model: CarModel) => void;
  brandId: number;
  brandName: string;
  selectedModelId?: number | null;
}

const ModelPicker = ({ open, onOpenChange, onSelect, brandId, brandName, selectedModelId }: ModelPickerProps) => {
  const [search, setSearch] = useState("");

  const allModels = useMemo(() => getModelsByBrandId(brandId), [brandId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allModels;
    const q = search.toLowerCase();
    return allModels.filter((m) => m.model.toLowerCase().includes(q));
  }, [search, allModels]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">{brandName} — модель</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск модели..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-2 pb-4">
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Нет моделей</p>
            )}
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m);
                  onOpenChange(false);
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                  selectedModelId === m.id ? "bg-accent font-medium" : ""
                }`}
              >
                <span>{m.model}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelPicker;
