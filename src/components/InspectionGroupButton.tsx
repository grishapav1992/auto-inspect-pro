import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import type { PartInspection } from "@/types/inspection";
import { DAMAGE_TAGS, DAMAGE_TAG_GROUPS } from "@/types/inspection";
import { isInspectionFilled } from "@/lib/completionContract";
import type { ReactNode } from "react";

export interface InspectionGroupDef {
  title: string;
  icon: ReactNode;
  partIds: string[];
  partLabels: Record<string, string>;
}

interface InspectionGroupButtonProps {
  group: InspectionGroupDef;
  inspections: Record<string, PartInspection>;
  onClick: () => void;
  delay?: number;
  customTags?: Record<string, { label: string; emoji: string }>;
}

const InspectionGroupButton = ({
  group,
  inspections,
  onClick,
  delay = 0,
  customTags,
}: InspectionGroupButtonProps) => {
  const filledCount = group.partIds.filter((id) => {
    const ins = inspections[id];
    return ins && isInspectionFilled(ins);
  }).length;
  const totalCount = group.partIds.length;
  const allDone = filledCount === totalCount;
  const hasDamage = group.partIds.some((id) => {
    const ins = inspections[id];
    return ins && !ins.noDamage && ins.tags.length > 0;
  });

  const partsWithData = group.partIds
    .map((id) => {
      const ins = inspections[id];
      if (!ins || !isInspectionFilled(ins)) return null;
      return { id, label: group.partLabels[id] || id, ins };
    })
    .filter(Boolean) as { id: string; label: string; ins: PartInspection }[];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-all ${
        allDone
          ? hasDamage
            ? "border-destructive/30 bg-destructive/5"
            : "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.04)]"
          : "border-border/70 hover:border-primary/40"
      }`}
    >
      <span className="text-xl mt-0.5 w-7 h-7 flex items-center justify-center flex-shrink-0">{group.icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{group.title}</p>
          <span className="text-[11px] text-muted-foreground ml-2">
            {filledCount}/{totalCount}
          </span>
        </div>
        {partsWithData.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {partsWithData.map((pd) => {
              const tagLabels: { id: string; label: string; emoji: string }[] = pd.ins.tags
                .map((t: string) => {
                  const dt = DAMAGE_TAGS.find((dt) => dt.id === t);
                  if (dt) return dt as { id: string; label: string; emoji: string };
                  if (customTags && customTags[t]) return { id: t, label: customTags[t].label, emoji: customTags[t].emoji };
                  return null;
                })
                .filter(Boolean) as { id: string; label: string; emoji: string }[];
              const isClean = pd.ins.noDamage;
              return (
                <div key={pd.id} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">{pd.label}:</span>
                  {isClean && (
                    <span className="text-[10px] text-[hsl(var(--success))] font-medium">ОК</span>
                  )}
                  {tagLabels.map((tag) => {
                    const isSerious = DAMAGE_TAG_GROUPS[0].tags.some((st) => st.id === tag.id);
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
              );
            })}
          </div>
        )}
      </div>
      {allDone ? (
        <span className="text-xs font-medium text-[hsl(var(--success))] mt-0.5">✅</span>
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
      )}
    </motion.button>
  );
};

export default InspectionGroupButton;
