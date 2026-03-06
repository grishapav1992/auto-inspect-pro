import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection } from '@/types/inspection';
import { ArrowLeft, Camera, ImagePlus, Images, ChevronRight, Car, Shield, Layers, Sofa, Wrench, Cpu, FileCheck } from 'lucide-react';

const SECTION_ICONS: Record<InspectionSection, React.ReactNode> = {
  'car-info': <Car className="w-5 h-5" />,
  'legal-check': <Shield className="w-5 h-5" />,
  'body': <Layers className="w-5 h-5" />,
  'interior': <Sofa className="w-5 h-5" />,
  'technical': <Wrench className="w-5 h-5" />,
  'diagnostics': <Cpu className="w-5 h-5" />,
  'final-verdict': <FileCheck className="w-5 h-5" />,
};

const InspectionWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addMedia } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

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

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        await addMedia([{
          id: crypto.randomUUID(),
          dataUrl: reader.result as string,
          createdAt: new Date().toISOString(),
        }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          addMedia([{
            id: crypto.randomUUID(),
            dataUrl: reader.result as string,
            createdAt: new Date().toISOString(),
          }]);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const getSectionPhotoCount = (section: InspectionSection) =>
    inspection.media.filter(m => m.section === section).length;

  const getSectionCompletion = (section: InspectionSection): boolean => {
    switch (section) {
      case 'car-info':
        return !!(inspection.carInfo.make && inspection.carInfo.model);
      case 'legal-check':
        return inspection.legalChecks.every(c => c.status !== 'Не проверено');
      case 'final-verdict':
        return !!inspection.finalVerdict.verdict;
      default:
        return getSectionPhotoCount(section) > 0;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
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

      {/* Action buttons */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <Button variant="action" className="flex-col h-auto py-4 gap-2" onClick={handleCapture}>
          <Camera className="w-6 h-6" />
          <span className="text-xs">Снять фото</span>
        </Button>
        <Button variant="action" className="flex-col h-auto py-4 gap-2" onClick={handleUpload}>
          <ImagePlus className="w-6 h-6" />
          <span className="text-xs">Загрузить</span>
        </Button>
        <Button
          variant="action"
          className="flex-col h-auto py-4 gap-2 relative"
          onClick={() => navigate(`/inspection/${id}/media`)}
        >
          <Images className="w-6 h-6" />
          <span className="text-xs">Библиотека</span>
          {inspection.media.length > 0 && (
            <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {inspection.media.length}
            </span>
          )}
        </Button>
      </div>

      {/* Sections */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Разделы</h2>
        <div className="flex flex-col gap-2">
          {(Object.keys(SECTION_LABELS) as InspectionSection[]).map(section => {
            const count = getSectionPhotoCount(section);
            const complete = getSectionCompletion(section);
            return (
              <button
                key={section}
                className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 active:bg-secondary transition-colors text-left w-full"
                onClick={() => navigate(`/inspection/${id}/section/${section}`)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${complete ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                  {SECTION_ICONS[section]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{SECTION_LABELS[section]}</p>
                  {count > 0 && <p className="text-xs text-muted-foreground">{count} фото</p>}
                </div>
                <div className="flex items-center gap-2">
                  {complete && (
                    <span className="w-2 h-2 rounded-full bg-success" />
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report preview */}
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
    </div>
  );
};

export default InspectionWorkspace;
