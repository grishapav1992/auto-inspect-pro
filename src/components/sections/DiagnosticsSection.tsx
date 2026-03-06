import { Inspection, CheckStatus } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const STATUSES: CheckStatus[] = ['OK', 'Issue', 'Not checked'];

const DiagnosticsSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateDiagnostic } = useInspectionStore();

  return (
    <div className="flex flex-col gap-3">
      {inspection.diagnostics.map((diag, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <p className="font-medium text-foreground mb-3">{diag.label}</p>
          <div className="flex gap-2 mb-3">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  diag.status === s
                    ? s === 'OK' ? 'bg-success text-success-foreground' :
                      s === 'Issue' ? 'bg-destructive text-destructive-foreground' :
                      'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => updateDiagnostic(i, { status: s })}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            className="w-full bg-muted border-none rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            placeholder="Add comment..."
            rows={2}
            value={diag.comment || ''}
            onChange={e => updateDiagnostic(i, { comment: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default DiagnosticsSection;
