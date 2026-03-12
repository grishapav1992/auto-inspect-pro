import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Play, Pause, Trash2, Plus, X, ChevronLeft, ChevronRight, CheckCircle2, CheckSquare, GripVertical, MoreHorizontal, Layers, Car, ClipboardList, Check, Paintbrush, StickyNote, Mic } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PartInspectionModal from "@/components/PartInspectionModal";
import type { PartInspection } from "@/types/inspection";
import { CAR_PARTS, GLASS_PARTS, STRUCTURAL_PARTS, UNDERCARRIAGE_PARTS, INTERIOR_PARTS, LIGHTING_PARTS, GLASS_DAMAGE_TAG_GROUPS, LIGHTING_DAMAGE_TAG_GROUPS, STRUCTURAL_DAMAGE_TAG_GROUPS, UNDERHOOD_DAMAGE_TAG_GROUPS, WHEELS_DAMAGE_TAG_GROUPS, INTERIOR_MAIN_TAG_GROUPS, INTERIOR_DASHBOARD_TAG_GROUPS, INTERIOR_ELEMENT_TAG_GROUPS, DIAGNOSTICS_TAG_GROUPS } from "@/types/inspection";
import { DIAGNOSTICS_ELEMENT_TAG_GROUPS } from "@/data/diagnosticTags";
import { resolveTags } from "@/lib/tagResolver";

export type MediaGroupName = "body" | "structural" | "glass" | "lighting" | "underhood" | "wheels" | "interior" | "diagnostics";

export const MEDIA_GROUP_LABELS: Record<MediaGroupName, string> = {
  body: "Кузов",
  structural: "Силовые элементы кузова",
  glass: "Остекление",
  lighting: "Светотехника",
  underhood: "Подкапотное пространство",
  wheels: "Колёса и тормозные механизмы",
  interior: "Салон",
  diagnostics: "Компьютерная диагностика",
};

export const MEDIA_GROUP_ELEMENTS: Record<MediaGroupName, readonly { id: string; label: string }[]> = {
  body: [...CAR_PARTS, { id: "uh_body_elements", label: "Кузовные элементы под капотом" }, { id: "inner_trunk_lid", label: "Внутренняя сторона крышки багажника" }, { id: "body_general", label: "Общее состояние" }],
  structural: [...STRUCTURAL_PARTS, ...UNDERCARRIAGE_PARTS, { id: "structural_general", label: "Общее состояние" }],
  glass: [...GLASS_PARTS, { id: "glass_general", label: "Общее состояние" }],
  lighting: [...LIGHTING_PARTS, { id: "lighting_general", label: "Общее состояние" }],
  underhood: [
    { id: "uh_engine", label: "Двигатель" },
    { id: "uh_accessories", label: "Навесное оборудование" },
    { id: "uh_cooling", label: "Система охлаждения" },
    { id: "uh_fuel", label: "Топливная система" },
    { id: "uh_intake_turbo", label: "Впуск / турбина" },
    { id: "uh_exhaust_ecology", label: "Выпуск / экология" },
    { id: "uh_electrical", label: "Электрика" },
    { id: "uh_brakes", label: "Тормозная система" },
    { id: "uh_steering", label: "Рулевое управление" },
    { id: "uh_fluids", label: "Жидкости и бачки" },
    { id: "uh_general", label: "Общее состояние" },
  ],
  wheels: [
    { id: "front_left_wheel", label: "Переднее левое колесо" },
    { id: "front_right_wheel", label: "Переднее правое колесо" },
    { id: "rear_left_wheel", label: "Заднее левое колесо" },
    { id: "rear_right_wheel", label: "Заднее правое колесо" },
    { id: "spare_wheel", label: "Запасное колесо / докатка" },
    { id: "front_left_brake", label: "Передний левый тормозной механизм" },
    { id: "front_right_brake", label: "Передний правый тормозной механизм" },
    { id: "rear_left_brake", label: "Задний левый тормозной механизм" },
    { id: "rear_right_brake", label: "Задний правый тормозной механизм" },
    { id: "wheels_general", label: "Общее состояние" },
  ],
  interior: [...INTERIOR_PARTS, { id: "interior_general", label: "Общее состояние" }],
  diagnostics: [
    { id: "diag_engine", label: "Двигатель" },
    { id: "diag_transmission", label: "Трансмиссия / АКПП / КПП" },
    { id: "diag_abs_esp", label: "ABS / ESP / тормозные системы" },
    { id: "diag_srs_airbag", label: "SRS / Airbag / подушки безопасности" },
    { id: "diag_electric", label: "Электрика / бортовая сеть" },
    { id: "diag_ecology", label: "Экология / выхлоп / катализатор / EGR / лямбда" },
    { id: "diag_body_comfort", label: "Кузовная электроника / комфорт" },
    { id: "diag_steering_suspension", label: "Рулевое управление / подвеска" },
    { id: "diag_awd", label: "Полный привод / AWD / 4WD" },
    { id: "diag_climate", label: "Климат / кондиционер" },
    { id: "diag_immobilizer", label: "Иммобилайзер / доступ / запуск" },
    { id: "diag_general", label: "Общее состояние" },
  ],
};

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  note?: string;
  inspection?: PartInspection;
  children?: MediaItem[];
  groupName?: MediaGroupName;
  /** Group-level inspection (applies to the group as a whole, not individual children) */
  groupInspection?: PartInspection;
}

interface SortableMediaGalleryProps {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  onAddFiles: (groupName: MediaGroupName) => void;
}

type InteractionMode = "normal" | "select";

function GroupPicker({
  onSelect,
  onClose,
  usedGroups,
}: {
  onSelect: (name: MediaGroupName) => void;
  onClose: () => void;
  usedGroups: Set<MediaGroupName>;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
        className="fixed inset-x-4 bottom-8 z-[86] bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden max-w-sm mx-auto"
      >
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-foreground">Выберите группу</p>
        </div>
        <div className="px-2 pb-3 space-y-0.5">
          {(Object.entries(MEDIA_GROUP_LABELS) as [MediaGroupName, string][]).map(([key, label]) => {
            const used = usedGroups.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-colors hover:bg-muted/60 active:scale-[0.98]"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-foreground">{label}</span>
                  {used && <span className="text-[11px] text-muted-foreground">добавить в существующую</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm font-medium text-muted-foreground py-2 hover:text-foreground transition-colors"
          >
            Отмена
          </button>
        </div>
      </motion.div>
    </>
  );
}

function SelectActionsMenu({
  disabled,
  onDelete,
  onGroup,
  canGroup,
  onNote,
}: {
  disabled: boolean;
  onDelete: () => void;
  onGroup: () => void;
  canGroup: boolean;
  onNote?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-full p-1.5 text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="absolute right-0 top-full mt-1 z-[81] bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
            >
              {onNote && (
                <>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onNote(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors active:scale-[0.98]"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Общая заметка
                  </button>
                  <div className="h-px bg-border/40 mx-2" />
                </>
              )}
              {canGroup && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onGroup(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors active:scale-[0.98]"
                >
                  <Layers className="h-4 w-4" />
                  Объединить в группу
                </button>
              )}
              {canGroup && <div className="h-px bg-border/40 mx-2" />}
              <button
                type="button"
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.98]"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableMediaCard({
  item,
  onRemove,
  onPreview,
  interactionMode,
  isSelected,
  onToggleSelect,
  onNote,
  elementTypes,
  onElementTypeChange,
}: {
  item: MediaItem;
  onRemove: () => void;
  onPreview: () => void;
  interactionMode: InteractionMode;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNote?: () => void;
  elementTypes?: readonly { id: string; label: string }[];
  onElementTypeChange?: (elementType: string | undefined) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: interactionMode === "select" });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isSelectMode = interactionMode === "select";
  const dndProps = !isSelectMode ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dndProps}
      onPointerDown={(e) => {
        if (!isSelectMode) {
          listeners?.onPointerDown?.(e);
        }
      }}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect();
        } else {
          onPreview();
        }
      }}
      className={`relative rounded-xl overflow-hidden border-2 bg-card group touch-none select-none transition-all cursor-pointer ${
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : item.inspection && !item.children && (item.inspection.noDamage || item.inspection.tags.length > 0 || item.inspection.note || item.inspection.elementType || (item.inspection.audioRecordings && item.inspection.audioRecordings.length > 0))
            ? "border-primary/40"
            : "border-border/60"
      }`}
    >
      {item.type === "video" ? (
        <>
          <video
            src={item.url}
            className="w-full rounded-xl"
            muted
            playsInline
            draggable={false}
            style={{ pointerEvents: "none" }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={item.url}
          alt=""
          className="w-full rounded-xl object-cover"
          loading="lazy"
          draggable={false}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Group stack indicator */}
      {item.children && item.children.length >= 1 && (
        <>
          <div className="absolute -bottom-1 left-2 right-2 h-3 rounded-b-xl bg-muted/80 border-2 border-t-0 border-border/40 -z-[1]" />
          <div className="absolute -bottom-2 left-4 right-4 h-3 rounded-b-xl bg-muted/50 border-2 border-t-0 border-border/30 -z-[2]" />
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            <div className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 flex items-center gap-1">
              <Layers className="h-3 w-3 text-white/90" />
              <span className="text-[10px] font-semibold text-white/90">{item.children.length}</span>
            </div>
            {item.groupName && (
              <div className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5">
                <span className="text-[10px] font-medium text-white/90">{MEDIA_GROUP_LABELS[item.groupName]}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Selection check */}
      {isSelectMode && (
        <div className="absolute top-2 left-2 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
              isSelected ? "bg-primary text-primary-foreground" : "bg-black/40 text-white/70 backdrop-blur-sm"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
          </motion.div>
        </div>
      )}

      {/* Delete (only in normal mode) */}
      {interactionMode === "normal" && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 left-2 rounded-full bg-black/50 p-1.5 text-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Note button (only in normal mode, inside groups) */}
      {onNote && interactionMode === "normal" && !item.children && (() => {
        const hasData = item.inspection && (item.inspection.noDamage || item.inspection.tags.length > 0 || item.inspection.note || item.inspection.elementType || (item.inspection.audioRecordings && item.inspection.audioRecordings.length > 0));
        const isDraft = item.inspection?.isDraft;
        return (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onNote();
            }}
            className={`absolute top-2 right-2 rounded-full backdrop-blur-sm transition-all active:scale-90 z-10 flex items-center gap-1 ${
              hasData
                ? isDraft
                  ? "bg-amber-500 text-white px-2 py-1"
                  : "bg-primary text-primary-foreground px-2 py-1"
                : "bg-black/60 text-white/90 px-2 py-1"
            }`}
          >
            {hasData ? (
              <>
                <ClipboardList className="h-3 w-3" />
                <span className="text-[9px] font-semibold uppercase tracking-wide">
                  {isDraft ? "Черновик" : "Заметка"}
                </span>
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                <span className="text-[9px] font-semibold uppercase tracking-wide">Заметка</span>
              </>
            )}
          </button>
        );
      })()}

      {/* Draft badge */}
      {onNote && interactionMode === "normal" && !item.children && item.inspection?.isDraft && (
        <div className="absolute top-10 left-2 z-10 rounded-full bg-amber-500/90 backdrop-blur-sm px-2 py-0.5">
          <span className="text-[9px] font-semibold text-white tracking-wide uppercase">Черновик</span>
        </div>
      )}

      {/* Inspection info — right side, below note button */}
      {interactionMode === "normal" && !item.children && item.inspection && (() => {
        const insp = item.inspection!;
        const hasElementType = elementTypes && elementTypes.length > 0 && insp.elementType;
        const tagEmojis = resolveTags(insp.tags, item.groupName, insp.elementType);
        const hasNote = !!insp.note;
        const hasAudio = insp.audioRecordings && insp.audioRecordings.length > 0;
        const hasAnything = hasElementType || tagEmojis.length > 0 || hasNote || hasAudio || insp.noDamage;
        if (!hasAnything) return null;
        const hasRightBadges = hasElementType || insp.noDamage;
        const hasBottom = tagEmojis.length > 0 || hasNote || hasAudio;
        return (
          <>
            {hasRightBadges && (
              <div className="absolute top-10 right-2 z-10 flex flex-col items-end gap-1">
                {hasElementType && (
                  <div className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5">
                    <span className="text-[10px] font-medium text-white/90">
                      {elementTypes!.find(et => et.id === insp.elementType)?.label}
                    </span>
                  </div>
                )}
                {insp.noDamage && (
                  <div className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 flex items-center gap-1">
                    <span className="text-[10px] leading-none">✅</span>
                    <span className="text-[10px] text-white/80">Ок</span>
                  </div>
                )}
              </div>
            )}
            {hasBottom && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent pt-4 px-2 pb-1.5 space-y-1">
                {tagEmojis.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {tagEmojis.map((tag, i) => (
                      <span key={i} className="text-[11px] leading-none" title={tag.label}>{tag.emoji}</span>
                    ))}
                  </div>
                )}
                {(hasNote || hasAudio) && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    {hasAudio && <Mic className="h-3 w-3 text-white/70 shrink-0" />}
                    {hasNote && (
                      <span className="text-[10px] text-white/80 truncate leading-tight">{insp.note}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function MediaOverlayCard({ item }: { item: MediaItem }) {
  return (
    <div className="rounded-xl overflow-hidden border-2 border-primary/60 bg-card shadow-2xl w-40">
      {item.type === "video" ? (
        <video src={item.url} className="w-full rounded-xl" muted playsInline />
      ) : (
        <img src={item.url} alt="" className="w-full rounded-xl object-cover" />
      )}
    </div>
  );
}

function InspectionComments({ inspection, groupName }: { inspection?: PartInspection | null; groupName?: MediaGroupName }) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!inspection) return null;

  const elementTypes = groupName ? MEDIA_GROUP_ELEMENTS[groupName] : undefined;
  const elementLabel = elementTypes?.find(et => et.id === inspection.elementType)?.label;

  const hasContent = inspection.noDamage || inspection.tags.length > 0 || inspection.note || inspection.elementType || inspection.paintThickness || (inspection.audioRecordings && inspection.audioRecordings.length > 0);
  if (!hasContent) return null;

  const toggleAudio = (idx: number) => {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      setPlayingIdx(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(inspection.audioRecordings![idx]);
    audio.onended = () => setPlayingIdx(null);
    audio.play();
    audioRef.current = audio;
    setPlayingIdx(idx);
  };

  return (
    <div className="space-y-2.5">
      {(groupName || elementLabel) && (
        <div className="flex items-center gap-2">
          {groupName && <span className="text-[11px] font-bold text-white/90">{MEDIA_GROUP_LABELS[groupName]}</span>}
          {groupName && elementLabel && <span className="text-[11px] text-white/30">·</span>}
          {elementLabel && <span className="text-[11px] font-medium text-white/70">{elementLabel}</span>}
        </div>
      )}
      {inspection.noDamage && (
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span className="text-[13px] text-[hsl(var(--success))] font-medium">{groupName === "diagnostics" ? "Без ошибок" : "Без повреждений"}</span>
        </div>
      )}
      {inspection.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resolveTags(inspection.tags, groupName, inspection.elementType).map(tag => (
              <span key={tag.id} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[12px] text-white/80">
                <span>{tag.emoji}</span>
                <span>{tag.label}</span>
              </span>
          ))}
        </div>
      )}
      {inspection.paintThickness && !inspection.noDamage && (
        <div className="flex items-center gap-1.5 text-[12px] text-white/60">
          <Paintbrush className="h-3.5 w-3.5" />
          <span>{inspection.paintThickness.from}–{inspection.paintThickness.to} мкм</span>
        </div>
      )}
      {inspection.note && <p className="text-[13px] text-white/70 leading-relaxed">{inspection.note}</p>}
      {inspection.audioRecordings && inspection.audioRecordings.length > 0 && (
        <div className="space-y-1.5">
          {inspection.audioRecordings.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleAudio(idx); }}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[12px] text-white/80 hover:bg-white/15 transition-colors w-full"
            >
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/15">
                {playingIdx === idx ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white ml-0.5" />}
              </div>
              <span>🎙️ Аудиозапись {idx + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaPresentation({
  items,
  initialIndex,
  onClose,
  itemGroupMap,
  groupName,
  onNote,
}: {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  itemGroupMap?: Map<string, MediaGroupName>;
  groupName?: MediaGroupName;
  onNote?: (itemId: string) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];

  const go = useCallback((dir: number) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    setDirection(dir);
    setIndex(next);
  }, [index, items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, onClose]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  if (!item) return null;

  const currentGroupName = groupName || itemGroupMap?.get(item.id);
  const hasInspection = item.inspection && (
    item.inspection.noDamage ||
    item.inspection.tags.length > 0 ||
    item.inspection.note ||
    item.inspection.elementType ||
    item.inspection.paintThickness ||
    (item.inspection.audioRecordings && item.inspection.audioRecordings.length > 0)
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
    }
  };

  const totalDots = Math.min(items.length, 10);
  const dotStart = Math.max(0, Math.min(index - Math.floor(totalDots / 2), items.length - totalDots));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-[13px] font-medium">Назад</span>
        </button>
        <div className="flex items-center gap-2">
          {currentGroupName && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
              <Layers className="h-3 w-3 text-white/60" />
              <span className="text-[11px] text-white/70">{MEDIA_GROUP_LABELS[currentGroupName]}</span>
            </div>
          )}
          {onNote && (
            <button
              type="button"
              onClick={() => onNote(item.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors active:scale-95 ${
                hasInspection
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="text-[12px] font-medium">{hasInspection ? "Заметка" : "Добавить заметку"}</span>
            </button>
          )}
          <span className="text-[12px] text-white/50 tabular-nums">{index + 1}/{items.length}</span>
        </div>
      </div>

      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full h-full flex items-center justify-center"
          >
            {item.type === "video" ? (
              <video src={item.url} className="max-h-full max-w-full object-contain" controls autoPlay playsInline />
            ) : (
              <img src={item.url} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1 py-2 shrink-0">
          {Array.from({ length: totalDots }, (_, i) => {
            const dotIndex = dotStart + i;
            const isActive = dotIndex === index;
            return (
              <button
                key={dotIndex}
                type="button"
                onClick={() => { setDirection(dotIndex > index ? 1 : -1); setIndex(dotIndex); }}
                className={`rounded-full transition-all duration-200 ${isActive ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"}`}
              />
            );
          })}
        </div>
      )}

      {hasInspection && (
        <div className="shrink-0 max-h-[35vh] overflow-y-auto bg-black/90 border-t border-white/10 backdrop-blur-sm">
          <div className="px-5 py-4">
            <InspectionComments inspection={item.inspection} groupName={currentGroupName} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function SortableMediaGallery({
  items,
  onChange,
  onAddFiles,
}: SortableMediaGalleryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("normal");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [groupLightboxIndex, setGroupLightboxIndex] = useState<number | null>(null);
  const [pendingGroupNav, setPendingGroupNav] = useState<MediaGroupName | null>(null);

  // Group view driven by URL search param
  const openGroupId = searchParams.get("group");
  const setOpenGroupId = useCallback((id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("group", id);
      else next.delete("group");
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const navigateBackFromGroup = useCallback(() => {
    window.history.back();
  }, []);

  // Group-internal interaction state
  const [groupInteractionMode, setGroupInteractionMode] = useState<InteractionMode>("normal");
  const [groupSelectedIds, setGroupSelectedIds] = useState<Set<string>>(new Set());
  const [groupActiveId, setGroupActiveId] = useState<string | null>(null);
  const [groupNoteModalOpen, setGroupNoteModalOpen] = useState(false);
  const [groupSingleNoteId, setGroupSingleNoteId] = useState<string | null>(null);

  const openGroup = openGroupId ? items.find((i) => i.id === openGroupId) : null;

  // If group ID in URL doesn't match any item, clear it
  useEffect(() => {
    if (openGroupId && !items.find((i) => i.id === openGroupId)) {
      setOpenGroupId(null);
    }
  }, [openGroupId, items, setOpenGroupId]);

  useEffect(() => {
    if (!openGroupId) {
      setGroupInteractionMode("normal");
      setGroupSelectedIds(new Set());
      setGroupLightboxIndex(null);
    }
  }, [openGroupId]);

  // Auto-navigate into group after files are added
  useEffect(() => {
    if (pendingGroupNav) {
      const groupItem = items.find((i) => i.groupName === pendingGroupNav && i.children && i.children.length > 0);
      if (groupItem) {
        setOpenGroupId(groupItem.id);
        setPendingGroupNav(null);
      }
    }
  }, [items, pendingGroupNav, setOpenGroupId]);

  const usedGroups = useMemo(() => {
    const set = new Set<MediaGroupName>();
    items.forEach((item) => { if (item.groupName) set.add(item.groupName); });
    return set;
  }, [items]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { flatItems, itemGroupMap } = useMemo(() => {
    const result: MediaItem[] = [];
    const groupMap = new Map<string, MediaGroupName>();
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          result.push(child);
          if (item.groupName) groupMap.set(child.id, item.groupName);
        }
      } else {
        result.push(item);
      }
    }
    return { flatItems: result, itemGroupMap: groupMap };
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          onChange(arrayMove(items, oldIndex, newIndex));
        }
      }
    },
    [items, onChange]
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setInteractionMode("normal");
      return next;
    });
  }, []);

  const exitMode = useCallback(() => {
    setInteractionMode("normal");
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    onChange(items.filter((i) => !selectedIds.has(i.id)));
    exitMode();
  }, [items, selectedIds, onChange, exitMode]);

  const groupSelected = useCallback((groupName: MediaGroupName) => {
    if (selectedIds.size < 1) return;
    const selected: MediaItem[] = [];
    const rest: MediaItem[] = [];
    let firstIndex = -1;
    items.forEach((item, idx) => {
      if (selectedIds.has(item.id)) {
        selected.push(item);
        if (firstIndex === -1) firstIndex = idx;
      } else {
        rest.push(item);
      }
    });

    // Check if group already exists — merge into it
    const existingIdx = rest.findIndex(item => item.groupName === groupName);
    if (existingIdx !== -1) {
      const existing = rest[existingIdx];
      rest[existingIdx] = {
        ...existing,
        children: [...(existing.children || []), ...selected],
      };
    } else {
      // Create new group
      if (selected.length < 1) return;
      const group: MediaItem = {
        id: `group-${Date.now()}`,
        url: selected[0].url,
        type: selected[0].type,
        children: selected,
        groupName,
      };
      rest.splice(firstIndex, 0, group);
    }

    onChange(rest);
    setShowGroupPicker(false);
    exitMode();
  }, [items, selectedIds, onChange, exitMode]);

  return (
    <>
      {/* Root level — list view, hidden when group is open */}
      {!openGroupId && (
        <div className="space-y-2">
          {/* Required groups */}
          {(() => {
            const REQUIRED_GROUPS: MediaGroupName[] = ["body", "glass", "underhood", "interior"];
            const OPTIONAL_GROUPS: MediaGroupName[] = ["structural", "wheels", "lighting", "diagnostics"];
            const requiredFilled = REQUIRED_GROUPS.filter(k => items.some(i => i.groupName === k && i.children && i.children.length > 0)).length;

            const renderGroupButton = (groupKey: MediaGroupName) => {
              const label = MEDIA_GROUP_LABELS[groupKey];
              const groupItem = items.find((i) => i.groupName === groupKey && i.children && i.children.length > 0);
              const fileCount = groupItem?.children?.length || 0;
              const hasFiles = fileCount > 0;
              const groupIcons: Record<MediaGroupName, string> = {
                body: "🚗", structural: "🏗️", glass: "🪟", lighting: "💡", underhood: "🔧", wheels: "🛞", interior: "💺", diagnostics: "🖥️",
              };

              // Build element-level inspection summary (like InspectionGroupButton)
              const elementTypes = MEDIA_GROUP_ELEMENTS[groupKey];
              // Tag resolution via unified resolver
              
              const elementsWithData: { elementId: string; elementLabel: string; noDamage: boolean; tags: { id: string; emoji: string; label: string; isSerious: boolean }[] }[] = [];
              if (groupItem?.children) {
                const byElement = new Map<string, { noDamage: boolean; tagIds: Set<string> }>();
                for (const child of groupItem.children) {
                  if (!child.inspection) continue;
                  const elType = child.inspection.elementType || "";
                  if (!elType && !child.inspection.noDamage && child.inspection.tags.length === 0 && !child.inspection.note && !(child.inspection.audioRecordings && child.inspection.audioRecordings.length > 0)) continue;
                  let entry = byElement.get(elType);
                  if (!entry) { entry = { noDamage: false, tagIds: new Set() }; byElement.set(elType, entry); }
                  if (child.inspection.noDamage) entry.noDamage = true;
                  for (const t of child.inspection.tags) entry.tagIds.add(t);
                }
                for (const [elType, data] of byElement) {
                  const elDef = elementTypes.find(et => et.id === elType);
                  const elLabel = elDef?.label || (elType || "");
                  if (!elLabel) continue;
                  const tagDefs = resolveTags(Array.from(data.tagIds), groupKey, elType).map(t => ({
                    ...t, isSerious: t.severity === "serious",
                  }));
                  elementsWithData.push({ elementId: elType, elementLabel: elLabel, noDamage: data.noDamage && tagDefs.length === 0, tags: tagDefs });
                }
              }

              const hasDamage = elementsWithData.some(e => e.tags.length > 0);
              const allInspected = hasFiles && elementsWithData.length > 0 && groupItem?.children?.every(c => c.inspection && (c.inspection.noDamage || c.inspection.tags.length > 0 || !!c.inspection.elementType || !!c.inspection.note || (c.inspection.audioRecordings && c.inspection.audioRecordings.length > 0)));

              return (
                <motion.button
                  key={groupKey}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (hasFiles) {
                      setOpenGroupId(groupItem!.id);
                    } else {
                      setPendingGroupNav(groupKey);
                      onAddFiles(groupKey);
                    }
                  }}
                  className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors rounded-xl border bg-card border-border hover:border-primary/40"
                >
                  <span className="text-lg w-7 text-center flex-shrink-0 mt-0.5">{groupIcons[groupKey]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {hasFiles && (
                        <span className="text-[11px] text-muted-foreground ml-2">📷 {fileCount}</span>
                      )}
                    </div>
                    {!hasFiles && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Нет файлов</p>
                    )}
                    {elementsWithData.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {elementsWithData.map((el) => (
                          <div key={el.elementId} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">{el.elementLabel}:</span>
                            {el.noDamage && (
                              <span className="text-[10px] text-[hsl(var(--success))] font-medium">ОК</span>
                            )}
                            {el.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                                  tag.isSerious
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning)/0.85)]"
                                }`}
                              >
                                {tag.emoji} {tag.label}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {hasFiles ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </motion.button>
              );
            };

            return (
              <>
                <p className="text-[11px] font-medium text-muted-foreground px-1">Обязательные ({requiredFilled}/{REQUIRED_GROUPS.length})</p>
                {REQUIRED_GROUPS.map(renderGroupButton)}
                <p className="text-[11px] font-medium text-muted-foreground px-1 pt-2">Необязательные</p>
                {OPTIONAL_GROUPS.map(renderGroupButton)}
              </>
            );
          })()}

        </div>
      )}

      {/* Group detail masonry view */}
      <AnimatePresence>
        {openGroup && openGroup.children && (() => {
          const groupChildren = openGroup.children!;
          const groupActiveItem = groupActiveId ? groupChildren.find((c) => c.id === groupActiveId) : null;

          const updateGroupChildren = (newChildren: MediaItem[]) => {
            const newItems = items.map((item) =>
              item.id === openGroup.id ? { ...item, children: newChildren, url: newChildren[0]?.url ?? item.url } : item
            );
            onChange(newItems);
          };

          const groupToggleSelect = (id: string) => {
            setGroupSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              if (next.size === 0) setGroupInteractionMode("normal");
              return next;
            });
          };

          const exitGroupMode = () => {
            setGroupInteractionMode("normal");
            setGroupSelectedIds(new Set());
          };

          const deleteGroupSelected = () => {
            const newChildren = groupChildren.filter((c) => !groupSelectedIds.has(c.id));
            if (newChildren.length === 0) {
              onChange(items.filter((i) => i.id !== openGroup.id));
              navigateBackFromGroup();
            } else {
              updateGroupChildren(newChildren);
            }
            exitGroupMode();
          };

          const closeGroupView = () => {
            exitGroupMode();
            setGroupLightboxIndex(null);
            navigateBackFromGroup();
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`fixed inset-0 z-[95] bg-background flex flex-col ${groupNoteModalOpen ? "invisible" : ""}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
                <button type="button" onClick={closeGroupView} className="rounded-full p-1.5 text-foreground hover:bg-muted/60 transition-colors active:scale-90">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{openGroup.groupName ? MEDIA_GROUP_LABELS[openGroup.groupName] : "Группа"}</p>
                  <p className="text-xs text-muted-foreground">{groupChildren.length} файлов</p>
                </div>
                {groupInteractionMode === "normal" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGroupInteractionMode("select")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-95 px-2 py-1 rounded-lg hover:bg-muted/60"
                    >
                      Выбрать
                    </button>
                  </div>
                )}
              </div>

              {/* Group select mode header */}
              <AnimatePresence>
                {groupInteractionMode === "select" && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center justify-between px-4 py-2 border-b border-border/60">
                    <button type="button" onClick={exitGroupMode} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                    <span className="text-sm font-semibold text-foreground">Выбрано: {groupSelectedIds.size}</span>
                    <div className="w-16" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom action bar for selected items */}
              <AnimatePresence>
                {groupInteractionMode === "select" && groupSelectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-x-0 bottom-0 z-[85] bg-card/95 backdrop-blur-md border-t border-border/60 px-6 py-3 flex items-center justify-around max-w-lg mx-auto"
                  >
                    <button
                      type="button"
                      onClick={() => setGroupNoteModalOpen(true)}
                      className="flex flex-col items-center gap-1 text-primary active:scale-95 transition-transform"
                    >
                      <div className="rounded-full bg-primary/10 p-2.5">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-medium">Заметка</span>
                    </button>
                    <button
                      type="button"
                      onClick={deleteGroupSelected}
                      className="flex flex-col items-center gap-1 text-destructive active:scale-95 transition-transform"
                    >
                      <div className="rounded-full bg-destructive/10 p-2.5">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-medium">Удалить</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Masonry grid with DnD */}
              <div className="flex-1 overflow-y-auto p-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(e) => setGroupActiveId(String(e.active.id))}
                  onDragEnd={(e) => {
                    setGroupActiveId(null);
                    const { active, over } = e;
                    if (over && active.id !== over.id) {
                      const oldIdx = groupChildren.findIndex((c) => c.id === active.id);
                      const newIdx = groupChildren.findIndex((c) => c.id === over.id);
                      if (oldIdx !== -1 && newIdx !== -1) updateGroupChildren(arrayMove(groupChildren, oldIdx, newIdx));
                    }
                  }}
                >
                  <SortableContext items={groupChildren.map((c) => c.id)} strategy={rectSortingStrategy}>
                    <div className="columns-2 gap-3 space-y-3">
                      {/* Add media button — first item, left column */}
                      {groupInteractionMode === "normal" && (
                        <div className="break-inside-avoid">
                          <button
                            type="button"
                            onClick={() => openGroup.groupName && onAddFiles(openGroup.groupName)}
                            className="w-full flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-card/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-[0.97]"
                          >
                            <Plus className="h-8 w-8" />
                            <span className="text-xs font-medium">Фото / Видео</span>
                          </button>
                        </div>
                      )}
                      {groupChildren.map((child, ci) => (
                        <div key={child.id} className="break-inside-avoid">
                          <SortableMediaCard
                            item={child}
                            onRemove={() => {
                              const nc = groupChildren.filter((c) => c.id !== child.id);
                              if (nc.length === 0) {
                                onChange(items.filter((i) => i.id !== openGroup.id));
                                navigateBackFromGroup();
                              } else if (nc.length === 1) {
                                onChange(items.map((i) => i.id === openGroup.id ? { ...nc[0] } : i));
                                navigateBackFromGroup();
                              } else {
                                updateGroupChildren(nc);
                              }
                            }}
                            onPreview={() => { if (groupInteractionMode === "normal") setGroupLightboxIndex(ci); }}
                            interactionMode={groupInteractionMode}
                            isSelected={groupSelectedIds.has(child.id)}
                            onToggleSelect={() => groupToggleSelect(child.id)}
                            onNote={() => {
                              setGroupSingleNoteId(child.id);
                              setGroupNoteModalOpen(true);
                            }}
                            elementTypes={openGroup.groupName ? MEDIA_GROUP_ELEMENTS[openGroup.groupName] : undefined}
                            onElementTypeChange={(elType) => {
                              updateGroupChildren(groupChildren.map((c) =>
                                c.id === child.id
                                  ? { ...c, inspection: { ...(c.inspection || { partId: c.id, label: "", noDamage: false, tags: [], micronValues: {}, note: "", photos: [] }), elementType: elType } }
                                  : c
                              ));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>{groupActiveItem ? <MediaOverlayCard item={groupActiveItem} /> : null}</DragOverlay>
                </DndContext>
              </div>

              {/* Group-scoped presentation */}
              <AnimatePresence>
                {groupLightboxIndex !== null && (
                  <MediaPresentation
                    items={groupChildren}
                    initialIndex={groupLightboxIndex}
                    onClose={() => setGroupLightboxIndex(null)}
                    groupName={openGroup.groupName}
                    itemGroupMap={itemGroupMap}
                    onNote={(itemId) => {
                      setGroupLightboxIndex(null);
                      setGroupSingleNoteId(itemId);
                      setGroupNoteModalOpen(true);
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Group shared note modal */}
              
              <PartInspectionModal
                open={groupNoteModalOpen}
                onOpenChange={(open) => {
                  setGroupNoteModalOpen(open);
                  if (!open) {
                    setGroupSingleNoteId(null);
                    setGroupSelectedIds(new Set());
                    setGroupInteractionMode("normal");
                  }
                }}
                partId={groupSingleNoteId ? `group-single-note-${groupSingleNoteId}` : `group-note-${openGroup.id}`}
                partLabel={groupSingleNoteId ? "Заметка элемента" : `Заметка группы — ${openGroup.groupName ? MEDIA_GROUP_LABELS[openGroup.groupName] : "Группа"}`}
                inspection={groupSingleNoteId ? (groupChildren.find((c) => c.id === groupSingleNoteId)?.inspection ?? null) : (openGroup.groupInspection ?? null)}
                onSave={(insp) => {
                  if (groupSingleNoteId) {
                    // Single element note — write to child's inspection
                    updateGroupChildren(groupChildren.map((c) =>
                      c.id === groupSingleNoteId ? { ...c, inspection: insp } : c
                    ));
                  } else {
                    // Group-level note — write to groupInspection on the group entity
                    const newItems = items.map((item) =>
                      item.id === openGroup.id ? { ...item, groupInspection: insp } : item
                    );
                    onChange(newItems);
                  }
                }}
                strategy={(() => {
                  const gn = openGroup.groupName || "body";
                  const base = { noDamage: true, tags: true, note: true, photos: false, elementTypes: MEDIA_GROUP_ELEMENTS[gn] };
                  // Import strategies from inspection.ts for tag groups
                  switch (gn) {
                    case "glass": return { ...base, key: "group_note_glass", customTagGroups: GLASS_DAMAGE_TAG_GROUPS, paintThickness: false };
                    case "lighting": return { ...base, key: "group_note_lighting", customTagGroups: LIGHTING_DAMAGE_TAG_GROUPS, paintThickness: false };
                    case "structural": return { ...base, key: "group_note_structural", customTagGroups: STRUCTURAL_DAMAGE_TAG_GROUPS, paintThickness: true };
                    case "underhood": return { ...base, key: "group_note_underhood", customTagGroups: UNDERHOOD_DAMAGE_TAG_GROUPS, paintThickness: false };
                    case "wheels": return { ...base, key: "group_note_wheels", customTagGroups: WHEELS_DAMAGE_TAG_GROUPS, paintThickness: false };
                    case "interior": return { ...base, key: "group_note_interior", customTagGroups: [...INTERIOR_MAIN_TAG_GROUPS, ...INTERIOR_DASHBOARD_TAG_GROUPS], elementTagGroups: INTERIOR_ELEMENT_TAG_GROUPS, paintThickness: false };
                    case "diagnostics": return { ...base, key: "group_note_diagnostics", customTagGroups: DIAGNOSTICS_TAG_GROUPS, elementTagGroups: DIAGNOSTICS_ELEMENT_TAG_GROUPS, paintThickness: false, noDamageLabel: "Без ошибок" };
                    default: return { ...base, key: "group_note_body", paintThickness: true };
                  }
                 })()}
                noteContext={groupSingleNoteId
                  ? { emoji: "📸", label: "Заметка элемента" }
                  : { emoji: "📋", label: `Группа — ${openGroup.groupName ? MEDIA_GROUP_LABELS[openGroup.groupName] : "Группа"}` }
                }
                onContinueInspection={() => {
                  setGroupNoteModalOpen(false);
                  setGroupSingleNoteId(null);
                  setGroupSelectedIds(new Set());
                  setGroupInteractionMode("normal");
                }}
              />
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Presentation view */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <MediaPresentation
            items={flatItems}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            itemGroupMap={itemGroupMap}
          />
        )}
      </AnimatePresence>

      {/* Group picker */}
      <AnimatePresence>
        {showGroupPicker && (
          <GroupPicker
            onSelect={groupSelected}
            onClose={() => setShowGroupPicker(false)}
            usedGroups={usedGroups}
          />
        )}
      </AnimatePresence>

      {/* Delete group confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (() => {
          const group = items.find(i => i.id === deleteConfirmId);
          const label = group?.groupName ? MEDIA_GROUP_LABELS[group.groupName] : "Группа";
          const count = group?.children?.length || 0;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/50"
                onClick={() => setDeleteConfirmId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[91] bg-card border border-border/60 rounded-2xl shadow-2xl max-w-sm mx-auto p-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">Удалить группу?</p>
                  <p className="text-xs text-muted-foreground">
                    {label} ({count} файлов) будет удалена без возможности восстановления.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors active:scale-[0.98]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(items.filter(i => i.id !== deleteConfirmId));
                      setDeleteConfirmId(null);
                    }}
                    className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors active:scale-[0.98]"
                  >
                    Удалить
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
