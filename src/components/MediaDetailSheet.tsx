import { useState, useEffect } from 'react';
import { MediaItem, PartStatus, SECTION_LABELS, InspectionSection, BODY_PARTS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useMediaImages } from '@/hooks/useMediaImages';

const STATUSES: PartStatus[] = ['OK', 'Перекрашено', 'Шпаклёвка', 'Замена', 'Риск'];

interface MediaDetailSheetProps {
  media: MediaItem | null;
  onClose: () => void;
  onUpdate: (mediaId: string, updates: Partial<MediaItem>) => void;
}

const MediaDetailSheet = ({ media, onClose, onUpdate }: MediaDetailSheetProps) => {
  const [note, setNote] = useState('');
  const [damageType, setDamageType] = useState<PartStatus | undefined>();
  const [paintThickness, setPaintThickness] = useState('');
  const [section, setSection] = useState<InspectionSection | undefined>();
  const [carPart, setCarPart] = useState<string | undefined>();

  const images = useMediaImages(media ? [media.id] : []);

  useEffect(() => {
    if (media) {
      setNote(media.note || '');
      setDamageType(media.damageType);
      setPaintThickness(media.paintThickness || '');
      setSection(media.section);
      setCarPart(media.carPart);
    }
  }, [media]);

  if (!media) return null;

  const handleSave = () => {
    onUpdate(media.id, { note, damageType, paintThickness, section, carPart });
    onClose();
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

        {images[media.id] && (
          <div className="rounded-xl overflow-hidden mb-4 max-h-48">
            <img src={images[media.id]} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Damage Type */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Повреждение
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    damageType === s
                      ? s === 'OK' ? 'bg-success text-success-foreground'
                        : s === 'Риск' ? 'bg-destructive text-destructive-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                  onClick={() => setDamageType(damageType === s ? undefined : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Paint Thickness */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Толщина ЛКП
            </label>
            <input
              className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="напр. 120 мкм"
              value={paintThickness}
              onChange={e => setPaintThickness(e.target.value)}
            />
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

          {/* Car Part (only for body section) */}
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
