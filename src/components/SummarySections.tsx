/**
 * SummarySections — shared renderer for summary section cards.
 * Used by both CreateReport (summary step) and ReportDetail.
 */

import { motion } from "framer-motion";
import type { SummarySection, SummaryDetail, MediaRef } from "@/lib/summaryGenerator";
import type { MediaItem, MediaGroupName } from "@/components/SortableMediaGallery";

const TITLE_TO_GROUP: Record<string, string> = {
  "Кузов": "body",
  "Остекление": "glass",
  "Силовые элементы кузова": "structural",
  "Светотехника": "lighting",
  "Подкапотное пространство": "underhood",
  "Салон": "interior",
  "Колёса и шины": "wheels",
  "Колёса и тормозные механизмы": "wheels",
  "Компьютерная диагностика": "diagnostics",
  "Диагностика": "diagnostics",
};

interface SummarySectionsProps {
  sections: SummarySection[];
  /** Map of groupName → MediaItem[] for collages and lightbox navigation */
  mediaGroups?: Record<string, MediaItem[]>;
  /** Called when user clicks a media ref in a detail line */
  onOpenMediaRef?: (ref: MediaRef) => void;
  /** Called when user clicks a collage thumbnail */
  onOpenCollage?: (items: MediaItem[], index: number, groupName: MediaGroupName) => void;
}

export function SummarySections({
  sections,
  mediaGroups,
  onOpenMediaRef,
  onOpenCollage,
}: SummarySectionsProps) {
  return (
    <div className="space-y-2.5">
      {sections.map((sec, i) => {
        const groupName = TITLE_TO_GROUP[sec.title];
        const groupItems = groupName && mediaGroups ? mediaGroups[groupName] : undefined;

        return (
          <motion.div
            key={sec.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-lg border border-border/60 bg-card p-3.5"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{sec.emoji}</span>
              <span className="text-sm font-semibold flex-1">{sec.title}</span>
              {sec.required ? (
                <span className="text-[9px] font-medium text-primary/70 bg-primary/8 rounded px-1.5 py-0.5 mr-1">
                  обяз.
                </span>
              ) : (
                <span className="text-[9px] font-medium text-muted-foreground/50 bg-muted/50 rounded px-1.5 py-0.5 mr-1">
                  доп.
                </span>
              )}
            </div>

            {/* Details */}
            <div className="space-y-0.5">
              {sec.details.map((d, j) => {
                if (typeof d === "string") {
                  return (
                    <p key={j} className="text-xs text-muted-foreground leading-relaxed">
                      • {d}
                    </p>
                  );
                }
                return <SummaryDetailLine key={j} detail={d} onOpenMediaRef={onOpenMediaRef} />;
              })}
            </div>

            {/* Masonry collage */}
            {groupItems && groupItems.length > 0 && (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {groupItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-lg overflow-hidden cursor-pointer active:opacity-80 transition-opacity aspect-square"
                    onClick={() =>
                      onOpenCollage?.(groupItems, idx, groupName as MediaGroupName)
                    }
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/** Individual detail line with severity coloring and media click */
function SummaryDetailLine({
  detail,
  onOpenMediaRef,
}: {
  detail: SummaryDetail;
  onOpenMediaRef?: (ref: MediaRef) => void;
}) {
  const colorClass =
    detail.severity === "serious"
      ? "text-destructive"
      : detail.severity === "minor"
      ? "text-[hsl(var(--warning))]"
      : detail.severity === "ok"
      ? "text-[hsl(var(--success))]"
      : "text-muted-foreground";

  const hasMedia = detail.mediaRefs && detail.mediaRefs.length > 0;

  const handleClick = () => {
    if (!hasMedia || !onOpenMediaRef) return;
    onOpenMediaRef(detail.mediaRefs![0]);
  };

  return (
    <p
      className={`text-xs leading-relaxed ${hasMedia ? "cursor-pointer active:opacity-70" : ""}`}
      onClick={hasMedia ? handleClick : undefined}
    >
      <span className="text-muted-foreground">• {detail.label}: </span>
      {detail.label === "Объявление" && detail.value.startsWith("http") ? (
        <a
          href={detail.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all"
        >
          {detail.value}
        </a>
      ) : (
        <span className={colorClass}>{detail.value}</span>
      )}
    </p>
  );
}

/** Сводка по данным осмотра */
export function SummaryNoteCard({ note }: { note: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">📋</span>
        <span className="text-sm font-semibold">Сводка по данным осмотра</span>
      </div>
      <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
          {note || "Заполните разделы осмотра для формирования сводки."}
        </p>
      </div>
    </motion.div>
  );
}

/** Итог специалиста (read-only view for completed reports) */
export function ExpertConclusionCard({ conclusion }: { conclusion: string }) {
  if (!conclusion) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">✍️</span>
        <span className="text-sm font-semibold">Итог специалиста</span>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <span>🔒</span> Видна только заказчику
      </p>
      <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
          {conclusion}
        </p>
      </div>
    </motion.div>
  );
}
