import { Inspection, Verdict, RiskLevel } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const VERDICTS: Verdict[] = ['Рекомендован', 'Сомнительно', 'Не рекомендован'];
const RISK_LEVELS: RiskLevel[] = ['Низкий', 'Средний', 'Высокий'];

const FinalVerdictSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateFinalVerdict } = useInspectionStore();
  const fv = inspection.finalVerdict;

  return (
    <div className="flex flex-col gap-5">
      {/* Вердикт */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Вердикт</label>
        <div className="flex flex-col gap-2">
          {VERDICTS.map(v => (
            <button
              key={v}
              className={`p-4 rounded-xl text-left font-medium transition-colors ${
                fv.verdict === v
                  ? v === 'Рекомендован' ? 'bg-success text-success-foreground' :
                    v === 'Не рекомендован' ? 'bg-destructive text-destructive-foreground' :
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

      {/* Уровень риска */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Уровень риска</label>
        <div className="flex gap-2">
          {RISK_LEVELS.map(r => (
            <button
              key={r}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                fv.riskLevel === r
                  ? r === 'Низкий' ? 'bg-success text-success-foreground' :
                    r === 'Высокий' ? 'bg-destructive text-destructive-foreground' :
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

      {/* Стоимость ремонта */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ориентировочная стоимость ремонта</label>
        <input
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          placeholder="напр. 50 000 ₽"
          value={fv.estimatedRepairCost || ''}
          onChange={e => updateFinalVerdict({ estimatedRepairCost: e.target.value })}
        />
      </div>

      {/* Итоговый комментарий */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Итоговый комментарий</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
          placeholder="Напишите итоговую оценку..."
          value={fv.finalComment || ''}
          onChange={e => updateFinalVerdict({ finalComment: e.target.value })}
        />
      </div>
    </div>
  );
};

export default FinalVerdictSection;
