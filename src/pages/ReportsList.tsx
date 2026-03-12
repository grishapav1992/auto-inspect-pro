import { Search, FileEdit, CheckCircle2, Trash2, ChevronRight, Gauge, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { loadDrafts, deleteDraft, getDraftDisplayInfo, type ReportDraft } from "@/lib/draftStorage";
import { loadCompletedReports, deleteCompletedReport, finalizeDraftToReport, type CompletedReport } from "@/lib/completedReportStorage";

const verdictConfig = {
  recommended: { label: "Рекомендован", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/8", dot: "bg-[hsl(var(--success))]" },
  with_reservations: { label: "С оговорками", color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/8", dot: "bg-[hsl(var(--warning))]" },
  not_recommended: { label: "Не рекомендован", color: "text-destructive", bg: "bg-destructive/8", dot: "bg-destructive" },
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
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 pb-3 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Мои отчёты</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Автоподбор</p>
          </div>
          <button
            onClick={() => navigate("/create")}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по марке или модели..."
            className="pl-8 h-9 text-sm"
          />
        </div>
      </header>

      <div className="px-4 pt-3">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="drafts" className="flex-1 gap-1.5">
              <FileEdit className="h-3.5 w-3.5" />
              Черновики
              {filteredDrafts.length > 0 && (
                <span className="ml-1 rounded-md bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                  {filteredDrafts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Завершённые
              {filteredCompleted.length > 0 && (
                <span className="ml-1 rounded-md bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                  {filteredCompleted.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            <div className="space-y-2 pt-2">
              {filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-muted-foreground">
                  <FileEdit className="mb-3 h-8 w-8 opacity-40" />
                  <p className="text-sm">Нет черновиков</p>
                </div>
              ) : (
                filteredDrafts.map((draft) => {
                  const brand = draft.carResult?.brand.name ?? "";
                  const model = draft.carResult?.model.model ?? "";
                  const carLabel = brand && model ? `${brand} ${model}` : "";
                  const titleLabel = carLabel || draft.vin || draft.plate || "Новый отчёт";
                  return (
                    <div
                      key={draft.id}
                      onClick={() => navigate(`/create?draft=${draft.id}`)}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 cursor-pointer transition-colors hover:border-primary/30 active:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-foreground truncate">{titleLabel}</h3>
                        {carLabel && draft.vin && (
                          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground tracking-wider truncate">{draft.vin}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Шаг {draft.currentStep + 1} из {draft.totalSteps}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-muted-foreground">{draft.updatedAt}</span>
                          <span className="rounded-md bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Продолжить
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDraft(draft.id, e)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-2 pt-2">
              {filteredCompleted.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-muted-foreground">
                  <CheckCircle2 className="mb-3 h-8 w-8 opacity-40" />
                  <p className="text-sm">Нет завершённых отчётов</p>
                  <p className="text-[11px] mt-1 text-muted-foreground/70">Завершите осмотр, чтобы увидеть результат</p>
                </div>
              ) : (
                filteredCompleted.map((report) => {
                  const v = verdictConfig[report.verdict];
                  const title = report.brand && report.model
                    ? `${report.brand} ${report.model}`
                    : report.vin || "Отчёт";
                  const km = parseInt(report.mileage, 10);

                  return (
                    <div
                      key={report.id}
                      onClick={() => navigate(`/report/${report.id}`)}
                      className="rounded-lg border border-border bg-card p-3.5 cursor-pointer transition-colors hover:border-primary/30 active:bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
                            {report.generation && (
                              <span className="text-[11px] text-muted-foreground">{report.generation}</span>
                            )}
                            {report.fullInspection && (
                              <span className="flex items-center gap-1 rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                <Star className="h-2.5 w-2.5" />
                                Полный
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-muted-foreground">
                            {!isNaN(km) && km > 0 && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Gauge className="h-3 w-3" />
                                {km.toLocaleString("ru-RU")} км
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">{report.createdAt}</span>
                          <button
                            onClick={(e) => handleDeleteCompleted(report.id, e)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {report.checklist.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-1">
                          {report.checklist.slice(0, 2).map((item, j) => (
                            <p key={j} className="text-[11px] text-muted-foreground leading-relaxed truncate">
                              {item.emoji} {item.text}
                            </p>
                          ))}
                          {report.checklist.length > 2 && (
                            <p className="text-[10px] text-muted-foreground/50">
                              +{report.checklist.length - 2} ещё...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
