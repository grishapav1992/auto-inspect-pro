import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PartInspection } from "@/types/inspection";
import { CAR_PARTS, DAMAGE_TAGS, DAMAGE_TAG_GROUPS } from "@/types/inspection";
import { ChevronRight, Plus, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const SERIOUS_TAG_IDS = new Set<string>(DAMAGE_TAG_GROUPS[0].tags.map((t) => t.id));

interface CarPartsListProps {
  inspections: Record<string, PartInspection>;
  onPartsSelect: (partIds: string[]) => void;
  onPartClick: (partId: string) => void;
}

const partIcons: Record<string, string> = {
  front_bumper: "🛡️",
  hood: "🔲",
  windshield: "🪟",
  left_front_fender: "◀️",
  right_front_fender: "▶️",
  left_front_door: "🚪",
  right_front_door: "🚪",
  left_rear_door: "🚪",
  right_rear_door: "🚪",
  roof: "⬛",
  left_rear_fender: "◀️",
  right_rear_fender: "▶️",
  rear_window: "🪟",
  trunk: "📦",
  rear_bumper: "🛡️",
};

const groups = [
  { title: "Передняя часть", parts: ["front_bumper", "hood"] },
  { title: "Левая сторона", parts: ["left_front_fender", "left_front_door", "left_rear_door", "left_rear_fender"] },
  { title: "Правая сторона", parts: ["right_front_fender", "right_front_door", "right_rear_door", "right_rear_fender"] },
  { title: "Верх", parts: ["roof"] },
  { title: "Задняя часть", parts: ["trunk", "rear_bumper"] },
];

const InspectedPartCard = ({
  partId,
  inspection,
  onPartClick,
}: {
  partId: string;
  inspection: PartInspection;
  onPartClick: (id: string) => void;
}) => {
  const part = CAR_PARTS.find((p) => p.id === partId);
  if (!part) return null;

  const isClean = inspection.noDamage;
  const photoCount = inspection.photos?.length || 0;
  const tagLabels = (inspection.tags
    .map((t: string) => DAMAGE_TAGS.find((dt) => dt.id === t))
    .filter(Boolean) || []) as { id: string; label: string; emoji: string }[];
  const paint = inspection.paintThickness;
  const hasPaint = paint && (paint.from !== 80 || paint.to !== 200);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPartClick(partId)}
      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent/50 active:bg-accent transition-colors border-b border-border last:border-b-0 bg-card"
    >
      <span className="text-lg w-7 text-center flex-shrink-0">{partIcons[partId] || "🔧"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{part.label}</p>
        {isClean && (
          <p className="text-[11px] text-[hsl(var(--success))] font-medium mt-0.5">
            ✅ Без повреждений
          </p>
        )}
        {!isClean && tagLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tagLabels.map((tag) => {
              const isSerious = SERIOUS_TAG_IDS.has(tag.id);
              return (
                <span
                  key={tag.id}
                  className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                    isSerious
                      ? "bg-destructive/10 text-destructive"
                      : "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning)/0.85)]"
                  }`}
                >
                  {tag.emoji} {tag.label}
                </span>
              );
            })}
          </div>
        )}
        {hasPaint && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            🎨 {paint.from}–{paint.to} мкм
          </p>
        )}
        {inspection.note && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{inspection.note}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {photoCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            📷 {photoCount}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </motion.button>
  );
};

const MultiSelectDropdown = ({
  unfilledParts,
  onConfirm,
}: {
  unfilledParts: string[];
  onConfirm: (partIds: string[]) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const toggle = (partId: string) => {
    setSelected((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId]
    );
  };

  const handleConfirm = () => {
    if (selected.length > 0) {
      onConfirm(selected);
      setSelected([]);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border/80 bg-card px-3 py-2.5 text-muted-foreground hover:border-primary/40 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[13px]">
            Выбрать элементы ({unfilledParts.length})
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover border border-border shadow-md" align="start">
        <div className="max-h-60 overflow-y-auto p-1">
          {unfilledParts.map((partId) => {
            const part = CAR_PARTS.find((p) => p.id === partId);
            if (!part) return null;
            const isChecked = selected.includes(partId);
            return (
              <button
                key={partId}
                type="button"
                onClick={() => toggle(partId)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Checkbox checked={isChecked} className="pointer-events-none" />
                <span>{partIcons[partId] || "🔧"}</span>
                <span className="text-foreground">{part.label}</span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Check className="h-4 w-4" />
              Осмотреть ({selected.length})
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const CarPartsList = ({ inspections, onPartsSelect, onPartClick }: CarPartsListProps) => {
  return (
    <div className="space-y-5">
      {groups.map((group, gi) => {
        const filledParts = group.parts.filter((id) => {
          const ins = inspections[id];
          return ins && (ins.noDamage || ins.tags.length > 0);
        });
        const unfilledParts = group.parts.filter((id) => !filledParts.includes(id));
        const filledCount = filledParts.length;
        const totalCount = group.parts.length;

        return (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06 }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {filledCount}/{totalCount}
              </span>
            </div>

            {/* Filled parts */}
            {filledParts.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden mb-2">
                <AnimatePresence mode="popLayout">
                  {filledParts.map((partId) => (
                    <InspectedPartCard
                      key={partId}
                      partId={partId}
                      inspection={inspections[partId]}
                      onPartClick={onPartClick}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Multi-select dropdown for unfilled parts */}
            {unfilledParts.length > 0 && (
              <MultiSelectDropdown
                unfilledParts={unfilledParts}
                onConfirm={onPartsSelect}
              />
            )}

            {/* All filled indicator */}
            {unfilledParts.length === 0 && (
              <p className="text-[11px] text-[hsl(var(--success))] font-medium px-1">
                ✅ Все элементы осмотрены
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default CarPartsList;
