import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { InspectionSection, SECTION_LABELS, BODY_PARTS, PartStatus } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, Camera, ImagePlus } from 'lucide-react';
import CarInfoSection from '@/components/sections/CarInfoSection';
import LegalCheckSection from '@/components/sections/LegalCheckSection';
import DiagnosticsSection from '@/components/sections/DiagnosticsSection';
import FinalVerdictSection from '@/components/sections/FinalVerdictSection';

const SectionDetail = () => {
  const { id, section } = useParams<{ id: string; section: InspectionSection }>();
  const navigate = useNavigate();
  const { inspections, setActiveInspection, addMedia } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  if (!inspection || !section) return null;

  const sectionMedia = inspection.media.filter(m => m.section === section);

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
        addMedia([{ id: crypto.randomUUID(), dataUrl: reader.result as string, section, createdAt: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const renderBodySection = () => (
    <div className="flex flex-col gap-2">
      {BODY_PARTS.map(part => {
        const partPhotos = inspection.media.filter(m => m.section === 'body' && m.carPart === part).length;
        const partData = inspection.bodyParts[part];
        return (
          <button
            key={part}
            className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 active:bg-secondary transition-colors text-left w-full"
            onClick={() => navigate(`/inspection/${id}/section/body/part/${encodeURIComponent(part)}`)}
          >
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">{part}</p>
              <div className="flex gap-2 mt-1">
                {partPhotos > 0 && <span className="text-xs text-muted-foreground">{partPhotos} photos</span>}
                {partData?.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    partData.status === 'OK' ? 'bg-success/10 text-success' :
                    partData.status === 'Risk' ? 'bg-destructive/10 text-destructive' :
                    'bg-warning/10 text-warning'
                  }`}>{partData.status}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'car-info': return <CarInfoSection inspection={inspection} />;
      case 'legal-check': return <LegalCheckSection inspection={inspection} />;
      case 'body': return renderBodySection();
      case 'diagnostics': return <DiagnosticsSection inspection={inspection} />;
      case 'final-verdict': return <FinalVerdictSection inspection={inspection} />;
      default:
        return (
          <div>
            {/* Generic section with photos */}
            <div className="grid grid-cols-3 gap-1.5">
              {sectionMedia.map(m => (
                <div key={m.id} className="aspect-square rounded-xl overflow-hidden">
                  <img src={m.dataUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {sectionMedia.length === 0 && (
              <p className="text-muted-foreground text-center py-10">No photos in this section yet.</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">{SECTION_LABELS[section]}</h1>
        </div>
      </div>

      {/* Quick add photos */}
      <div className="px-4 py-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleCapture}>
          <Camera className="w-4 h-4" /> Take photo
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/inspection/${id}/media`)}>
          <ImagePlus className="w-4 h-4" /> Add from library
        </Button>
      </div>

      <div className="px-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default SectionDetail;
