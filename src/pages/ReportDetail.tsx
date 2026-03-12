import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2 } from "lucide-react";
import { loadCompletedReports, finalizeDraftToReport } from "@/lib/completedReportStorage";
import type { MediaRef } from "@/lib/summaryGenerator";
import type { MediaItem } from "@/components/SortableMediaGallery";
import type { MediaGroupName } from "@/components/SortableMediaGallery";
import { SummarySections, SummaryNoteCard, ExpertConclusionCard } from "@/components/SummarySections";
import { MediaLightbox, type LightboxState } from "@/components/MediaLightbox";

/** Build MediaItem arrays per group from draft.mediaFiles for collages & lightbox */
function buildMediaGroups(draft: any): Record<string, MediaItem[]> {
  const groups: Record<string, MediaItem[]> = {};
  if (!draft?.mediaFiles) return groups;
  for (const group of draft.mediaFiles as any[]) {
    if (!group.children || !group.groupName) continue;
    const items: MediaItem[] = [];
    for (const child of group.children) {
      if (child.url) {
        items.push({
          id: child.id,
          url: child.url,
          type: child.type || "image",
          inspection: child.inspection,
          groupName: child.groupName || group.groupName,
        });
      }
    }
    if (items.length > 0) groups[group.groupName] = items;
  }
  return groups;
}

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const reports = loadCompletedReports();
  const storedReport = reports.find((r) => r.id === id);

  const report = useMemo(() => {
    if (!storedReport) return null;
    if (!storedReport.draft) return storedReport;
    try {
      const recalculated = finalizeDraftToReport(storedReport.draft);
      return { ...storedReport, ...recalculated, id: storedReport.id, createdAt: storedReport.createdAt };
    } catch {
      return storedReport;
    }
  }, [storedReport]);

  const mediaGroups = useMemo(() => buildMediaGroups(report?.draft), [report]);

  const openMediaRef = useCallback((ref: MediaRef) => {
    const items = mediaGroups[ref.groupName];
    if (!items?.length) return;
    const idx = items.findIndex(c => c.id === ref.mediaId);
    setLightbox({
      items,
      index: idx >= 0 ? idx : 0,
      groupName: ref.groupName as MediaGroupName,
    });
  }, [mediaGroups]);

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Отчёт не найден
      </div>
    );
  }

  const title = report.brand && report.model ? `${report.brand} ${report.model}` : report.vin || "Отчёт";

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-background/80 backdrop-blur-xl px-4 pb-3 pt-12">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {report.createdAt}
            {report.generation ? ` · ${report.generation}` : ""}
          </p>
        </div>
        <button className="rounded-full p-2 transition-colors hover:bg-muted">
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 px-4"
      >
        <SummarySections
          sections={report.sections}
          mediaGroups={mediaGroups}
          onOpenMediaRef={openMediaRef}
          onOpenCollage={(items, index, groupName) =>
            setLightbox({ items, index, groupName })
          }
        />

        {report.summaryNote && <SummaryNoteCard note={report.summaryNote} />}
        <ExpertConclusionCard conclusion={report.expertConclusion || ""} />
      </motion.div>

      <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
};

export default ReportDetail;
