import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection, BODY_PARTS, SECTION_DAMAGE_TAGS, DEFAULT_DAMAGE_TAGS } from '@/types/inspection';
import { ArrowLeft, Check, X, Search, Filter, Pencil, Plus } from 'lucide-react';
import { useMediaImages } from '@/hooks/useMediaImages';
import MediaDetailSheet from '@/components/MediaDetailSheet';

const MediaLibrary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, updateMedia, removeMedia, bulkAssignMedia, addMedia, setActiveInspection, customDamageTags, addCustomDamageTag } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<InspectionSection | 'all'>('all');
  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkDamageTags, setBulkDamageTags] = useState<string[]>([]);
  const [bulkPaintMin, setBulkPaintMin] = useState('');
  const [bulkPaintMax, setBulkPaintMax] = useState('');
  const [bulkSection, setBulkSection] = useState<InspectionSection | undefined>();
  const [bulkCarPart, setBulkCarPart] = useState<string | undefined>();
  const [bulkNote, setBulkNote] = useState('');
  const [bulkNewTag, setBulkNewTag] = useState('');
  const [showBulkNewTagInput, setShowBulkNewTagInput] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  const allTags = [...DEFAULT_DAMAGE_TAGS, ...Object.values(SECTION_DAMAGE_TAGS).flat().filter((t, i, a) => a.indexOf(t) === i && !DEFAULT_DAMAGE_TAGS.includes(t)), ...customDamageTags.filter(t => !DEFAULT_DAMAGE_TAGS.includes(t))];

  useEffect(() => { if (id) setActiveInspection(id); }, [id, setActiveInspection]);

  const filteredMedia = useMemo(() => {
    if (!inspection) return [];
    return inspection.media.filter(m => {
      if (filterSection !== 'all' && m.section !== filterSection) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (m.note?.toLowerCase().includes(q)) ||
          (m.carPart?.toLowerCase().includes(q)) ||
          (m.section && SECTION_LABELS[m.section]?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [inspection, filterSection, searchQuery]);

  const mediaIds = useMemo(() => filteredMedia.map(m => m.id), [filteredMedia]);
  const images = useMediaImages(mediaIds);

  if (!inspection) return null;

  const editingMedia = editingMediaId ? inspection.media.find(m => m.id === editingMediaId) || null : null;

  const toggleSelect = (mediaId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map(m => m.id)));
    }
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

  const handleBulkApply = () => {
    const updates: Record<string, any> = {};
    if (bulkDamageTags.length > 0) updates.damageTags = bulkDamageTags;
    if (bulkPaintMin) updates.paintThicknessMin = Number(bulkPaintMin);
    if (bulkPaintMax) updates.paintThicknessMax = Number(bulkPaintMax);
    if (bulkSection) updates.section = bulkSection;
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

  const resetBulkForm = () => {
    setBulkDamageTags([]);
    setBulkPaintMin('');
    setBulkPaintMax('');
    setBulkSection(undefined);
    setBulkCarPart(undefined);
    setBulkNote('');
    setBulkNewTag('');
    setShowBulkNewTagInput(false);
  };

  const openBulkEdit = () => {
    resetBulkForm();
    setShowBulkEditSheet(true);
  };

  const handleDeleteSelected = () => {
    removeMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
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

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground flex-1">Медиатека</h1>
          <span className="text-sm text-muted-foreground">{inspection.media.length} файлов</span>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="Поиск по заметке, детали..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="bg-secondary text-foreground text-sm rounded-xl px-3 py-2.5 outline-none border-none"
            value={filterSection}
            onChange={e => setFilterSection(e.target.value as InspectionSection | 'all')}
          >
            <option value="all">Все</option>
            {(Object.keys(SECTION_LABELS) as InspectionSection[]).map(s => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        {selectionMode ? (
          <button className="text-sm font-medium text-foreground" onClick={selectAll}>
            {selectedIds.size === filteredMedia.length && filteredMedia.length > 0 ? 'Снять выделение' : 'Выбрать все'}
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
          <Button size="sm" variant="outline" onClick={handleUpload}>Загрузить фото</Button>
        </div>
      </div>

      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Фото пока нет. Загрузите или сделайте снимки.</p>
          <Button onClick={handleUpload}>Загрузить фото</Button>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-3 gap-1.5">
          {filteredMedia.map(media => {
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
                {/* No damage indicator */}
                {media.noDamage && (
                  <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm leading-tight tracking-wide">
                    ОК
                  </div>
                )}
                {/* Compact tag indicators */}
                {!media.noDamage && (media.damageTags?.length || media.section || media.carPart) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <div className="flex items-center gap-1">
                      {media.damageTags?.map(tag => (
                        <div
                          key={tag}
                          className="w-2.5 h-2.5 rounded-full bg-destructive"
                          title={tag}
                        />
                      ))}
                      <span className="text-[9px] text-white/90 ml-auto truncate max-w-[60%]">
                        {media.section && SECTION_LABELS[media.section]}
                        {media.carPart && ` · ${media.carPart}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Раздел</label>
                <select
                  className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 outline-none border-none text-sm"
                  value={bulkSection || ''}
                  onChange={e => {
                    const val = e.target.value as InspectionSection | '';
                    setBulkSection(val || undefined);
                    if (val !== 'body') setBulkCarPart(undefined);
                  }}
                >
                  <option value="">Не менять</option>
                  {(Object.keys(SECTION_LABELS) as InspectionSection[]).map(s => (
                    <option key={s} value={s}>{SECTION_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {bulkSection === 'body' && (
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

      <MediaDetailSheet
        media={editingMedia}
        onClose={() => setEditingMediaId(null)}
        onUpdate={updateMedia}
      />
    </div>
  );
};

export default MediaLibrary;
