import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { MediaItem } from '@/types/inspection';
import { useMediaImages } from '@/hooks/useMediaImages';

interface PhotoViewerProps {
  mediaList: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onEdit: (mediaId: string) => void;
}

const PhotoViewer = ({ mediaList, initialIndex, onClose, onEdit }: PhotoViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swiping, setSwiping] = useState(false);
  const [offsetX, setOffsetX] = useState(0);

  const mediaIds = mediaList.map(m => m.id);
  const images = useMediaImages(mediaIds);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(i + 1, mediaList.length - 1));
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, mediaList.length]);

  const current = mediaList[currentIndex];
  if (!current) return null;

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, mediaList.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setOffsetX(touchDeltaX.current);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (touchDeltaX.current > 60) goPrev();
    else if (touchDeltaX.current < -60) goNext();
    touchDeltaX.current = 0;
    setOffsetX(0);
  };

  const src = images[current.id];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={onClose} className="p-2 text-white/90">
          <X className="w-6 h-6" />
        </button>
        <span className="text-white/80 text-sm font-medium">
          {currentIndex + 1} / {mediaList.length}
        </span>
        <button onClick={() => onEdit(current.id)} className="p-2 text-white/90">
          <Pencil className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="max-w-full max-h-full object-contain transition-transform duration-150"
            style={{ transform: swiping ? `translateX(${offsetX}px)` : undefined }}
            draggable={false}
          />
        ) : (
          <div className="w-20 h-20 bg-white/10 rounded-xl" />
        )}

        {/* Desktop nav arrows */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/80 hidden sm:flex"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < mediaList.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/80 hidden sm:flex"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom tags overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-10 pb-6">
        {current.noDamage && (
          <div className="inline-block bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg mb-2">
            Без повреждений
          </div>
        )}

        {!current.noDamage && current.damageTags && current.damageTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {current.damageTags.map(tag => (
              <span
                key={tag}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  tag === 'Риск' ? 'bg-red-500/90 text-white'
                    : tag === 'OK' ? 'bg-emerald-500/90 text-white'
                    : 'bg-white/20 text-white'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {current.carPart && (
          <p className="text-white/70 text-xs mb-1">{current.carPart}</p>
        )}

        {current.note && (
          <p className="text-white/60 text-xs line-clamp-2">{current.note}</p>
        )}

        {current.paintThicknessMin != null && (
          <p className="text-white/50 text-[10px] mt-1">
            ЛКП: {current.paintThicknessMin}–{current.paintThicknessMax || '?'} мкм
          </p>
        )}
      </div>
    </div>
  );
};

export default PhotoViewer;
