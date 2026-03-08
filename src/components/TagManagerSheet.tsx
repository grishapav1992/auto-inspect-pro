import { useState } from 'react';
import { X, GripVertical, Eye, EyeOff, Trash2, Plus, Star } from 'lucide-react';
import { useInspectionStore } from '@/store/useInspectionStore';
import { SECTION_DAMAGE_TAGS, DEFAULT_DAMAGE_TAGS, InspectionSection } from '@/types/inspection';

interface TagManagerSheetProps {
  section?: InspectionSection;
  onClose: () => void;
}

const TagManagerSheet = ({ section, onClose }: TagManagerSheetProps) => {
  const {
    customDamageTags,
    hiddenDefaultTags,
    tagPriorities,
    addCustomDamageTag,
    removeCustomDamageTag,
    toggleHiddenDefaultTag,
    setTagPriorities,
  } = useInspectionStore();

  const [newTag, setNewTag] = useState('');
  const [draggedTag, setDraggedTag] = useState<string | null>(null);

  const sectionTags = section ? (SECTION_DAMAGE_TAGS[section] || DEFAULT_DAMAGE_TAGS) : DEFAULT_DAMAGE_TAGS;

  const isPrioritized = (tag: string) => tagPriorities.includes(tag);

  const togglePriority = (tag: string) => {
    if (isPrioritized(tag)) {
      setTagPriorities(tagPriorities.filter(t => t !== tag));
    } else {
      setTagPriorities([...tagPriorities, tag]);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !sectionTags.includes(trimmed) && !customDamageTags.includes(trimmed)) {
      addCustomDamageTag(trimmed);
    }
    setNewTag('');
  };

  const isHidden = (tag: string) => hiddenDefaultTags.includes(tag);

  return (
    <div className="fixed inset-0 bg-foreground/30 z-40 flex items-end" onClick={onClose}>
      <div
        className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg">Управление тегами</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Default tags */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Стандартные теги
          </label>
          <div className="flex flex-col gap-1">
            {sectionTags.map(tag => (
              <div
                key={tag}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${
                  isHidden(tag) ? 'bg-muted/50 opacity-50' : 'bg-secondary'
                }`}
              >
                <span className="flex-1 text-sm text-foreground">{tag}</span>
                <button
                  onClick={() => togglePriority(tag)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPrioritized(tag) ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                  title={isPrioritized(tag) ? 'Убрать из приоритетных' : 'Сделать приоритетным'}
                >
                  <Star className={`w-4 h-4 ${isPrioritized(tag) ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  onClick={() => toggleHiddenDefaultTag(tag)}
                  className="p-1.5 rounded-lg text-muted-foreground"
                  title={isHidden(tag) ? 'Показать' : 'Скрыть'}
                >
                  {isHidden(tag) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom tags */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Свои теги
          </label>
          <div className="flex flex-col gap-1">
            {customDamageTags.map(tag => (
              <div key={tag} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary">
                <span className="flex-1 text-sm text-foreground">{tag}</span>
                <button
                  onClick={() => togglePriority(tag)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isPrioritized(tag) ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isPrioritized(tag) ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  onClick={() => removeCustomDamageTag(tag)}
                  className="p-1.5 rounded-lg text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {customDamageTags.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Нет кастомных тегов</p>
            )}
          </div>
        </div>

        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Новый тег..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
            maxLength={30}
          />
          <button
            onClick={handleAddTag}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          <Star className="w-3 h-3 inline text-amber-500 fill-amber-500 -mt-0.5 mr-1" />
          Приоритетные теги отображаются первыми
        </p>
      </div>
    </div>
  );
};

export default TagManagerSheet;
