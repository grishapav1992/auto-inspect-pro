import { Inspection, Verdict, RiskLevel } from '@/types/inspection';
import { useInspectionStore } from '@/store/useInspectionStore';

const VERDICTS: Verdict[] = ['Рекомендован', 'Сомнительно', 'Не рекомендован'];
const RISK_LEVELS: RiskLevel[] = ['Низкий', 'Средний', 'Высокий'];

const FinalVerdictSection = ({ inspection }: { inspection: Inspection }) => {
  const { updateFinalVerdict } = useInspectionStore();
  const fv = inspection.finalVerdict;

  return (
    <div className="flex flex-col gap-5">
      {/* Плюсы */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Плюсы автомобиля</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          placeholder="Перечислите плюсы..."
          value={fv.pros || ''}
          onChange={e => updateFinalVerdict({ pros: e.target.value })}
        />
      </div>

      {/* Минусы */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Минусы автомобиля</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          placeholder="Перечислите минусы..."
          value={fv.cons || ''}
          onChange={e => updateFinalVerdict({ cons: e.target.value })}
        />
      </div>

      {/* Рекомендации */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Рекомендации</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          placeholder="Ваши рекомендации..."
          value={fv.recommendations || ''}
          onChange={e => updateFinalVerdict({ recommendations: e.target.value })}
        />
      </div>

      {/* Предполагаемые вложения */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Предполагаемые вложения</label>
        <input
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          placeholder="напр. 50 000 ₽"
          value={fv.estimatedRepairCost || ''}
          onChange={e => updateFinalVerdict({ estimatedRepairCost: e.target.value })}
        />
      </div>

      {/* Общая оценка */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Общая оценка состояния</label>
        <textarea
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
          placeholder="Общая оценка состояния автомобиля..."
          value={fv.overallRating || ''}
          onChange={e => updateFinalVerdict({ overallRating: e.target.value })}
        />
      </div>

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
    </div>
  );
};

export default FinalVerdictSection;
