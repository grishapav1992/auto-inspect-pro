import { useState, useEffect } from 'react';
import { MediaItem, SECTION_LABELS, InspectionSection, BODY_PARTS, DEFAULT_DAMAGE_TAGS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useInspectionStore } from '@/store/useInspectionStore';

interface MediaDetailSheetProps {
  media: MediaItem | null;
  onClose: () => void;
  onUpdate: (mediaId: string, updates: Partial<MediaItem>) => void;
}

const MediaDetailSheet = ({ media, onClose, onUpdate }: MediaDetailSheetProps) => {
  const [note, setNote] = useState('');
  const [damageTags, setDamageTags] = useState<string[]>([]);
  const [paintThicknessMin, setPaintThicknessMin] = useState('');
  const [paintThicknessMax, setPaintThicknessMax] = useState('');
  const [section, setSection] = useState<InspectionSection | undefined>();
  const [carPart, setCarPart] = useState<string | undefined>();
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const { customDamageTags, addCustomDamageTag } = useInspectionStore();
  const allTags = [...DEFAULT_DAMAGE_TAGS, ...customDamageTags];

  useEffect(() => {
    if (media) {
      setNote(media.note || '');
      setDamageTags(media.damageTags || []);
      setPaintThicknessMin(media.paintThicknessMin?.toString() || '');
      setPaintThicknessMax(media.paintThicknessMax?.toString() || '');
      setSection(media.section);
      setCarPart(media.carPart);
    }
  }, [media]);

  if (!media) return null;

  const handleSave = () => {
    onUpdate(media.id, {
      note,
      damageTags: damageTags.length > 0 ? damageTags : undefined,
      paintThicknessMin: paintThicknessMin ? Number(paintThicknessMin) : undefined,
      paintThicknessMax: paintThicknessMax ? Number(paintThicknessMax) : undefined,
      section,
      carPart,
    });
    onClose();
  };

  const toggleTag = (tag: string) => {
    setDamageTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      addCustomDamageTag(trimmed);
      setDamageTags(prev => [...prev, trimmed]);
    } else if (trimmed && allTags.includes(trimmed)) {
      if (!damageTags.includes(trimmed)) {
        setDamageTags(prev => [...prev, trimmed]);
      }
    }
    setNewTag('');
    setShowNewTagInput(false);
  };

  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={onClose}>
      <div
        className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg">Детали фото</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Damage Tags */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Повреждения
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    damageTags.includes(tag)
                      ? tag === 'OK' ? 'bg-success text-success-foreground'
                        : tag === 'Риск' ? 'bg-destructive text-destructive-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
              {showNewTagInput ? (
                <div className="flex gap-1 items-center">
                  <input
                    autoFocus
                    className="bg-secondary rounded-xl px-3 py-2 text-sm text-foreground outline-none w-28"
                    placeholder="Название..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); if (e.key === 'Escape') setShowNewTagInput(false); }}
                    maxLength={30}
                  />
                  <button onClick={handleAddCustomTag} className="p-1.5 bg-primary text-primary-foreground rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  className="px-3.5 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground border border-dashed border-muted-foreground/30"
                  onClick={() => setShowNewTagInput(true)}
                >
                  <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />Свой тег
                </button>
              )}
            </div>
          </div>

          {/* Paint Thickness Range */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Толщина ЛКП (мкм)
            </label>
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="От"
                inputMode="numeric"
                value={paintThicknessMin}
                onChange={e => handleNumericInput(e.target.value, setPaintThicknessMin)}
              />
              <span className="text-muted-foreground">—</span>
              <input
                className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="До"
                inputMode="numeric"
                value={paintThicknessMax}
                onChange={e => handleNumericInput(e.target.value, setPaintThicknessMax)}
              />
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Раздел
            </label>
            <select
              className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 outline-none border-none text-sm"
              value={section || ''}
              onChange={e => {
                const val = e.target.value as InspectionSection | '';
                setSection(val || undefined);
                if (val !== 'body') setCarPart(undefined);
              }}
            >
              <option value="">Не назначен</option>
              {(Object.keys(SECTION_LABELS) as InspectionSection[]).map(s => (
                <option key={s} value={s}>{SECTION_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Car Part */}
          {section === 'body' && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Деталь кузова
              </label>
              <select
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 outline-none border-none text-sm"
                value={carPart || ''}
                onChange={e => setCarPart(e.target.value || undefined)}
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
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Заметка
            </label>
            <textarea
              className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px]"
              placeholder="Добавить описание..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailSheet;
