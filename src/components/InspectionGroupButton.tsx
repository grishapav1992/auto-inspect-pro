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
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border bg-card px-3.5 py-3 transition-colors ${
        allDone
          ? hasDamage
            ? "border-destructive/25 bg-destructive/3"
            : "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.03)]"
          : "border-border hover:border-primary/30"
      }`}
    >
      <span className="text-lg mt-0.5 w-6 h-6 flex items-center justify-center flex-shrink-0">{group.icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-foreground">{group.title}</p>
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
                        className={`text-[10px] rounded-md px-1.5 py-0.5 font-medium ${
                          isSerious
                            ? "bg-destructive/8 text-destructive"
                            : "bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning))]"
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
        <Check className="h-4 w-4 text-[hsl(var(--success))] mt-0.5" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-0.5" />
      )}
    </button>
  );
};

export default InspectionGroupButton;
