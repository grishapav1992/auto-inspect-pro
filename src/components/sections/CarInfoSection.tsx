import { Inspection } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';
import { useMediaImages } from '@/hooks/useMediaImages';

const CarInfoSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateCarInfo } = useInspectionStore();

  const sectionMedia = inspection.media.filter(m => m.section === 'car-info');
  const mediaIds = sectionMedia.map(m => m.id);
  const images = useMediaImages(mediaIds);

  const fields = [
    { key: 'make', label: 'Марка', placeholder: 'напр. Toyota' },
    { key: 'model', label: 'Модель', placeholder: 'напр. Camry' },
    { key: 'generation', label: 'Поколение', placeholder: 'напр. XV70' },
    { key: 'year', label: 'Год выпуска', placeholder: 'напр. 2020' },
    { key: 'vin', label: 'VIN', placeholder: 'Идентификационный номер' },
    { key: 'licensePlate', label: 'Госномер', placeholder: 'напр. А123БВ777' },
    { key: 'mileage', label: 'Пробег', placeholder: 'напр. 45000 км' },
    { key: 'engine', label: 'Двигатель', placeholder: 'напр. 2.5 бензин' },
    { key: 'transmission', label: 'Коробка передач', placeholder: 'напр. АКПП' },
    { key: 'drivetrain', label: 'Привод', placeholder: 'напр. Передний' },
    { key: 'trim', label: 'Комплектация', placeholder: 'напр. Престиж' },
    { key: 'ownerCount', label: 'Количество владельцев', placeholder: 'напр. 2' },
    { key: 'city', label: 'Город осмотра', placeholder: 'напр. Москва' },
    { key: 'inspectionDate', label: 'Дата осмотра', placeholder: 'ГГГГ-ММ-ДД', type: 'date' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {sectionMedia.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Фото</label>
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
        </div>
      )}
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{f.label}</label>
          <input
            type={'type' in f ? f.type : 'text'}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder={f.placeholder}
            value={(inspection.carInfo[f.key] as string) || ''}
            onChange={e => updateCarInfo({ [f.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default CarInfoSection;
