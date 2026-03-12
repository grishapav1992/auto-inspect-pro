import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, Check, ChevronLeft, ChevronRight, ImagePlus, StickyNote, Paintbrush, Plus, Trash2, Settings, EyeOff, Eye, GripVertical, Mic, MicOff, Play, Square, Pause, ChevronsUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PartInspection, DamageTagId, InspectionStrategy } from "@/types/inspection";
import { DAMAGE_TAG_GROUPS, DAMAGE_TAGS, BODY_PARTS_STRATEGY } from "@/types/inspection";
import { isPartStateFilled } from "@/lib/completionContract";
import { resolveTag } from "@/lib/tagResolver";
import EditablePaintValue from "@/components/EditablePaintValue";
import { useUserTags } from "@/contexts/UserTagContext";

interface PartInfo {
  id: string;
  label: string;
}

interface GroupInfo {
  title: string;
  parts: string[];
}

interface PartInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId?: string;
  partLabel?: string;
  parts?: PartInfo[];
  inspection: PartInspection | null;
  inspections?: Record<string, PartInspection>;
  onSave: (inspection: PartInspection) => void;
  onSaveMultiple?: (inspections: Record<string, PartInspection>) => void;
  onConfirm?: () => void;
  onContinueInspection?: () => void;
  groups?: GroupInfo[];
  currentGroupIndex?: number;
  onSwitchGroup?: (groupIndex: number, currentResults: Record<string, PartInspection>) => void;
  strategy?: InspectionStrategy;
  /** Context badge: "📸 Элемент" | "📋 Группа" — shown in header to clarify what the note applies to */
  noteContext?: { emoji: string; label: string };
}

interface PartState {
  noDamage: boolean;
  tags: DamageTagId[];
  note: string;
  photos: string[];
  paintFrom: number;
  paintTo: number;
  tagPhotos: Record<string, string[]>;
  elementType: string;
  audioRecordings: string[];
}

function makePartState(inspection: PartInspection | null | undefined): PartState {
  return {
    noDamage: inspection?.noDamage ?? false,
    tags: inspection?.tags ? [...inspection.tags] : [],
    note: inspection?.note || "",
    photos: inspection?.photos ? [...inspection.photos] : [],
    paintFrom: inspection?.paintThickness?.from ?? 80,
    paintTo: inspection?.paintThickness?.to ?? 200,
    tagPhotos: inspection?.tagPhotos ? JSON.parse(JSON.stringify(inspection.tagPhotos)) : {},
    elementType: inspection?.elementType || "",
    audioRecordings: inspection?.audioRecordings ? [...inspection.audioRecordings] : [],
  };
}

function getTagEmoji(tagId: string, strategy: InspectionStrategy, elementType?: string): string {
  // Use unified resolver — pass strategy key as groupName hint
  const def = resolveTag(tagId, strategy.key, elementType);
  return def?.emoji || "";
}

type MergedTag = { id: string; label: string; emoji: string; isUser: boolean; isDisabled: boolean };

interface DraggableTagListProps {
  tags: MergedTag[];
  groupKey: string;
  onReorder: (newOrder: string[]) => void;
  onToggleDefault: (tagId: string) => void;
  onRemoveUser: (tagId: string) => void;
  onAddTag: (tag: { label: string; emoji: string }) => void;
  newTagLabel: string;
  setNewTagLabel: (v: string) => void;
  newTagEmoji: string;
  setNewTagEmoji: (v: string) => void;
}

const EMOJI_GRID = [
  "🏷️", "⚠️", "🔧", "📌", "🚩", "💡", "🔍", "📎",
  "🎨", "🖌️", "💥", "🧱", "✏️", "🔄", "🔘", "⚡",
  "🕶️", "📄", "🔲", "💧", "🚗", "🔩", "🛠️", "⚙️",
  "🧲", "🪛", "🔋", "💨", "🧴", "🪟", "🧽", "🔑",
  "📷", "🔦", "🧯", "🛞", "🪞", "📐", "🧪", "🔬",
  "🪣", "🧰", "🔌", "🪤", "🧹", "🪜", "🔗", "🪝",
  "🛡️", "🎯", "🧿", "💎", "🔶", "🔷", "🟡", "🟠",
  "🟢", "🔴", "🟣", "⚫", "⬛", "🟤", "🔵", "⬜",
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-lg px-2 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted transition-colors"
      >
        {value}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 flex flex-col overflow-hidden [&>button]:hidden bg-background">
        <div className="relative px-4 pt-3 pb-3 border-b border-border/60">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Выбор иконки</p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">Нажмите на иконку</h2>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">
            {value}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={`aspect-square flex items-center justify-center rounded-xl text-2xl transition-all active:scale-90 ${
                  value === emoji
                    ? "bg-primary/10 ring-2 ring-primary/50 shadow-sm"
                    : "bg-card border border-border/60 hover:bg-muted"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DraggableTagList({
  tags, onReorder, onToggleDefault, onRemoveUser, onAddTag,
  newTagLabel, setNewTagLabel, newTagEmoji, setNewTagEmoji,
}: DraggableTagListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragIdx(idx);
    setOverIdx(idx);
    dragStartY.current = e.clientY;
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    setDragOffset(e.clientY - dragStartY.current);
    const rects = itemRefs.current.map((el) => el?.getBoundingClientRect());
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (rect && e.clientY < rect.top + rect.height / 2) {
        setOverIdx(i);
        return;
      }
    }
    setOverIdx(tags.length - 1);
  };

  const handlePointerUp = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const newOrder = [...tags.map((t) => t.id)];
      const [moved] = newOrder.splice(dragIdx, 1);
      newOrder.splice(overIdx, 0, moved);
      onReorder(newOrder);
    }
    setDragIdx(null);
    setOverIdx(null);
    setDragOffset(0);
  };

  return (
    <div
      className="space-y-1.5"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {tags.map((tag, ti) => {
        const isDragging = dragIdx === ti;
        const showDropAbove = overIdx === ti && dragIdx !== null && dragIdx !== ti;

        return (
          <div
            key={tag.id}
            ref={(el) => { itemRefs.current[ti] = el; }}
            className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
              isDragging
                ? "border-primary/50 bg-primary/10 shadow-lg z-50"
                : tag.isDisabled
                  ? "border-border/40 bg-muted/30 opacity-50"
                  : tag.isUser
                    ? "border-dashed border-primary/40 bg-primary/5"
                    : "border-border/60 bg-card"
            }`}
            style={isDragging ? { transform: `translateY(${dragOffset}px) scale(1.02)`, zIndex: 50, position: "relative" } : undefined}
          >
            {showDropAbove && (
              <div className="absolute left-3 right-3 -top-[5px] h-[3px] bg-primary rounded-full" />
            )}

            <div
              onPointerDown={(e) => handlePointerDown(e, ti)}
              className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <span className="text-base">{tag.emoji}</span>
            <span className={`flex-1 text-[13px] font-medium ${tag.isDisabled ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {tag.label}
            </span>

            {tag.isUser ? (
              <button type="button" onClick={() => onRemoveUser(tag.id)}
                className="p-1 rounded-md text-destructive/60 hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" onClick={() => onToggleDefault(tag.id)}
                className={`p-1 rounded-md transition-colors ${tag.isDisabled ? "text-muted-foreground/50 hover:text-foreground" : "text-primary/60 hover:text-primary"}`}>
                {tag.isDisabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 mt-2">
        <EmojiPicker value={newTagEmoji} onChange={setNewTagEmoji} />
        <input type="text" value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)}
          placeholder="Новый тег..."
          className="flex-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTagLabel.trim()) {
              onAddTag({ label: newTagLabel.trim(), emoji: newTagEmoji });
              setNewTagLabel(""); setNewTagEmoji("🏷️");
            }
          }}
        />
        <button type="button" disabled={!newTagLabel.trim()} onClick={() => {
          if (newTagLabel.trim()) { onAddTag({ label: newTagLabel.trim(), emoji: newTagEmoji }); setNewTagLabel(""); setNewTagEmoji("🏷️"); }
        }} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm font-medium disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Speech recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function NoteWithVoice({ note, onNoteChange, audioRecordings, onAudioChange }: {
  note: string;
  onNoteChange: (val: string) => void;
  audioRecordings: string[];
  onAudioChange: (recs: string[]) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Speech-to-text dictation
  const [isDictating, setIsDictating] = useState(false);
  const sttRef = useRef<any>(null);
  const noteRef = useRef(note);
  noteRef.current = note;
  const onNoteChangeRef = useRef(onNoteChange);
  onNoteChangeRef.current = onNoteChange;

  const hasSpeechSupport = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      sttRef.current?.stop();
      sttRef.current = null;
      setIsDictating(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        const prev = noteRef.current;
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        onNoteChangeRef.current(prev + sep + transcript.trim());
      }
    };
    recognition.onerror = (e: any) => { if (e.error !== "no-speech") setIsDictating(false); };
    recognition.onend = () => setIsDictating(false);
    sttRef.current = recognition;
    recognition.start();
    setIsDictating(true);
  }, [isDictating]);

  const formatNoteWithAI = useCallback(() => {
    if (!note || note.length < 10) return;
    const sentences = note
      .replace(/([.!?])(\s)/g, "$1\n")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
    const paragraphs: string[] = [];
    let current: string[] = [];
    sentences.forEach((s, i) => {
      current.push(s);
      if (current.length >= 3 || i === sentences.length - 1) {
        paragraphs.push(current.join(" "));
        current = [];
      }
    });
    onNoteChange(paragraphs.join("\n\n"));
  }, [note, onNoteChange]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            onAudioChange([...audioRecordings, reader.result as string]);
          }
        };
        reader.readAsDataURL(blob);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      console.warn("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const removeAudio = (idx: number) => {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      setPlayingIdx(null);
    }
    onAudioChange(audioRecordings.filter((_, i) => i !== idx));
  };

  const togglePlay = (idx: number) => {
    if (playingIdx === idx) {
      audioRef.current?.pause();
      setPlayingIdx(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioRecordings[idx]);
    audio.onended = () => setPlayingIdx(null);
    audio.play();
    audioRef.current = audio;
    setPlayingIdx(idx);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
      sttRef.current?.stop();
    };
  }, []);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Заметка</p>
        </div>
        <div className="flex items-center gap-1">
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleDictation}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
                isDictating
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent"
              }`}
            >
              {isDictating ? (
                <>
                  <MicOff className="h-3 w-3" />
                  <span className="animate-pulse">Стоп</span>
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3" />
                  Диктовка
                </>
              )}
            </button>
          )}
          {note.length >= 10 && (
            <button
              type="button"
              onClick={formatNoteWithAI}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
            >
              <span>✨</span> ИИ
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Опишите повреждения..."
          className={`w-full min-h-[80px] rounded-xl border px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/30 focus:border-primary/20 resize-none transition-all ${
            isDictating ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card"
          }`}
        />
        {isDictating && (
          <div className="absolute bottom-2 left-3.5 flex items-center gap-1.5 text-[10px] text-destructive font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            Говорите...
          </div>
        )}
      </div>

      {/* Audio recordings list */}
      {audioRecordings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {audioRecordings.map((_, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
              <button type="button" onClick={() => togglePlay(idx)}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                {playingIdx === idx ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-foreground">Аудиозапись {idx + 1}</p>
                <p className="text-[10px] text-muted-foreground">🎙️ голосовая заметка</p>
              </div>
              <button type="button" onClick={() => removeAudio(idx)}
                className="p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Record button */}
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`mt-2 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all w-full justify-center ${
          isRecording
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
        }`}
      >
        {isRecording ? (
          <>
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <Square className="h-3.5 w-3.5" />
            Остановить · {formatTime(recordingDuration)}
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Записать аудио
          </>
        )}
      </button>
    </div>
  );
}

const PartInspectionModal = ({
  open,
  onOpenChange,
  partId,
  partLabel,
  parts: partsProp,
  inspection,
  inspections: inspectionsProp,
  onSave,
  onSaveMultiple,
  onConfirm,
  onContinueInspection,
  groups,
  currentGroupIndex,
  onSwitchGroup,
  strategy = BODY_PARTS_STRATEGY,
  noteContext,
}: PartInspectionModalProps) => {
  const { getTags: getUserTags, addTag, removeTag, getDisabledDefaults, toggleDefault, getOrder, setOrder } = useUserTags();
  const parts: PartInfo[] = partsProp && partsProp.length > 0
    ? partsProp
    : partId ? [{ id: partId, label: partLabel || partId }] : [];

  const isMulti = parts.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [stateMap, setStateMap] = useState<Record<string, PartState>>({});
  const [slideDirection, setSlideDirection] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  // Track which tag is pending photo attachment
  const [pendingTag, setPendingTag] = useState<DamageTagId | null>(null);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("🏷️");

  useEffect(() => {
    if (open && parts.length > 0) {
      const map: Record<string, PartState> = {};
      for (const p of parts) {
        const existing = inspectionsProp?.[p.id] || (p.id === partId ? inspection : null);
        map[p.id] = makePartState(existing);
      }
      setStateMap(map);
      setActiveIndex(0);
      initializedRef.current = false;
      setPendingTag(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // No auto-save on every change — save only on explicit button or close
  // (initializedRef still used for close logic)
  useEffect(() => {
    if (!open || parts.length === 0) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
    }
  }, [stateMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePart = parts[activeIndex] || parts[0];
  if (!activePart) return null;

  const state = stateMap[activePart.id] || makePartState(null);

  const updateState = (patch: Partial<PartState>) => {
    setStateMap((prev) => ({
      ...prev,
      [activePart.id]: { ...prev[activePart.id], ...patch },
    }));
  };

  const toggleNoDamage = () => {
    const next = !state.noDamage;
    updateState({ noDamage: next, tags: next ? [] : state.tags, tagPhotos: next ? {} : state.tagPhotos });
  };

  // When tag is clicked: if active → deactivate; if inactive → require photo (or toggle directly if photos disabled)
  const handleTagClick = (tagId: DamageTagId) => {
    if (state.tags.includes(tagId)) {
      // Deactivate: remove tag and its photos
      const newPhotos = state.photos.filter((p) => !(state.tagPhotos[tagId] || []).includes(p));
      const newTagPhotos = { ...state.tagPhotos };
      delete newTagPhotos[tagId];
      updateState({
        tags: state.tags.filter((t) => t !== tagId),
        photos: newPhotos,
        tagPhotos: newTagPhotos,
        noDamage: false,
      });
    } else if (!strategy.photos) {
      // Photos disabled — activate tag directly without requiring photo
      updateState({
        tags: [...state.tags, tagId],
        noDamage: false,
      });
    } else {
      // Start photo capture for this tag
      setPendingTag(tagId);
      fileRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) {
      setPendingTag(null);
      return;
    }

    const { convertHeicFiles } = await import("@/lib/convertHeic");
    const files = await convertHeicFiles(Array.from(rawFiles));

    const currentPendingTag = pendingTag;
    let processedCount = 0;
    const totalFiles = files.length;
    const newPhotoUrls: string[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newPhotoUrls.push(ev.target.result as string);
        }
        processedCount++;
        if (processedCount === totalFiles) {
          // All files read — now update state
          setStateMap((prev) => {
            const partState = prev[activePart.id];
            if (!partState) return prev;

            if (currentPendingTag && newPhotoUrls.length > 0) {
              // Activate tag and associate photos
              const newTags = partState.tags.includes(currentPendingTag)
                ? partState.tags
                : [...partState.tags, currentPendingTag];
              const existingTagPhotos = partState.tagPhotos[currentPendingTag] || [];
              return {
                ...prev,
                [activePart.id]: {
                  ...partState,
                  noDamage: false,
                  tags: newTags,
                  photos: [...partState.photos, ...newPhotoUrls],
                  tagPhotos: {
                    ...partState.tagPhotos,
                    [currentPendingTag]: [...existingTagPhotos, ...newPhotoUrls],
                  },
                },
              };
            } else {
              // General photo add (no tag)
              return {
                ...prev,
                [activePart.id]: {
                  ...partState,
                  photos: [...partState.photos, ...newPhotoUrls],
                },
              };
            }
          });
          setPendingTag(null);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // General photo add button (no tag association)
  const handleAddGeneralPhoto = () => {
    setPendingTag(null);
    fileRef.current?.click();
  };

  const removePhoto = (index: number) => {
    const photoUrl = state.photos[index];
    // Remove from tagPhotos too
    const newTagPhotos = { ...state.tagPhotos };
    let tagToRemove: string | null = null;
    for (const [tagId, urls] of Object.entries(newTagPhotos)) {
      const filtered = urls.filter((u) => u !== photoUrl);
      if (filtered.length === 0) {
        tagToRemove = tagId;
        delete newTagPhotos[tagId];
      } else {
        newTagPhotos[tagId] = filtered;
      }
    }
    // If a tag lost all its photos, remove the tag
    let newTags = state.tags;
    if (tagToRemove) {
      newTags = state.tags.filter((t) => t !== tagToRemove);
    }
    updateState({
      photos: state.photos.filter((_, i) => i !== index),
      tagPhotos: newTagPhotos,
      tags: newTags,
    });
  };

  // Find which tag a photo belongs to
  const getPhotoTag = (photoUrl: string): string | null => {
    for (const [tagId, urls] of Object.entries(state.tagPhotos)) {
      if (urls.includes(photoUrl)) return tagId;
    }
    return null;
  };

  const buildInspection = (pId: string, pLabel: string, s: PartState, isDraft?: boolean): PartInspection => ({
    partId: pId,
    label: pLabel,
    noDamage: s.noDamage,
    tags: s.noDamage ? [] : s.tags,
    micronValues: {},
    paintThickness: { from: s.paintFrom, to: s.paintTo },
    note: s.note,
    photos: s.photos,
    tagPhotos: s.noDamage ? {} : s.tagPhotos,
    elementType: s.elementType || undefined,
    audioRecordings: s.audioRecordings.length > 0 ? s.audioRecordings : undefined,
    isDraft,
  });

  const hasElementTypes = !!(strategy.elementTypes && strategy.elementTypes.length > 0);
  const isPartFilled = (s: PartState) => isPartStateFilled(s, hasElementTypes);

  const collectResults = (): Record<string, PartInspection> => {
    const result: Record<string, PartInspection> = {};
    for (const p of parts) {
      const s = stateMap[p.id];
      if (s && isPartFilled(s)) {
        result[p.id] = buildInspection(p.id, p.label, s);
      }
    }
    return result;
  };

  const handleSave = () => {
    if (isMulti && onSaveMultiple) {
      const result: Record<string, PartInspection> = {};
      for (const p of parts) {
        const s = stateMap[p.id];
        if (s && isPartFilled(s)) {
          result[p.id] = buildInspection(p.id, p.label, s);
        }
      }
      onSaveMultiple(result);
    } else {
      onSave(buildInspection(activePart.id, activePart.label, state));
    }
    onOpenChange(false);
  };

  const filledCount = parts.filter((p) => {
    const s = stateMap[p.id];
    return s && isPartFilled(s);
  }).length;

  const canSave = isMulti ? filledCount > 0 : isPartFilled(state);

  const hasDamage = !state.noDamage && state.tags.length > 0;
  const sliderMax = hasDamage ? 1500 : 500;
  const clampedFrom = Math.min(state.paintFrom, sliderMax);
  const clampedTo = Math.min(state.paintTo, sliderMax);

  const handleClose = useCallback(() => {
    if (onContinueInspection) {
      // Closing via back button = save as draft
      if (!isMulti && parts.length === 1) {
        const s = stateMap[parts[0].id];
        if (s && isPartFilled(s)) {
          onSave(buildInspection(parts[0].id, parts[0].label, s, true));
        }
      } else if (isMulti && onSaveMultiple) {
        const result: Record<string, PartInspection> = {};
        for (const p of parts) {
          const s = stateMap[p.id];
          if (s && isPartFilled(s)) {
            result[p.id] = buildInspection(p.id, p.label, s, true);
          }
        }
        onSaveMultiple(result);
      }
    } else {
      // Auto-save on close
      if (!isMulti && parts.length === 1) {
        const s = stateMap[parts[0].id];
        if (s && isPartFilled(s)) {
          onSave(buildInspection(parts[0].id, parts[0].label, s));
        }
      } else if (isMulti && onSaveMultiple) {
        const result: Record<string, PartInspection> = {};
        for (const p of parts) {
          const s = stateMap[p.id];
          if (s && isPartFilled(s)) {
            result[p.id] = buildInspection(p.id, p.label, s);
          }
        }
        onSaveMultiple(result);
      }
    }
    onOpenChange(false);
  }, [isMulti, parts, stateMap, onSave, onSaveMultiple, onContinueInspection, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          onOpenChange(nextOpen);
        }
      }}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 flex flex-col overflow-hidden [&>button]:hidden bg-background">
        {/* Header */}
        <div className="relative px-4 pt-3 pb-3 border-b border-border/60">
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            {noteContext && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mb-1">
                <span>{noteContext.emoji}</span>
                <span>{noteContext.label}</span>
              </span>
            )}
            {!noteContext && <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">Осмотр</p>}
            <h2 className="text-base font-semibold text-foreground mt-0.5">{activePart.label}</h2>
          </div>
          {isMulti && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-medium">
              {activeIndex + 1}/{parts.length}
            </div>
          )}
        </div>

        {/* Part tabs for multi-select */}
        {isMulti && (
          <div className="border-b border-border/40 overflow-x-auto">
            <div className="flex px-3 py-2 gap-1.5 min-w-max">
              {parts.map((p, i) => {
                const s = stateMap[p.id];
                const filled = s && isPartFilled(s);
                const isActive = i === activeIndex;
                const seriousTagIds = (strategy.customTagGroups || DAMAGE_TAG_GROUPS)
                  .filter((g, gi) => ('severity' in g && g.severity === "serious") || (!strategy.customTagGroups && gi === 0))
                  .flatMap((g) => g.tags.map((t) => t.id));
                const hasSeriousTags = s && s.tags.some((t) => seriousTagIds.includes(t));
                const hasMinorTags = s && !s.noDamage && s.tags.length > 0 && !hasSeriousTags;
                const isClean = s?.noDamage;

                let tabClass = "bg-muted text-muted-foreground";
                if (isActive) {
                  if (hasSeriousTags) tabClass = "bg-destructive text-destructive-foreground";
                  else if (hasMinorTags) tabClass = "bg-[hsl(var(--warning))] text-white";
                  else if (isClean) tabClass = "bg-[hsl(var(--success))] text-white";
                  else tabClass = "bg-primary text-primary-foreground";
                } else if (filled) {
                  if (hasSeriousTags) tabClass = "bg-destructive/10 text-destructive border border-destructive/30";
                  else if (hasMinorTags) tabClass = "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning)/0.85)] border border-[hsl(var(--warning)/0.3)]";
                  else tabClass = "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]";
                }

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSlideDirection(i > activeIndex ? 1 : -1);
                      setActiveIndex(i);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap ${tabClass}`}
                  >
                    {filled && !isActive && <Check className="h-3 w-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={`${currentGroupIndex ?? 0}-${activePart.id}`}
          initial={{ opacity: 0, x: slideDirection * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: slideDirection * -40 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-1 overflow-y-auto"
        >
          {/* Element type selector — required dropdown */}
          {strategy.elementTypes && strategy.elementTypes.length > 0 && (
            <div className="px-4 pt-5 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                Тип элемента <span className="text-destructive">*</span>
              </p>
              <Select
                value={state.elementType || ""}
                onValueChange={(val) => updateState({ elementType: val })}
              >
                <SelectTrigger className={`w-full rounded-xl border bg-card text-sm ${!state.elementType ? "border-destructive/40 text-muted-foreground" : "border-border/60"}`}>
                  <SelectValue placeholder="Выберите тип элемента" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {strategy.elementTypes.map((et) => (
                    <SelectItem key={et.id} value={et.id}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
          )}

          {/* Paint thickness slider — right after element type */}
          {strategy.paintThickness && (!strategy.elementTypes || state.elementType) && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-3">
              <Paintbrush className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Толщина окраса</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex justify-between items-center mb-3">
                <EditablePaintValue
                  value={clampedFrom}
                  min={50}
                  max={clampedTo}
                  suffix="мкм"
                  onChange={(v) => updateState({ paintFrom: v })}
                />
                <span className="text-[11px] text-muted-foreground">—</span>
                <EditablePaintValue
                  value={clampedTo}
                  min={clampedFrom}
                  max={sliderMax}
                  suffix="мкм"
                  onChange={(v) => updateState({ paintTo: v })}
                />
              </div>
              <Slider
                min={50}
                max={sliderMax}
                step={50}
                value={[clampedFrom, clampedTo]}
                onValueChange={([from, to]) => {
                  updateState({ paintFrom: from, paintTo: to });
                }}
                minStepsBetweenThumbs={1}
              />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
                <span>50 мкм</span>
                <span>{sliderMax} мкм</span>
              </div>
            </div>
          </div>
          )}

          {/* Divider before no-damage */}
          {strategy.paintThickness && strategy.noDamage && (!strategy.elementTypes || state.elementType) && <div className="mx-4 border-t border-border/40" />}

          {/* No damage toggle — only show when element type is selected (if element types exist) */}
          {strategy.noDamage && (!strategy.elementTypes || state.elementType) && (
          <div className="px-4 pt-5 pb-3">
            <button
              type="button"
              onClick={toggleNoDamage}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                state.noDamage
                  ? "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.05)]"
                  : "border-border/60 bg-card"
              }`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                state.noDamage
                  ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]"
                  : "border-muted-foreground/30"
              }`}>
                {state.noDamage && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${state.noDamage ? "text-[hsl(var(--success))]" : "text-foreground"}`}>
                  {strategy.noDamageLabel || "Без повреждений"}
                </p>
                <p className="text-[11px] text-muted-foreground/70">{strategy.noDamageLabel ? "" : "Заводской элемент"}</p>
              </div>
            </button>
          </div>
          )}

          {/* Damage tags */}
          {strategy.tags && (!strategy.elementTypes || state.elementType) && (
          <AnimatePresence>
            {!state.noDamage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-4">
                  {(
                    (strategy.elementTagGroups && state.elementType
                      ? strategy.elementTagGroups[state.elementType]
                      : undefined
                    ) || strategy.customTagGroups || DAMAGE_TAG_GROUPS
                  ).map((group, gi) => {
                    const severity = 'severity' in group && group.severity
                      ? group.severity
                      : !strategy.customTagGroups
                        ? (gi === 0 ? "serious" : "minor")
                        : "minor";
                    const isSerious = severity === "serious";
                    const elementPrefix = strategy.elementTagGroups && state.elementType ? `${state.elementType}:` : "";
                    const groupKey = `${strategy.key}:${elementPrefix}${gi}`;
                    const groupUserTags = getUserTags(groupKey);
                    const disabledDefaults = getDisabledDefaults(groupKey);
                    const savedOrder = getOrder(groupKey);
                    const isEditing = editingGroupIndex === gi;

                    // Build merged tag list with ordering
                    const allTags: MergedTag[] = [];
                    const defaultTags = group.tags.map((t) => ({
                      id: t.id, label: t.label, emoji: t.emoji,
                      isUser: false, isDisabled: disabledDefaults.includes(t.id),
                    }));
                    const userTags = groupUserTags.map((t) => ({
                      id: t.id, label: t.label, emoji: t.emoji, isUser: true, isDisabled: false,
                    }));
                    const allUnordered = [...defaultTags, ...userTags];

                    if (savedOrder.length > 0) {
                      // Use saved order, append any new tags not in order
                      const byId = new Map(allUnordered.map((t) => [t.id, t]));
                      for (const id of savedOrder) {
                        const tag = byId.get(id);
                        if (tag) { allTags.push(tag); byId.delete(id); }
                      }
                      byId.forEach((t) => allTags.push(t));
                    } else {
                      allTags.push(...allUnordered);
                    }

                    // Initialize order on first edit if not set
                    const handleStartEdit = () => {
                      if (savedOrder.length === 0) {
                        setOrder(groupKey, allTags.map((t) => t.id));
                      }
                      setEditingGroupIndex(isEditing ? null : gi);
                    };

                    const visibleTags = isEditing ? allTags : allTags.filter((t) => !t.isDisabled);

                    return (
                    <div key={group.title}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                          isSerious ? "text-destructive/70" : "text-[hsl(var(--warning)/0.7)]"
                        }`}>
                          {group.title}
                        </p>
                        <button
                          type="button"
                          onClick={handleStartEdit}
                          className={`p-1 rounded-md transition-colors ${
                            isEditing 
                              ? "bg-primary/10 text-primary" 
                              : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isEditing ? (
                        /* Edit mode: draggable vertical list */
                        <DraggableTagList
                          tags={allTags}
                          groupKey={groupKey}
                          onReorder={(newOrder) => setOrder(groupKey, newOrder)}
                          onToggleDefault={(tagId) => toggleDefault(groupKey, tagId)}
                          onRemoveUser={(tagId) => removeTag(groupKey, tagId)}
                          onAddTag={(tag) => {
                            addTag(groupKey, tag);
                          }}
                          newTagLabel={newTagLabel}
                          setNewTagLabel={setNewTagLabel}
                          newTagEmoji={newTagEmoji}
                          setNewTagEmoji={setNewTagEmoji}
                        />
                      ) : (
                        /* Normal mode: horizontal tag chips */
                        <div className="flex flex-wrap gap-2">
                          {visibleTags.map((tag) => {
                            const isActive = state.tags.includes(tag.id as DamageTagId);
                            const isPending = pendingTag === tag.id && !isActive;
                            const photoCount = (state.tagPhotos[tag.id] || []).length;
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleTagClick(tag.id as DamageTagId)}
                                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-all ${
                                  isPending
                                    ? "border-dashed border-primary/60 bg-primary/5 text-primary"
                                    : isActive
                                      ? isSerious
                                        ? "border-destructive/50 bg-destructive/8 text-destructive"
                                        : "border-[hsl(var(--warning)/0.5)] bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning)/0.85)]"
                                      : "border-border/80 bg-card text-foreground/80 hover:border-border"
                                }`}
                              >
                                {tag.emoji} {tag.label}
                                {isActive && photoCount > 0 && (
                                  <span className="ml-1 text-[11px] opacity-70">📷{photoCount}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}


          {/* Divider */}
          {strategy.note && (!strategy.elementTypes || state.elementType) && <div className="mx-4 border-t border-border/40" />}

          {/* Note */}
          {strategy.note && (!strategy.elementTypes || state.elementType) && (
          <NoteWithVoice
            note={state.note}
            onNoteChange={(val) => updateState({ note: val })}
            audioRecordings={state.audioRecordings}
            onAudioChange={(recs) => updateState({ audioRecordings: recs })}
          />
          )}

          {/* Photos */}
          {strategy.photos && (!strategy.elementTypes || state.elementType) && (
          <div className="px-4 py-3 pb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <ImagePlus className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Фото</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence mode="popLayout">
                {state.photos.map((photo, i) => {
                  const tagId = getPhotoTag(photo);
                  const emoji = tagId ? getTagEmoji(tagId, strategy, state.elementType) : null;
                  return (
                    <motion.div
                      key={`photo-${activePart.id}-${i}`}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      {emoji && (
                        <div className="absolute bottom-1.5 left-1.5 rounded-full bg-background/80 backdrop-blur-sm px-1.5 py-0.5 text-xs">
                          {emoji}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-1 backdrop-blur-sm"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleAddGeneralPhoto}
                className="aspect-square rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-1 text-muted-foreground/50 hover:border-primary/40 hover:text-primary/60 transition-all"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px] font-medium">Добавить</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,.heic,.heif"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          )}
        </motion.div>
        </AnimatePresence>


        {/* Save and continue button */}
        {onContinueInspection && (
          <div className="border-t border-border/40 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                // Explicitly save before continuing
                if (isMulti && onSaveMultiple) {
                  const result: Record<string, PartInspection> = {};
                  for (const p of parts) {
                    const s = stateMap[p.id];
                    if (s && isPartFilled(s)) {
                      result[p.id] = buildInspection(p.id, p.label, s, false);
                    }
                  }
                  onSaveMultiple(result);
                } else {
                  onSave(buildInspection(activePart.id, activePart.label, state, false));
                }
                onContinueInspection();
              }}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              Сохранить и продолжить
            </button>
          </div>
        )}

        {/* Bottom: group nav */}
        {groups && groups.length > 1 && currentGroupIndex !== undefined && onSwitchGroup && (
          <div className="border-t border-border/40 safe-bottom overflow-x-auto">
            <div className="flex px-3 py-2.5 gap-1.5 min-w-max">
              {groups.map((g, gi) => {
                const isActiveGroup = gi === currentGroupIndex;
                return (
                  <button
                    key={g.title}
                    type="button"
                    onClick={() => {
                      if (gi !== currentGroupIndex) {
                        const result = collectResults();
                        onSwitchGroup(gi, result);
                      }
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap ${
                      isActiveGroup
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartInspectionModal;
