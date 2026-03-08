import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection, AVAILABLE_ICONS, CustomSection } from '@/types/inspection';
import { ArrowLeft, ChevronRight, Car, Shield, Layers, Sofa, Wrench, Cpu, FileCheck, Plus, X, Trash2 } from 'lucide-react';
import { icons } from 'lucide-react';

const SECTION_ICONS: Record<InspectionSection, React.ReactNode> = {
  'car-info': <Car className="w-5 h-5" />,
  'legal-check': <Shield className="w-5 h-5" />,
  'body': <Layers className="w-5 h-5" />,
  'interior': <Sofa className="w-5 h-5" />,
  'technical': <Wrench className="w-5 h-5" />,
  'diagnostics': <Cpu className="w-5 h-5" />,
  'final-verdict': <FileCheck className="w-5 h-5" />,
};

const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
  const IconComponent = icons[iconName as keyof typeof icons];
  if (IconComponent) return <IconComponent className={className} />;
  return <Layers className={className} />;
};

const InspectionWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addCustomSection, removeCustomSection } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState<string>('Camera');

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

  const getSectionPhotoCount = (section: InspectionSection | string) =>
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

  const handleAddCustomSection = () => {
    if (!newSectionName.trim()) return;
    const section: CustomSection = {
      id: crypto.randomUUID(),
      name: newSectionName.trim(),
      icon: newSectionIcon,
      customTags: [],
    };
    addCustomSection(section);
    setNewSectionName('');
    setNewSectionIcon('Camera');
    setShowAddSection(false);
  };

  const handleDeleteCustomSection = (e: React.MouseEvent, sectionId: string) => {
    e.stopPropagation();
    removeCustomSection(sectionId);
  };

  const customSections = inspection.customSections || [];

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

      {/* Sections */}
      <div className="px-4 pt-4">
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
                  {complete && <span className="w-2 h-2 rounded-full bg-success" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          {/* Custom sections */}
          {customSections.map(cs => {
            const count = getSectionPhotoCount(`custom-${cs.id}`);
            return (
              <button
                key={cs.id}
                className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 active:bg-secondary transition-colors text-left w-full"
                onClick={() => navigate(`/inspection/${id}/section/custom-${cs.id}`)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${count > 0 ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                  {renderIcon(cs.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{cs.name}</p>
                  {count > 0 && <p className="text-xs text-muted-foreground">{count} фото</p>}
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && <span className="w-2 h-2 rounded-full bg-success" />}
                  <button
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteCustomSection(e, cs.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          {/* Add custom section button */}
          <button
            className="bg-card rounded-2xl border border-dashed border-muted-foreground/30 p-4 flex items-center gap-4 active:bg-secondary transition-colors text-left w-full"
            onClick={() => setShowAddSection(true)}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-secondary text-muted-foreground">
              <Plus className="w-5 h-5" />
            </div>
            <p className="font-medium text-muted-foreground">Добавить раздел</p>
          </button>
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

      {/* Add section modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowAddSection(false)}>
          <div className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Новый раздел</h3>
              <button onClick={() => setShowAddSection(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Название</label>
                <input
                  autoFocus
                  className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder="Например: Подкапотное пространство"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustomSection(); }}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Иконка</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-colors ${
                        newSectionIcon === iconName
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                      onClick={() => setNewSectionIcon(iconName)}
                    >
                      {renderIcon(iconName)}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleAddCustomSection} disabled={!newSectionName.trim()}>
                Создать раздел
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionWorkspace;
