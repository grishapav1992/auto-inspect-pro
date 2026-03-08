import { Inspection, CheckStatus } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const STATUSES: CheckStatus[] = ['OK', 'Проблема', 'Не проверено'];

const TestDriveSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateTestDrive } = useInspectionStore();

  return (
    <div className="flex flex-col gap-3">
      {(inspection.testDrive || []).map((item, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <p className="font-medium text-foreground mb-3">{item.label}</p>
          <div className="flex gap-2 mb-3">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.status === s
                    ? s === 'OK' ? 'bg-success text-success-foreground' :
                      s === 'Проблема' ? 'bg-destructive text-destructive-foreground' :
                      'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => updateTestDrive(i, { status: s })}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            className="w-full bg-muted border-none rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            placeholder="Добавить комментарий..."
            rows={2}
            value={item.comment || ''}
            onChange={e => updateTestDrive(i, { comment: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default TestDriveSection;
