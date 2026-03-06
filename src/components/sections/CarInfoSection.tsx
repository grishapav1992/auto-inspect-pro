import { Inspection } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const CarInfoSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateCarInfo } = useInspectionStore();

  const fields = [
    { key: 'make', label: 'Make', placeholder: 'e.g. Toyota' },
    { key: 'model', label: 'Model', placeholder: 'e.g. Camry' },
    { key: 'year', label: 'Year', placeholder: 'e.g. 2020' },
    { key: 'vin', label: 'VIN', placeholder: 'Vehicle identification number' },
    { key: 'licensePlate', label: 'License Plate', placeholder: 'e.g. ABC 1234' },
    { key: 'mileage', label: 'Mileage', placeholder: 'e.g. 45000 km' },
    { key: 'city', label: 'City', placeholder: 'e.g. Berlin' },
    { key: 'inspectionDate', label: 'Inspection Date', placeholder: 'YYYY-MM-DD', type: 'date' },
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
