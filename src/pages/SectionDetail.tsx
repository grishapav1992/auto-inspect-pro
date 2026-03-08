import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { InspectionSection, SECTION_LABELS, DEFAULT_DAMAGE_TAGS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, ImagePlus, Images, Check, Tag, Save } from 'lucide-react';
import CarInfoSection from '@/components/sections/CarInfoSection';
import LegalCheckSection from '@/components/sections/LegalCheckSection';
import DiagnosticsSection from '@/components/sections/DiagnosticsSection';
import FinalVerdictSection from '@/components/sections/FinalVerdictSection';
import { useMediaImages } from '@/hooks/useMediaImages';

const SectionDetail = () => {
  const { id, section } = useParams<{ id: string; section: InspectionSection }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addMedia, updateMedia, updateBodyPaintThickness, customDamageTags, addCustomDamageTag } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showTagPicker, setShowTagPicker] = useState(false);

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

  const togglePhoto = (mediaId: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const allTags = [...DEFAULT_DAMAGE_TAGS, ...customDamageTags.filter(t => !DEFAULT_DAMAGE_TAGS.includes(t))];

  const handleApplyTag = (tag: string) => {
    selectedPhotos.forEach(mediaId => {
      const media = sectionMedia.find(m => m.id === mediaId);
      const currentTags = media?.damageTags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      updateMedia(mediaId, { damageTags: newTags });
    });
  };

  const getSelectedTags = (): string[] => {
    if (selectedPhotos.size === 0) return [];
    const selected = Array.from(selectedPhotos);
    const firstMedia = sectionMedia.find(m => m.id === selected[0]);
    return firstMedia?.damageTags || [];
  };

  const renderBodySection = () => {
    const bodyMedia = inspection.media.filter(m => m.section === 'body');
    const bodyMediaIds = bodyMedia.map(m => m.id);

    return (
      <div className="flex flex-col gap-4">
        {/* General paint thickness */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Общая толщина ЛКП
          </label>
          <input
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="напр. 100–150 мкм"
            value={inspection.bodyPaintThickness || ''}
            onChange={e => {
              setActiveInspection(id!);
              updateBodyPaintThickness(e.target.value);
            }}
          />
        </div>

        {/* Photo grid */}
        {bodyMedia.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Фото ({bodyMedia.length})
              </label>
              {selectedPhotos.size > 0 && (
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setShowTagPicker(true)}>
                  <Tag className="w-3 h-3" /> Теги ({selectedPhotos.size})
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {selectedPhotos.size > 0
                ? 'Нажмите «Теги», чтобы отметить дефекты'
                : 'Нажмите на фото, чтобы выбрать и назначить теги'}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {bodyMedia.map(m => {
                const selected = selectedPhotos.has(m.id);
                const tags = m.damageTags || [];
                return (
                  <div
                    key={m.id}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${
                      selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                    }`}
                    onClick={() => togglePhoto(m.id)}
                  >
                    {images[m.id] ? (
                      <img src={images[m.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                    {selected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 px-1.5 py-0.5">
                        <p className="text-[10px] text-primary-foreground truncate">{tags.join(', ')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {bodyMedia.length === 0 && (
          <p className="text-muted-foreground text-center py-10">
            Добавьте фото кузова, чтобы отметить дефекты
          </p>
        )}

        {/* Tag picker sheet */}
        {showTagPicker && (
          <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowTagPicker(false)}>
            <div className="bg-card w-full rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-foreground text-lg mb-4">Отметить дефекты</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {allTags.map(tag => {
                  const selectedTags = getSelectedTags();
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? tag === 'OK' ? 'bg-success text-success-foreground' :
                            tag === 'Риск' ? 'bg-destructive text-destructive-foreground' :
                            'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                      onClick={() => handleApplyTag(tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setShowTagPicker(false)}>Готово</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

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

      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleCapture}>
          <Camera className="w-4 h-4" /> Снять
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={handleGalleryUpload}>
          <ImagePlus className="w-4 h-4" /> Галерея
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/inspection/${id}/media`)}>
          <Images className="w-4 h-4" /> Библиотека
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
