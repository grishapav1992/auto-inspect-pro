import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { SECTION_LABELS, BODY_PARTS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share } from 'lucide-react';

const ReportPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  if (!inspection) return null;

  const ci = inspection.carInfo;
  const fv = inspection.finalVerdict;

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground flex-1">Report Preview</h1>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-6">
        {/* Car Info */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-lg mb-3">Car Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ci.make && <div><span className="text-muted-foreground">Make:</span> <span className="font-medium text-foreground">{ci.make}</span></div>}
            {ci.model && <div><span className="text-muted-foreground">Model:</span> <span className="font-medium text-foreground">{ci.model}</span></div>}
            {ci.year && <div><span className="text-muted-foreground">Year:</span> <span className="font-medium text-foreground">{ci.year}</span></div>}
            {ci.vin && <div className="col-span-2"><span className="text-muted-foreground">VIN:</span> <span className="font-medium text-foreground font-mono">{ci.vin}</span></div>}
            {ci.licensePlate && <div><span className="text-muted-foreground">Plate:</span> <span className="font-medium text-foreground">{ci.licensePlate}</span></div>}
            {ci.mileage && <div><span className="text-muted-foreground">Mileage:</span> <span className="font-medium text-foreground">{ci.mileage}</span></div>}
          </div>
        </section>

        {/* Legal */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-lg mb-3">Legal Check</h2>
          <div className="flex flex-col gap-2">
            {inspection.legalChecks.map((c, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{c.label}</span>
                <span className={`font-medium ${c.status === 'OK' ? 'text-success' : c.status === 'Issue' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Body */}
        {Object.keys(inspection.bodyParts).length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Body Inspection</h2>
            <div className="flex flex-col gap-2">
              {Object.entries(inspection.bodyParts).map(([part, data]) => (
                <div key={part} className="flex justify-between items-center text-sm">
                  <span className="text-foreground">{part}</span>
                  <span className={`font-medium ${
                    data.status === 'OK' ? 'text-success' :
                    data.status === 'Risk' ? 'text-destructive' :
                    'text-warning'
                  }`}>{data.status || '—'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photos */}
        {inspection.media.length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Photos ({inspection.media.length})</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {inspection.media.slice(0, 12).map(m => (
                <div key={m.id} className="aspect-square rounded-lg overflow-hidden">
                  <img src={m.dataUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {inspection.media.length > 12 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">+{inspection.media.length - 12} more photos</p>
            )}
          </section>
        )}

        {/* Verdict */}
        {fv.verdict && (
          <section className={`rounded-2xl p-5 ${
            fv.verdict === 'Recommended' ? 'bg-success/10 border border-success/20' :
            fv.verdict === 'Not recommended' ? 'bg-destructive/10 border border-destructive/20' :
            'bg-warning/10 border border-warning/20'
          }`}>
            <h2 className="font-bold text-foreground text-lg mb-2">Final Verdict</h2>
            <p className={`text-xl font-bold ${
              fv.verdict === 'Recommended' ? 'text-success' :
              fv.verdict === 'Not recommended' ? 'text-destructive' :
              'text-warning'
            }`}>{fv.verdict}</p>
            {fv.riskLevel && <p className="text-sm text-foreground mt-1">Risk: {fv.riskLevel}</p>}
            {fv.estimatedRepairCost && <p className="text-sm text-foreground">Repair cost: {fv.estimatedRepairCost}</p>}
            {fv.finalComment && <p className="text-sm text-muted-foreground mt-2">{fv.finalComment}</p>}
          </section>
        )}

        {/* Publish */}
        <Button size="xl" className="w-full">
          <Share className="w-5 h-5" /> Publish Report
        </Button>
      </div>
    </div>
  );
};

export default ReportPreview;
