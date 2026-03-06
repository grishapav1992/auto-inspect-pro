import { useInspectionStore } from '@/store/useInspectionStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ImagePlus, ClipboardList, ChevronRight, Trash2 } from 'lucide-react';

const Index = () => {
  const { inspections, createInspection, setActiveInspection, deleteInspection } = useInspectionStore();
  const navigate = useNavigate();

  const handleCreate = () => {
    const id = createInspection();
    navigate(`/inspection/${id}`);
  };

  const handleOpen = (id: string) => {
    setActiveInspection(id);
    navigate(`/inspection/${id}`);
  };

  const handleImport = () => {
    const id = createInspection();
    setActiveInspection(id);
    navigate(`/inspection/${id}/media`);
  };

  if (inspections.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">My Inspections</h1>
            <p className="text-muted-foreground text-base">No inspection reports yet.</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button size="xl" onClick={handleCreate} className="w-full">
              <Plus className="w-5 h-5" />
              Create new inspection
            </Button>
            <Button variant="outline" size="lg" onClick={handleImport} className="w-full">
              <ImagePlus className="w-5 h-5" />
              Import photos from gallery
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Inspections</h1>
          <Button size="icon" onClick={handleCreate}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        {inspections.map(insp => {
          const carLabel = insp.carInfo.make && insp.carInfo.model
            ? `${insp.carInfo.make} ${insp.carInfo.model} ${insp.carInfo.year || ''}`
            : 'Car not specified';
          return (
            <div
              key={insp.id}
              className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 active:bg-secondary transition-colors"
              onClick={() => handleOpen(insp.id)}
            >
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                {insp.media[0] ? (
                  <img src={insp.media[0].dataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ClipboardList className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{carLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {insp.media.length} photos · {new Date(insp.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => { e.stopPropagation(); deleteInspection(insp.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Index;
