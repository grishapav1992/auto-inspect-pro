import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { InspectionSection, SECTION_LABELS, BODY_PARTS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, Camera, ImagePlus, Images, Check, MapPin, Save } from 'lucide-react';
import CarInfoSection from '@/components/sections/CarInfoSection';
import LegalCheckSection from '@/components/sections/LegalCheckSection';
import DiagnosticsSection from '@/components/sections/DiagnosticsSection';
import FinalVerdictSection from '@/components/sections/FinalVerdictSection';
import { useMediaImages } from '@/hooks/useMediaImages';

const SectionDetail = () => {
  const { id, section } = useParams<{ id: string; section: InspectionSection }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addMedia, updateMedia } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());
  const [showPartPicker, setShowPartPicker] = useState(false);

  if (!inspection || !section) return null;

  const sectionMedia = inspection.media.filter(m => m.section === section);
  const mediaIds = sectionMedia.map(m => m.id);
  const images = useMediaImages(mediaIds);

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setActiveInspection(id!);
        addMedia([{ id: crypto.randomUUID(), dataUrl: reader.result as string, section, createdAt: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleGalleryUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setActiveInspection(id!);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          addMedia([{ id: crypto.randomUUID(), dataUrl: reader.result as string, section, createdAt: new Date().toISOString() }]);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const unassignedBodyMedia = inspection.media.filter(m => m.section === 'body' && !m.carPart);
  const unassignedBodyIds = unassignedBodyMedia.map(m => m.id);
  const unassignedImages = useMediaImages(unassignedBodyIds);

  const toggleUnassigned = (mediaId: string) => {
    setSelectedUnassigned(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const handleAssignToPart = (part: string) => {
    selectedUnassigned.forEach(mediaId => {
      updateMedia(mediaId, { carPart: part });
    });
    setSelectedUnassigned(new Set());
    setShowPartPicker(false);
  };

  const renderBodySection = () => (
    <div className="flex flex-col gap-2">
      {unassignedBodyMedia.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-foreground text-sm">Неназначенные фото ({unassignedBodyMedia.length})</p>
            {selectedUnassigned.size > 0 && (
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setShowPartPicker(true)}>
                <MapPin className="w-3 h-3" /> Назначить ({selectedUnassigned.size})
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {unassignedBodyMedia.map(m => {
              const selected = selectedUnassigned.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${selected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  onClick={() => toggleUnassigned(m.id)}
                >
                  {unassignedImages[m.id] ? (
                    <img src={unassignedImages[m.id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                  {selected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedUnassigned.size > 0
              ? 'Нажмите «Назначить», чтобы привязать к детали кузова'
              : 'Нажмите на фото, чтобы выбрать и назначить на деталь'}
          </p>
        </div>
      )}
      {BODY_PARTS.map(part => {
        const partPhotos = inspection.media.filter(m => m.section === 'body' && m.carPart === part).length;
        const partData = inspection.bodyParts[part];
        return (
          <button
            key={part}
            className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 active:bg-secondary transition-colors text-left w-full"
            onClick={() => navigate(`/inspection/${id}/section/body/part/${encodeURIComponent(part)}`)}
          >
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">{part}</p>
              <div className="flex gap-2 mt-1">
                {partPhotos > 0 && <span className="text-xs text-muted-foreground">{partPhotos} фото</span>}
                {partData?.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    partData.status === 'OK' ? 'bg-success/10 text-success' :
                    partData.status === 'Риск' ? 'bg-destructive/10 text-destructive' :
                    'bg-warning/10 text-warning'
                  }`}>{partData.status}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        );
      })}

      {/* Part picker sheet */}
      {showPartPicker && (
        <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowPartPicker(false)}>
          <div className="bg-card w-full rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground text-lg mb-4">Назначить на деталь</h3>
            <div className="flex flex-col gap-2">
              {BODY_PARTS.map(part => (
                <button
                  key={part}
                  className="p-4 rounded-xl bg-secondary text-foreground text-left font-medium active:bg-border transition-colors"
                  onClick={() => handleAssignToPart(part)}
                >
                  {part}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setShowPartPicker(false)}>Отмена</Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'car-info': return <CarInfoSection inspection={inspection} />;
      case 'legal-check': return <LegalCheckSection inspection={inspection} />;
      case 'body': return renderBodySection();
      case 'diagnostics': return <DiagnosticsSection inspection={inspection} />;
      case 'final-verdict': return <FinalVerdictSection inspection={inspection} />;
      default:
        return (
          <div>
            <div className="grid grid-cols-3 gap-1.5">
              {sectionMedia.map(m => (
                <div key={m.id} className="aspect-square rounded-xl overflow-hidden">
                  {images[m.id] ? (
                    <img src={images[m.id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                </div>
              ))}
            </div>
            {sectionMedia.length === 0 && (
              <p className="text-muted-foreground text-center py-10">В этом разделе пока нет фото.</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">{SECTION_LABELS[section]}</h1>
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleCapture}>
          <Camera className="w-4 h-4" /> Снять фото
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/inspection/${id}/media`)}>
          <ImagePlus className="w-4 h-4" /> Из библиотеки
        </Button>
      </div>

      <div className="px-4">
        {renderContent()}
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 mt-6">
        <Button size="lg" className="w-full" onClick={() => navigate(`/inspection/${id}`)}>
          <Save className="w-5 h-5" />
          Сохранить
        </Button>
      </div>
    </div>
  );
};

export default SectionDetail;
