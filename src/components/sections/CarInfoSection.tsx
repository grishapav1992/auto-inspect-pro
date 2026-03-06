import { Inspection } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const CarInfoSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateCarInfo } = useInspectionStore();

  const fields = [
    { key: 'make', label: 'Марка', placeholder: 'напр. Toyota' },
    { key: 'model', label: 'Модель', placeholder: 'напр. Camry' },
    { key: 'year', label: 'Год выпуска', placeholder: 'напр. 2020' },
    { key: 'vin', label: 'VIN', placeholder: 'Идентификационный номер' },
    { key: 'licensePlate', label: 'Гос. номер', placeholder: 'напр. А123БВ777' },
    { key: 'mileage', label: 'Пробег', placeholder: 'напр. 45000 км' },
    { key: 'city', label: 'Город', placeholder: 'напр. Москва' },
    { key: 'inspectionDate', label: 'Дата осмотра', placeholder: 'ГГГГ-ММ-ДД', type: 'date' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
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
