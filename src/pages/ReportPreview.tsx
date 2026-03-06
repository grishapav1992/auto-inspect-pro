import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '@/store/useInspectionStore';
import { SECTION_LABELS, InspectionSection } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share } from 'lucide-react';
import { useMediaImages } from '@/hooks/useMediaImages';

const PHOTO_SECTIONS: InspectionSection[] = ['car-info', 'body', 'interior', 'technical', 'diagnostics'];

const ReportPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inspections } = useInspectionStore();
  const inspection = inspections.find(i => i.id === id);

  const allMediaIds = useMemo(() => inspection?.media.map(m => m.id) || [], [inspection]);
  const images = useMediaImages(allMediaIds);

  if (!inspection) return null;

  const ci = inspection.carInfo;
  const fv = inspection.finalVerdict;

  const PhotoGrid = ({ mediaIds }: { mediaIds: string[] }) => {
    if (mediaIds.length === 0) return null;
    return (
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {mediaIds.map(mId => (
          <div key={mId} className="aspect-square rounded-lg overflow-hidden">
            {images[mId] ? (
              <img src={images[mId]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const getMediaForSection = (section: InspectionSection) =>
    inspection.media.filter(m => m.section === section).map(m => m.id);

  const unassignedMedia = inspection.media.filter(m => !m.section).map(m => m.id);

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/inspection/${id}`)} className="p-2 -ml-2 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground flex-1">Предпросмотр отчёта</h1>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-6">
        {/* Car info */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-lg mb-3">Информация об автомобиле</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ci.make && <div><span className="text-muted-foreground">Марка:</span> <span className="font-medium text-foreground">{ci.make}</span></div>}
            {ci.model && <div><span className="text-muted-foreground">Модель:</span> <span className="font-medium text-foreground">{ci.model}</span></div>}
            {ci.year && <div><span className="text-muted-foreground">Год:</span> <span className="font-medium text-foreground">{ci.year}</span></div>}
            {ci.vin && <div className="col-span-2"><span className="text-muted-foreground">VIN:</span> <span className="font-medium text-foreground font-mono">{ci.vin}</span></div>}
            {ci.licensePlate && <div><span className="text-muted-foreground">Гос. номер:</span> <span className="font-medium text-foreground">{ci.licensePlate}</span></div>}
            {ci.mileage && <div><span className="text-muted-foreground">Пробег:</span> <span className="font-medium text-foreground">{ci.mileage}</span></div>}
          </div>
          <PhotoGrid mediaIds={getMediaForSection('car-info')} />
        </section>

        {/* Legal check */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-lg mb-3">Юридическая проверка</h2>
          <div className="flex flex-col gap-2">
            {inspection.legalChecks.map((c, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{c.label}</span>
                <span className={`font-medium ${c.status === 'OK' ? 'text-success' : c.status === 'Проблема' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
          <PhotoGrid mediaIds={getMediaForSection('legal-check')} />
        </section>

        {/* Body */}
        {(Object.keys(inspection.bodyParts).length > 0 || getMediaForSection('body').length > 0) && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Осмотр кузова</h2>
            {Object.keys(inspection.bodyParts).length > 0 && (
              <div className="flex flex-col gap-2">
                {Object.entries(inspection.bodyParts).map(([part, data]) => {
                  const partPhotos = inspection.media.filter(m => m.section === 'body' && m.carPart === part).map(m => m.id);
                  return (
                    <div key={part}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-foreground">{part}</span>
                        <span className={`font-medium ${
                          data.status === 'OK' ? 'text-success' :
                          data.status === 'Риск' ? 'text-destructive' :
                          'text-warning'
                        }`}>{data.status || '—'}</span>
                      </div>
                      {data.comment && <p className="text-xs text-muted-foreground mt-0.5">{data.comment}</p>}
                      <PhotoGrid mediaIds={partPhotos} />
                    </div>
                  );
                })}
              </div>
            )}
            {/* Body photos without part assignment */}
            {(() => {
              const unassignedBody = inspection.media.filter(m => m.section === 'body' && !m.carPart).map(m => m.id);
              if (unassignedBody.length === 0) return null;
              return (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-1">Общие фото кузова</p>
                  <PhotoGrid mediaIds={unassignedBody} />
                </div>
              );
            })()}
          </section>
        )}

        {/* Interior */}
        {getMediaForSection('interior').length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Салон</h2>
            <PhotoGrid mediaIds={getMediaForSection('interior')} />
          </section>
        )}

        {/* Technical */}
        {getMediaForSection('technical').length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Техническая часть</h2>
            <PhotoGrid mediaIds={getMediaForSection('technical')} />
          </section>
        )}

        {/* Diagnostics */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-lg mb-3">Диагностика</h2>
          <div className="flex flex-col gap-2">
            {inspection.diagnostics.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{d.label}</span>
                <span className={`font-medium ${d.status === 'OK' ? 'text-success' : d.status === 'Проблема' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
          <PhotoGrid mediaIds={getMediaForSection('diagnostics')} />
        </section>

        {/* Unassigned photos */}
        {unassignedMedia.length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground text-lg mb-3">Прочие фото ({unassignedMedia.length})</h2>
            <PhotoGrid mediaIds={unassignedMedia} />
          </section>
        )}

        {/* Final verdict */}
        {fv.verdict && (
          <section className={`rounded-2xl p-5 ${
            fv.verdict === 'Рекомендован' ? 'bg-success/10 border border-success/20' :
            fv.verdict === 'Не рекомендован' ? 'bg-destructive/10 border border-destructive/20' :
            'bg-warning/10 border border-warning/20'
          }`}>
            <h2 className="font-bold text-foreground text-lg mb-2">Итоговый вердикт</h2>
            <p className={`text-xl font-bold ${
              fv.verdict === 'Рекомендован' ? 'text-success' :
              fv.verdict === 'Не рекомендован' ? 'text-destructive' :
              'text-warning'
            }`}>{fv.verdict}</p>
            {fv.riskLevel && <p className="text-sm text-foreground mt-1">Риск: {fv.riskLevel}</p>}
            {fv.estimatedRepairCost && <p className="text-sm text-foreground">Стоимость ремонта: {fv.estimatedRepairCost}</p>}
            {fv.finalComment && <p className="text-sm text-muted-foreground mt-2">{fv.finalComment}</p>}
          </section>
        )}

        <Button size="xl" className="w-full">
          <Share className="w-5 h-5" /> Опубликовать отчёт
        </Button>
      </div>
    </div>
  );
};

export default ReportPreview;