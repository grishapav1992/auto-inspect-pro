import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection, REQUIRED_SECTIONS } from '@/types/inspection';
import { ArrowLeft, ChevronRight, Car, Shield, Layers, Sofa, Wrench, Cpu, FileCheck, Gauge, Zap, Navigation, Plus, X, Trash2 } from 'lucide-react';

const SECTION_ICONS: Record<InspectionSection, React.ReactNode> = {
  'car-info': <Car className="w-5 h-5" />,
  'legal-check': <Shield className="w-5 h-5" />,
  'body': <Layers className="w-5 h-5" />,
  'interior': <Sofa className="w-5 h-5" />,
  'under-hood': <Gauge className="w-5 h-5" />,
  'technical': <Wrench className="w-5 h-5" />,
  'electrical': <Zap className="w-5 h-5" />,
  'diagnostics': <Cpu className="w-5 h-5" />,
  'test-drive': <Navigation className="w-5 h-5" />,
  'final-verdict': <FileCheck className="w-5 h-5" />,
};

const OPTIONAL_SECTIONS: InspectionSection[] = (Object.keys(SECTION_LABELS) as InspectionSection[]).filter(
  s => !REQUIRED_SECTIONS.includes(s)
);

const InspectionWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, toggleOptionalSection } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    if (id) setActiveInspection(id);
  }, [id, setActiveInspection]);

  if (!inspection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Осмотр не найден.</p>
      </div>
    );
  }

  const carLabel = inspection.carInfo.make && inspection.carInfo.model
    ? `${inspection.carInfo.make} ${inspection.carInfo.model} ${inspection.carInfo.year || ''}`
    : 'Авто не указано';

  const enabledOptional = inspection.enabledOptionalSections || [];

  const getSectionPhotoCount = (section: InspectionSection) =>
    inspection.media.filter(m => m.section === section).length;

  const getSectionCompletion = (section: InspectionSection): boolean => {
    switch (section) {
      case 'car-info':
        return !!(inspection.carInfo.make && inspection.carInfo.model);
      case 'legal-check':
        return inspection.legalChecks.every(c => c.status !== 'Не проверено');
      case 'diagnostics':
        return inspection.diagnostics.every(d => d.status !== 'Не проверено');
      case 'test-drive':
        return (inspection.testDrive || []).every(d => d.status !== 'Не проверено');
      case 'final-verdict':
        return !!inspection.finalVerdict.verdict;
      default:
        return getSectionPhotoCount(section) > 0;
    }
  };

  // Sections to display: required + enabled optional
  const visibleSections: InspectionSection[] = [
    ...REQUIRED_SECTIONS,
    ...enabledOptional,
  ];

  // Optional sections not yet added
  const availableOptional = OPTIONAL_SECTIONS.filter(s => !enabledOptional.includes(s));

  const handleRemoveOptional = (e: React.MouseEvent, section: InspectionSection) => {
    e.stopPropagation();
    toggleOptionalSection(section);
  };

  const renderSectionButton = (section: InspectionSection) => {
    const count = getSectionPhotoCount(section);
    const complete = getSectionCompletion(section);
    const isRequired = REQUIRED_SECTIONS.includes(section);
    const isOptional = !isRequired;

    return (
      <button
        key={section}
        className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 active:bg-secondary transition-colors text-left w-full"
        onClick={() => navigate(`/inspection/${id}/section/${section}`)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${complete ? 'bg-success/10 text-success' : isRequired && !complete ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
          {SECTION_ICONS[section]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">
            {SECTION_LABELS[section]}
            {isRequired && !complete && <span className="text-destructive ml-1">*</span>}
          </p>
          {count > 0 && <p className="text-xs text-muted-foreground">{count} фото</p>}
          {isRequired && !complete && <p className="text-xs text-destructive">Обязательный</p>}
        </div>
        <div className="flex items-center gap-2">
          {complete && <span className="w-2 h-2 rounded-full bg-success" />}
          {isOptional && (
            <button
              className="p-1.5 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleRemoveOptional(e, section)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{carLabel}</p>
            <p className="text-xs text-muted-foreground">
              {inspection.carInfo.inspectionDate || 'Нет даты'} · {inspection.media.length} фото
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Разделы</h2>
        <div className="flex flex-col gap-2">
          {visibleSections.map(section => renderSectionButton(section))}

          {/* Add section button */}
          {availableOptional.length > 0 && (
            <button
              className="bg-card rounded-2xl border border-dashed border-muted-foreground/30 p-4 flex items-center gap-4 active:bg-secondary transition-colors text-left w-full"
              onClick={() => setShowAddSheet(true)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-secondary text-muted-foreground">
                <Plus className="w-5 h-5" />
              </div>
              <p className="font-medium text-muted-foreground">Добавить раздел</p>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => navigate(`/inspection/${id}/report`)}
        >
          <FileCheck className="w-5 h-5" />
          Предпросмотр отчёта
        </Button>
      </div>

      {/* Add section sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowAddSheet(false)}>
          <div className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Добавить раздел</h3>
              <button onClick={() => setShowAddSheet(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {availableOptional.map(section => (
                <button
                  key={section}
                  className="bg-secondary rounded-2xl p-4 flex items-center gap-4 active:bg-muted transition-colors text-left w-full"
                  onClick={() => {
                    toggleOptionalSection(section);
                    if (availableOptional.length <= 1) setShowAddSheet(false);
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-background text-muted-foreground">
                    {SECTION_ICONS[section]}
                  </div>
                  <p className="font-medium text-foreground flex-1">{SECTION_LABELS[section]}</p>
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionWorkspace;
