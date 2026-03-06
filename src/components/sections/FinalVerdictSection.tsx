import { Inspection, Verdict, RiskLevel } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const VERDICTS: Verdict[] = ['Recommended', 'Questionable', 'Not recommended'];
const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High'];

const FinalVerdictSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateFinalVerdict } = useInspectionStore();
  const fv = inspection.finalVerdict;

  return (
    <div className="flex flex-col gap-5">
      {/* Verdict */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Verdict</label>
        <div className="flex flex-col gap-2">
          {VERDICTS.map(v => (
            <button
              key={v}
              className={`p-4 rounded-xl text-left font-medium transition-colors ${
                fv.verdict === v
                  ? v === 'Recommended' ? 'bg-success text-success-foreground' :
                    v === 'Not recommended' ? 'bg-destructive text-destructive-foreground' :
                    'bg-warning text-warning-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}
              onClick={() => updateFinalVerdict({ verdict: v })}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Risk Level</label>
        <div className="flex gap-2">
          {RISK_LEVELS.map(r => (
            <button
              key={r}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                fv.riskLevel === r
                  ? r === 'Low' ? 'bg-success text-success-foreground' :
                    r === 'High' ? 'bg-destructive text-destructive-foreground' :
                    'bg-warning text-warning-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              onClick={() => updateFinalVerdict({ riskLevel: r })}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Repair cost */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Estimated Repair Cost</label>
        <input
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. $500"
          value={fv.estimatedRepairCost || ''}
          onChange={e => updateFinalVerdict({ estimatedRepairCost: e.target.value })}
        />
      </div>

      {/* Final comment */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Final Comment</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
          placeholder="Write your final assessment..."
          value={fv.finalComment || ''}
          onChange={e => updateFinalVerdict({ finalComment: e.target.value })}
        />
      </div>
    </div>
  );
};

export default FinalVerdictSection;
