import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { brands, type Brand } from "@/data/brands";
import { Search, ChevronRight } from "lucide-react";

interface BrandPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (brand: Brand) => void;
  selectedBrandId?: number | null;
}

const BrandPicker = ({ open, onOpenChange, onSelect, selectedBrandId }: BrandPickerProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Выберите марку</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск марки..."
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
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
            )}
            {filtered.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => {
                  onSelect(brand);
                  onOpenChange(false);
                  setSearch("");
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                  selectedBrandId === brand.id ? "bg-accent font-medium" : ""
                }`}
              >
                <span>{brand.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandPicker;
