import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS, InspectionSection } from '@/types/inspection';
import { ArrowLeft, Check, Tag, MessageSquare, X, Search, Filter } from 'lucide-react';

const MediaLibrary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections, updateMedia, removeMedia, bulkAssignMedia, addMedia, setActiveInspection } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSection, setFilterSection] = useState<InspectionSection | 'all'>('all');
  const [showAssignSheet, setShowAssignSheet] = useState(false);

  useState(() => { if (id) setActiveInspection(id); });

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

  if (!inspection) return null;

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

  const handleBulkAssign = (section: InspectionSection) => {
    bulkAssignMedia(Array.from(selectedIds), { section });
    setSelectedIds(new Set());
    setShowAssignSheet(false);
  };

  const handleDeleteSelected = () => {
    removeMedia(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
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

      {/* Select all / upload */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button className="text-sm font-medium text-foreground" onClick={selectAll}>
          {selectedIds.size === filteredMedia.length && filteredMedia.length > 0 ? 'Снять выделение' : 'Выбрать все'}
        </button>
        <Button size="sm" variant="outline" onClick={handleUpload}>Загрузить фото</Button>
      </div>

      {/* Grid */}
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
            return (
              <div
                key={media.id}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                onClick={() => toggleSelect(media.id)}
              >
                <img src={media.dataUrl} alt="" className="w-full h-full object-cover" />
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-wrap gap-0.5">
                  {media.section && (
                    <span className="text-[9px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded-md">
                      {SECTION_LABELS[media.section]}
                    </span>
                  )}
                  {media.carPart && (
                    <span className="text-[9px] bg-info/80 text-info-foreground px-1.5 py-0.5 rounded-md">
                      {media.carPart}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-2 z-20">
          <Button size="sm" className="flex-1" onClick={() => setShowAssignSheet(true)}>
            <Tag className="w-4 h-4" /> Назначить ({selectedIds.size})
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <X className="w-4 h-4" /> Удалить
          </Button>
        </div>
      )}

      {/* Assign sheet */}
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
    </div>
  );
};

export default MediaLibrary;
