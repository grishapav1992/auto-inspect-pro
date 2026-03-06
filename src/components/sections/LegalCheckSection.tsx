import { Inspection, CheckStatus } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const STATUSES: CheckStatus[] = ['OK', 'Проблема', 'Не проверено'];

const LegalCheckSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateLegalCheck } = useInspectionStore();

  return (
    <div className="flex flex-col gap-3">
      {inspection.legalChecks.map((check, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <p className="font-medium text-foreground mb-3">{check.label}</p>
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  check.status === s
                    ? s === 'OK' ? 'bg-success text-success-foreground' :
                      s === 'Проблема' ? 'bg-destructive text-destructive-foreground' :
                      'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => updateLegalCheck(i, { status: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LegalCheckSection;
