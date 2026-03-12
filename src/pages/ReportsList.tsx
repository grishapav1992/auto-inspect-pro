import { Search, FileEdit, CheckCircle2, Trash2, ChevronRight, Gauge, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { loadDrafts, deleteDraft, getDraftDisplayInfo, type ReportDraft } from "@/lib/draftStorage";
import { loadCompletedReports, deleteCompletedReport, finalizeDraftToReport, type CompletedReport } from "@/lib/completedReportStorage";

const verdictConfig = {
  recommended: { label: "Рекомендован", color: "text-primary", bg: "bg-primary/10", dot: "bg-primary" },
  with_reservations: { label: "С оговорками", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10", dot: "bg-[hsl(var(--warning))]" },
  not_recommended: { label: "Не рекомендован", color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
};

const ReportsList = () => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("completed");
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [completed, setCompleted] = useState<CompletedReport[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setDrafts(loadDrafts());
    setCompleted(loadCompletedReports());
  }, []);

  // Recalculate completed reports with fresh custom tags
  const recalculatedCompleted = useMemo(() => {
    return completed.map((report) => {
      if (!report.draft) return report;
      try {
        const fresh = finalizeDraftToReport(report.draft);
        return { ...report, ...fresh, id: report.id, createdAt: report.createdAt };
      } catch {
        return report;
      }
    });
  }, [completed]);

  const filteredDrafts = drafts.filter((d) => {
    const { label } = getDraftDisplayInfo(d);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const filteredCompleted = recalculatedCompleted.filter((r) => {
    const text = `${r.brand} ${r.model} ${r.vin} ${r.plate}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(id);
    setDrafts(loadDrafts());
  };

  const handleDeleteCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCompletedReport(id);
    setCompleted(loadCompletedReports());
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg px-4 pb-3 pt-12 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold text-foreground tracking-tight"
            >
              Мои отчёты
            </motion.h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Автоподбор</p>
          </div>
          <button
            onClick={() => navigate("/create")}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all active:scale-95 shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по марке или модели..."
            className="pl-9 bg-card border-border/70 h-9 text-sm"
          />
        </div>
      </header>

      <div className="px-4 pt-2">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="drafts" className="flex-1 gap-1.5">
              <FileEdit className="h-3.5 w-3.5" />
              Черновики
              {filteredDrafts.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                  {filteredDrafts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Завершённые
              {filteredCompleted.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                  {filteredCompleted.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            <div className="space-y-3 pt-2">
              {filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-muted-foreground">
                  <FileEdit className="mb-3 h-10 w-10" />
                  <p className="text-sm">Нет черновиков</p>
                </div>
              ) : (
                filteredDrafts.map((draft, i) => {
                  const brand = draft.carResult?.brand.name ?? "";
                  const model = draft.carResult?.model.model ?? "";
                  const carLabel = brand && model ? `${brand} ${model}` : "";
                  const titleLabel = carLabel || draft.vin || draft.plate || "Новый отчёт";
                  return (
                    <motion.div
                      key={draft.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                    >
                      <div
                        onClick={() => navigate(`/create?draft=${draft.id}`)}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-3.5 cursor-pointer transition-all active:scale-[0.99] hover:border-primary/30"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-foreground truncate">{titleLabel}</h3>
                          {carLabel && draft.vin && (
                            <p className="mt-0.5 text-[11px] font-mono text-muted-foreground tracking-wider truncate">{draft.vin}</p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Шаг {draft.currentStep + 1} из {draft.totalSteps}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground">{draft.updatedAt}</span>
                            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                              Продолжить
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteDraft(draft.id, e)}
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-3 pt-2">
              {filteredCompleted.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-muted-foreground">
                  <CheckCircle2 className="mb-3 h-10 w-10" />
                  <p className="text-sm">Нет завершённых отчётов</p>
                  <p className="text-xs mt-1">Завершите осмотр, чтобы увидеть результат</p>
                </div>
              ) : (
                filteredCompleted.map((report, i) => {
                  const v = verdictConfig[report.verdict];
                  const title = report.brand && report.model
                    ? `${report.brand} ${report.model}`
                    : report.vin || "Отчёт";
                  const km = parseInt(report.mileage, 10);

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                    >
                      <div
                        onClick={() => navigate(`/report/${report.id}`)}
                        className="rounded-xl border border-border/60 bg-card p-4 cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-foreground truncate">{title}</h3>
                              {report.generation && (
                                <span className="text-xs text-muted-foreground">{report.generation}</span>
                              )}
                              {report.fullInspection && (
                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  <Star className="h-3 w-3 fill-current" />
                                  Полный
                                </span>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                              {!isNaN(km) && km > 0 && (
                                <span className="flex items-center gap-1 text-xs">
                                  <Gauge className="h-3 w-3" />
                                  {km.toLocaleString("ru-RU")} км
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-muted-foreground">{report.createdAt}</span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteCompleted(report.id, e)}
                              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick checklist preview — first 2 items */}
                        {report.checklist.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                            {report.checklist.slice(0, 2).map((item, j) => (
                              <p key={j} className="text-[11px] text-muted-foreground leading-relaxed truncate">
                                {item.emoji} {item.text}
                              </p>
                            ))}
                            {report.checklist.length > 2 && (
                              <p className="text-[10px] text-muted-foreground/60">
                                +{report.checklist.length - 2} ещё...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsList;
