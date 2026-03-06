import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { PartStatus } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, ImagePlus } from 'lucide-react';

const STATUSES: PartStatus[] = ['OK', 'Repainted', 'Body filler', 'Replacement', 'Risk'];

const PartDetail = () => {
  const { id, part } = useParams<{ id: string; part: string }>();
  const navigate = useNavigate();
  const { inspections, updateBodyPart, addMedia, setActiveInspection } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);
  const decodedPart = decodeURIComponent(part || '');

  if (!inspection) return null;

  const partData = inspection.bodyParts[decodedPart] || {};
  const partMedia = inspection.media.filter(m => m.section === 'body' && m.carPart === decodedPart);

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setActiveInspection(id!);
        addMedia([{ id: crypto.randomUUID(), dataUrl: reader.result as string, section: 'body', carPart: decodedPart, createdAt: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}/section/body`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">{decodedPart}</h1>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-5">
        {/* Status */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  partData.status === s
                    ? s === 'OK' ? 'bg-success text-success-foreground' :
                      s === 'Risk' ? 'bg-destructive text-destructive-foreground' :
                      'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
                onClick={() => updateBodyPart(decodedPart, { status: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Paint thickness */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Paint Thickness</label>
          <input
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 120 μm"
            value={partData.paintThickness || ''}
            onChange={e => updateBodyPart(decodedPart, { paintThickness: e.target.value })}
          />
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Comment</label>
          <textarea
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none"
            placeholder="Add notes..."
            value={partData.comment || ''}
            onChange={e => updateBodyPart(decodedPart, { comment: e.target.value })}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Photos ({partMedia.length})</label>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={handleCapture}>
              <Camera className="w-4 h-4" /> Take photo
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/inspection/${id}/media`)}>
              <ImagePlus className="w-4 h-4" /> Add from library
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {partMedia.map(m => (
              <div key={m.id} className="aspect-square rounded-xl overflow-hidden">
                <img src={m.dataUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartDetail;
