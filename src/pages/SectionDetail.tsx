import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { InspectionSection, SECTION_LABELS, BODY_PARTS, DEFAULT_DAMAGE_TAGS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ImagePlus, Images, Check, X, Pencil, Plus, Filter } from 'lucide-react';
import CarInfoSection from '@/components/sections/CarInfoSection';
import LegalCheckSection from '@/components/sections/LegalCheckSection';
import DiagnosticsSection from '@/components/sections/DiagnosticsSection';
import FinalVerdictSection from '@/components/sections/FinalVerdictSection';
import MediaDetailSheet from '@/components/MediaDetailSheet';
import { useMediaImages } from '@/hooks/useMediaImages';

const SectionDetail = () => {
  const { id, section } = useParams<{ id: string; section: InspectionSection }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addMedia, updateMedia, removeMedia, bulkAssignMedia, updateBodyPaintThickness, customDamageTags, addCustomDamageTag } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkDamageTags, setBulkDamageTags] = useState<string[]>([]);
  const [bulkPaintMin, setBulkPaintMin] = useState('');
  const [bulkPaintMax, setBulkPaintMax] = useState('');
  const [bulkCarPart, setBulkCarPart] = useState<string | undefined>();
  const [bulkNote, setBulkNote] = useState('');
  const [bulkNewTag, setBulkNewTag] = useState('');
  const [showBulkNewTagInput, setShowBulkNewTagInput] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  const allTags = [...DEFAULT_DAMAGE_TAGS, ...customDamageTags.filter(t => !DEFAULT_DAMAGE_TAGS.includes(t))];

  if (!inspection || !section) return null;

  const sectionMedia = inspection.media.filter(m => m.section === section);
  const mediaIds = sectionMedia.map(m => m.id);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const images = useMediaImages(mediaIds);

  const editingMedia = editingMediaId ? inspection.media.find(m => m.id === editingMediaId) || null : null;

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

  const toggleSelect = (mediaId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === sectionMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sectionMedia.map(m => m.id)));
    }
  };

  const handleMediaClick = (mediaId: string) => {
    if (selectionMode) {
      toggleSelect(mediaId);
    } else {
      setEditingMediaId(mediaId);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    removeMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const resetBulkForm = () => {
    setBulkDamageTags([]);
    setBulkPaintMin('');
    setBulkPaintMax('');
    setBulkCarPart(undefined);
    setBulkNote('');
    setBulkNewTag('');
    setShowBulkNewTagInput(false);
  };

  const openBulkEdit = () => {
    resetBulkForm();
    setShowBulkEditSheet(true);
  };

  const handleBulkApply = () => {
    const updates: Record<string, any> = {};
    if (bulkDamageTags.length > 0) updates.damageTags = bulkDamageTags;
    if (bulkPaintMin) updates.paintThicknessMin = Number(bulkPaintMin);
    if (bulkPaintMax) updates.paintThicknessMax = Number(bulkPaintMax);
    if (bulkCarPart) updates.carPart = bulkCarPart;
    if (bulkNote) updates.note = bulkNote;
    if (Object.keys(updates).length > 0) {
      bulkAssignMedia(Array.from(selectedIds), updates);
    }
    setSelectedIds(new Set());
    setShowBulkEditSheet(false);
    setSelectionMode(false);
    resetBulkForm();
  };

  const toggleBulkTag = (tag: string) => {
    setBulkDamageTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleBulkAddCustomTag = () => {
    const trimmed = bulkNewTag.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      addCustomDamageTag(trimmed);
      setBulkDamageTags(prev => [...prev, trimmed]);
    } else if (trimmed && allTags.includes(trimmed) && !bulkDamageTags.includes(trimmed)) {
      setBulkDamageTags(prev => [...prev, trimmed]);
    }
    setBulkNewTag('');
    setShowBulkNewTagInput(false);
  };

  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    setter(value.replace(/[^0-9]/g, ''));
  };

  const getTagColor = (tag: string, active: boolean) => {
    if (!active) return 'bg-secondary text-secondary-foreground';
    if (tag === 'OK') return 'bg-success text-success-foreground';
    if (tag === 'Риск') return 'bg-destructive text-destructive-foreground';
    return 'bg-primary text-primary-foreground';
  };

  // Non-media sections render their own content
  const isMediaSection = !['car-info', 'legal-check', 'diagnostics', 'final-verdict'].includes(section);

  const renderSpecialSection = () => {
    switch (section) {
      case 'car-info': return <CarInfoSection inspection={inspection} />;
      case 'legal-check': return <LegalCheckSection inspection={inspection} />;
      case 'diagnostics': return <DiagnosticsSection inspection={inspection} />;
      case 'final-verdict': return <FinalVerdictSection inspection={inspection} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground flex-1">{SECTION_LABELS[section]}</h1>
          {isMediaSection && (
            <span className="text-sm text-muted-foreground">{sectionMedia.length} фото</span>
          )}
        </div>
      </div>

      {!isMediaSection ? (
        <div className="px-4 py-3">{renderSpecialSection()}</div>
      ) : (
        <>
          {/* Body-specific: general paint thickness */}
          {section === 'body' && (
            <div className="px-4 pt-3">
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
          )}

          {/* Action bar */}
          <div className="px-4 py-3 flex items-center justify-between">
            {selectionMode ? (
              <button className="text-sm font-medium text-foreground" onClick={selectAll}>
                {selectedIds.size === sectionMedia.length && sectionMedia.length > 0 ? 'Снять выделение' : 'Выбрать все'}
              </button>
            ) : (
              <button className="text-sm font-medium text-primary" onClick={() => setSelectionMode(true)}>
                Выбрать
              </button>
            )}
            <div className="flex gap-2">
              {selectionMode && (
                <Button size="sm" variant="ghost" onClick={exitSelectionMode}>Отмена</Button>
              )}
              <Button size="sm" variant="outline" onClick={handleGalleryUpload}>
                <ImagePlus className="w-4 h-4" /> Галерея
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/inspection/${id}/media`)}>
                <Images className="w-4 h-4" /> Библиотека
              </Button>
            </div>
          </div>

          {/* Photo grid */}
          {sectionMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Фото пока нет. Загрузите из галереи или библиотеки.</p>
              <Button onClick={handleGalleryUpload}>Загрузить фото</Button>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-3 gap-1.5">
              {sectionMedia.map(media => {
                const selected = selectedIds.has(media.id);
                const src = images[media.id];
                return (
                  <div
                    key={media.id}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onClick={() => handleMediaClick(media.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedIds(new Set([media.id]));
                      }
                    }}
                  >
                    {src ? (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                    {selectionMode && (
                      <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'bg-primary border-primary' : 'border-muted-foreground/50 bg-background/60'
                      }`}>
                        {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-wrap gap-0.5">
                      {media.damageTags?.map(tag => (
                        <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-md ${getTagColor(tag, true)}`}>
                          {tag}
                        </span>
                      ))}
                      {(media.paintThicknessMin || media.paintThicknessMax) && (
                        <span className="text-[9px] bg-accent/80 text-accent-foreground px-1.5 py-0.5 rounded-md">
                          {media.paintThicknessMin && media.paintThicknessMax
                            ? `${media.paintThicknessMin}–${media.paintThicknessMax} мкм`
                            : media.paintThicknessMin ? `от ${media.paintThicknessMin} мкм`
                            : `до ${media.paintThicknessMax} мкм`}
                        </span>
                      )}
                      {media.carPart && (
                        <span className="text-[9px] bg-accent/80 text-accent-foreground px-1.5 py-0.5 rounded-md">
                          {media.carPart}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom bar for selection */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-2 z-20">
              <Button size="sm" className="flex-1" onClick={openBulkEdit}>
                <Pencil className="w-4 h-4" /> Заключение ({selectedIds.size})
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                <X className="w-4 h-4" /> Удалить
              </Button>
            </div>
          )}

          {/* Bulk edit sheet */}
          {showBulkEditSheet && (
            <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowBulkEditSheet(false)}>
              <div className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground text-lg">Заключение для {selectedIds.size} фото</h3>
                  <button onClick={() => setShowBulkEditSheet(false)} className="p-1 text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Damage tags */}
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Повреждения</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${getTagColor(tag, bulkDamageTags.includes(tag))}`}
                          onClick={() => toggleBulkTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                      {showBulkNewTagInput ? (
                        <div className="flex gap-1 items-center">
                          <input
                            autoFocus
                            className="bg-secondary rounded-xl px-3 py-2 text-sm text-foreground outline-none w-28"
                            placeholder="Название..."
                            value={bulkNewTag}
                            onChange={e => setBulkNewTag(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleBulkAddCustomTag(); if (e.key === 'Escape') setShowBulkNewTagInput(false); }}
                            maxLength={30}
                          />
                          <button onClick={handleBulkAddCustomTag} className="p-1.5 bg-primary text-primary-foreground rounded-lg">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="px-3.5 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground border border-dashed border-muted-foreground/30"
                          onClick={() => setShowBulkNewTagInput(true)}
                        >
                          <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />Свой тег
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Paint thickness */}
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Толщина ЛКП (мкм)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="От"
                        inputMode="numeric"
                        value={bulkPaintMin}
                        onChange={e => handleNumericInput(e.target.value, setBulkPaintMin)}
                      />
                      <span className="text-muted-foreground">—</span>
                      <input
                        className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="До"
                        inputMode="numeric"
                        value={bulkPaintMax}
                        onChange={e => handleNumericInput(e.target.value, setBulkPaintMax)}
                      />
                    </div>
                  </div>

                  {/* Car part (for body section) */}
                  {section === 'body' && (
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Деталь кузова</label>
                      <select
                        className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 outline-none border-none text-sm"
                        value={bulkCarPart || ''}
                        onChange={e => setBulkCarPart(e.target.value || undefined)}
                      >
                        <option value="">Не указана</option>
                        {BODY_PARTS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Заметка</label>
                    <textarea
                      className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px]"
                      placeholder="Общий комментарий..."
                      value={bulkNote}
                      onChange={e => setBulkNote(e.target.value)}
                    />
                  </div>

                  <Button className="w-full" onClick={handleBulkApply}>
                    Применить ко всем ({selectedIds.size})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Individual media detail sheet */}
          <MediaDetailSheet
            media={editingMedia}
            onClose={() => setEditingMediaId(null)}
            onUpdate={updateMedia}
          />
        </>
      )}
    </div>
  );
};

export default SectionDetail;
