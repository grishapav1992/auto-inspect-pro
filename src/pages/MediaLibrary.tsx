import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection, PartStatus, BODY_PARTS } from '@/types/inspection';
import { ArrowLeft, Check, Tag, X, Search, Filter, Pencil } from 'lucide-react';
import { useMediaImages } from '@/hooks/useMediaImages';
import MediaDetailSheet from '@/components/MediaDetailSheet';

const MediaLibrary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, updateMedia, removeMedia, bulkAssignMedia, addMedia, setActiveInspection } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<InspectionSection | 'all'>('all');
  const [showBulkEditSheet, setShowBulkEditSheet] = useState(false);
  const [bulkDamageType, setBulkDamageType] = useState<PartStatus | undefined>();
  const [bulkPaintThickness, setBulkPaintThickness] = useState('');
  const [bulkSection, setBulkSection] = useState<InspectionSection | undefined>();
  const [bulkCarPart, setBulkCarPart] = useState<string | undefined>();
  const [bulkNote, setBulkNote] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);

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
    if (bulkDamageType) updates.damageType = bulkDamageType;
    if (bulkPaintThickness) updates.paintThickness = bulkPaintThickness;
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
    setBulkDamageType(undefined);
    setBulkPaintThickness('');
    setBulkSection(undefined);
    setBulkCarPart(undefined);
    setBulkNote('');
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
                <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-wrap gap-0.5">
                  {media.damageType && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                      media.damageType === 'OK' ? 'bg-success/80 text-success-foreground' :
                      media.damageType === 'Риск' ? 'bg-destructive/80 text-destructive-foreground' :
                      'bg-primary/80 text-primary-foreground'
                    }`}>
                      {media.damageType}
                    </span>
                  )}
                  {media.paintThickness && (
                    <span className="text-[9px] bg-accent/80 text-accent-foreground px-1.5 py-0.5 rounded-md">
                      {media.paintThickness}
                    </span>
                  )}
                  {media.section && (
                    <span className="text-[9px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded-md">
                      {SECTION_LABELS[media.section]}
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

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-2 z-20">
          <Button size="sm" className="flex-1" onClick={() => setShowAssignSheet(true)}>
            <Tag className="w-4 h-4" /> Назначить ({selectedIds.size})
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <X className="w-4 h-4" /> Удалить
          </Button>
        </div>
      )}

      {showAssignSheet && (
        <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={() => setShowAssignSheet(false)}>
          <div className="bg-card w-full rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground text-lg mb-4">Назначить раздел</h3>
            <div className="flex flex-col gap-2">
              {(Object.keys(SECTION_LABELS) as InspectionSection[]).map(s => (
                <button
                  key={s}
                  className="p-4 rounded-xl bg-secondary text-foreground text-left font-medium active:bg-border transition-colors"
                  onClick={() => handleBulkAssign(s)}
                >
                  {SECTION_LABELS[s]}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setShowAssignSheet(false)}>Отмена</Button>
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
