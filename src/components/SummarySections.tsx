/**
 * SummarySections — shared renderer for summary section cards.
 * Used by both CreateReport (summary step) and ReportDetail.
 */

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
  mediaGroups?: Record<string, MediaItem[]>;
  onOpenMediaRef?: (ref: MediaRef) => void;
  onOpenCollage?: (items: MediaItem[], index: number, groupName: MediaGroupName) => void;
}

export function SummarySections({
  sections,
  mediaGroups,
  onOpenMediaRef,
  onOpenCollage,
}: SummarySectionsProps) {
  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        const groupName = TITLE_TO_GROUP[sec.title];
        const groupItems = groupName && mediaGroups ? mediaGroups[groupName] : undefined;

        return (
          <div
            key={sec.title}
            className="rounded-lg border border-border bg-card p-3.5"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{sec.emoji}</span>
              <span className="text-[13px] font-medium flex-1">{sec.title}</span>
              {sec.required ? (
                <span className="text-[9px] font-medium text-primary bg-primary/6 rounded-md px-1.5 py-0.5">
                  обяз.
                </span>
              ) : (
                <span className="text-[9px] font-medium text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                  доп.
                </span>
              )}
            </div>

            {/* Details */}
            <div className="space-y-0.5">
              {sec.details.map((d, j) => {
                if (typeof d === "string") {
                  return (
                    <p key={j} className="text-[11px] text-muted-foreground leading-relaxed">
                      • {d}
                    </p>
                  );
                }
                return <SummaryDetailLine key={j} detail={d} onOpenMediaRef={onOpenMediaRef} />;
              })}
            </div>

            {/* Media grid */}
            {groupItems && groupItems.length > 0 && (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {groupItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative rounded-md overflow-hidden cursor-pointer transition-opacity active:opacity-80 aspect-square"
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
          </div>
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
      className={`text-[11px] leading-relaxed ${hasMedia ? "cursor-pointer active:opacity-70" : ""}`}
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
    <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">📋</span>
        <span className="text-[13px] font-medium">Сводка по данным осмотра</span>
      </div>
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/85 whitespace-pre-line">
          {note || "Заполните разделы осмотра для формирования сводки."}
        </p>
      </div>
    </div>
  );
}

/** Card showing photos without damage (noDamage, isDraft, or no inspection) */
export function NoDamageMediaCard({
  mediaGroups,
  onOpenCollage,
}: {
  mediaGroups?: Record<string, MediaItem[]>;
  onOpenCollage?: (items: MediaItem[], index: number, groupName: MediaGroupName) => void;
}) {
  if (!mediaGroups) return null;

  // Collect all "clean" items across groups: noDamage, isDraft, or no inspection at all
  const cleanItems: { item: MediaItem; groupName: string }[] = [];
  for (const [groupName, items] of Object.entries(mediaGroups)) {
    for (const item of items) {
      const ins = item.inspection;
      if (!ins) {
        // No inspection at all — unassigned
        cleanItems.push({ item, groupName });
      } else if (ins.noDamage) {
        // Explicitly marked "no damage"
        cleanItems.push({ item, groupName });
      } else if (ins.isDraft && ins.tags.length === 0) {
        // Draft without tags — not yet categorized as damaged
        cleanItems.push({ item, groupName });
      }
    }
  }

  if (cleanItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">✅</span>
        <span className="text-[13px] font-medium flex-1">Обзор авто</span>
        <span className="text-[9px] font-medium text-[hsl(var(--success))] bg-[hsl(var(--success)/0.08)] rounded-md px-1.5 py-0.5">
          {cleanItems.length} фото
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Элементы без выявленных повреждений и нераспределённые фото
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {cleanItems.map(({ item, groupName }, idx) => (
          <div
            key={item.id}
            className="relative rounded-md overflow-hidden cursor-pointer transition-opacity active:opacity-80 aspect-square"
            onClick={() => {
              // Build flat list of just the clean items for lightbox navigation
              const allClean = cleanItems.map(c => c.item);
              onOpenCollage?.(allClean, idx, groupName as MediaGroupName);
            }}
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
            {/* Small badge for status */}
            {item.inspection?.isDraft && !item.inspection?.noDamage && (
              <div className="absolute bottom-0.5 left-0.5 bg-muted-foreground/70 text-white text-[8px] font-medium px-1 py-0.5 rounded">
                Черновик
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Итог специалиста (read-only view for completed reports) */
export function ExpertConclusionCard({ conclusion }: { conclusion: string }) {
  if (!conclusion) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">✍️</span>
        <span className="text-[13px] font-medium">Итог специалиста</span>
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        🔒 Видна только заказчику
      </p>
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/85 whitespace-pre-line">
          {conclusion}
        </p>
      </div>
    </div>
  );
}
