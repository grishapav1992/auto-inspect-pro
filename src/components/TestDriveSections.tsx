import { useState, useRef, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, FileText, Plus, Trash2, Settings, EyeOff, Eye, GripVertical } from "lucide-react";
import type { UserTag } from "@/contexts/UserTagContext";

interface TagDef {
  id: string;
  label: string;
  emoji: string;
}

interface SectionDef {
  key: string;
  label: string;
  ok: boolean;
  setOk: (v: boolean) => void;
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  allTags: readonly TagDef[];
  okLabel: string;
}

interface TestDriveSectionsProps {
  sections: SectionDef[];
  getTags: (groupKey: string) => UserTag[];
  addTag: (groupKey: string, tag: Omit<UserTag, "id">) => UserTag;
  removeTag: (groupKey: string, tagId: string) => void;
  getDisabledDefaults: (groupKey: string) => string[];
  toggleDefault: (groupKey: string, tagId: string) => void;
  getOrder: (groupKey: string) => string[];
  setOrder: (groupKey: string, order: string[]) => void;
  tdNote: string;
  setTdNote: (v: string) => void;
  goNext: () => void;
  hasData: boolean;
}

function tdGroupKey(sectionKey: string) {
  return `td_${sectionKey}`;
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

type MergedTag = { id: string; label: string; emoji: string; isUser: boolean; isDisabled: boolean };

function DraggableTagList({
  tags, onReorder, onToggleDefault, onRemoveUser, onAddTag,
  newTagLabel, setNewTagLabel, newTagEmoji, setNewTagEmoji,
}: {
  tags: MergedTag[];
  onReorder: (newOrder: string[]) => void;
  onToggleDefault: (tagId: string) => void;
  onRemoveUser: (tagId: string) => void;
  onAddTag: (tag: { label: string; emoji: string }) => void;
  newTagLabel: string;
  setNewTagLabel: (v: string) => void;
  newTagEmoji: string;
  setNewTagEmoji: (v: string) => void;
}) {
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

export default function TestDriveSections({
  sections, getTags, addTag, removeTag, getDisabledDefaults, toggleDefault, getOrder, setOrder, tdNote, setTdNote, goNext, hasData,
}: TestDriveSectionsProps) {
  return (
    <div className="space-y-5 overflow-y-auto pb-24">
      {sections.map((section) => (
        <TDSection
          key={section.key}
          section={section}
          getTags={getTags}
          addTag={addTag}
          removeTag={removeTag}
          getDisabledDefaults={getDisabledDefaults}
          toggleDefault={toggleDefault}
          getOrder={getOrder}
          setOrder={setOrder}
        />
      ))}

      {/* Note */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Заметка</p>
        </div>
        <textarea
          value={tdNote}
          onChange={(e) => setTdNote(e.target.value)}
          placeholder="Замечания по тест-драйву..."
          className="w-full min-h-[80px] rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/30 focus:border-primary/20 resize-none transition-all"
        />
      </div>

    </div>
  );
}

function TDSection({
  section,
  getTags,
  addTag,
  removeTag,
  getDisabledDefaults,
  toggleDefault,
  getOrder,
  setOrder,
}: {
  section: SectionDef;
  getTags: (groupKey: string) => UserTag[];
  addTag: (groupKey: string, tag: Omit<UserTag, "id">) => UserTag;
  removeTag: (groupKey: string, tagId: string) => void;
  getDisabledDefaults: (groupKey: string) => string[];
  toggleDefault: (groupKey: string, tagId: string) => void;
  getOrder: (groupKey: string) => string[];
  setOrder: (groupKey: string, order: string[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("🏷️");

  const groupKey = tdGroupKey(section.key);
  const userTags = getTags(groupKey);
  const disabledDefaults = getDisabledDefaults(groupKey);
  const savedOrder = getOrder(groupKey);

  // Build merged tag list with ordering
  const allTags: MergedTag[] = [];
  const defaultTags = section.allTags.map((t) => ({
    id: t.id, label: t.label, emoji: t.emoji,
    isUser: false, isDisabled: disabledDefaults.includes(t.id),
  }));
  const userTagsMerged = userTags.map((t) => ({
    id: t.id, label: t.label, emoji: t.emoji, isUser: true, isDisabled: false,
  }));
  const allUnordered = [...defaultTags, ...userTagsMerged];

  if (savedOrder.length > 0) {
    const byId = new Map(allUnordered.map((t) => [t.id, t]));
    for (const id of savedOrder) {
      const tag = byId.get(id);
      if (tag) { allTags.push(tag); byId.delete(id); }
    }
    byId.forEach((t) => allTags.push(t));
  } else {
    allTags.push(...allUnordered);
  }

  const handleStartEdit = () => {
    if (savedOrder.length === 0) {
      setOrder(groupKey, allTags.map((t) => t.id));
    }
    setIsEditing(!isEditing);
  };

  const visibleTags = isEditing ? allTags : allTags.filter((t) => !t.isDisabled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.label}</p>
        {!section.ok && (
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
        )}
      </div>
      <button
        type="button"
        onClick={() => { section.setOk(!section.ok); if (!section.ok) section.setTags([]); }}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 transition-all ${
          section.ok ? "border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.05)]" : "border-border/60 bg-card"
        }`}
      >
        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all flex-shrink-0 ${
          section.ok ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]" : "border-muted-foreground/30"
        }`}>{section.ok && <Check className="h-3 w-3 text-white" />}</div>
        <p className={`text-sm font-medium ${section.ok ? "text-[hsl(var(--success))]" : "text-foreground"}`}>{section.okLabel}</p>
      </button>

      {!section.ok && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
          {isEditing ? (
            <DraggableTagList
              tags={allTags}
              onReorder={(newOrder) => setOrder(groupKey, newOrder)}
              onToggleDefault={(tagId) => toggleDefault(groupKey, tagId)}
              onRemoveUser={(tagId) => {
                removeTag(groupKey, tagId);
                section.setTags((prev) => prev.filter((t) => t !== tagId));
              }}
              onAddTag={(tag) => {
                addTag(groupKey, tag);
              }}
              newTagLabel={newTagLabel}
              setNewTagLabel={setNewTagLabel}
              newTagEmoji={newTagEmoji}
              setNewTagEmoji={setNewTagEmoji}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => {
                const active = section.tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => section.setTags((prev: string[]) => active ? prev.filter((t: string) => t !== tag.id) : [...prev, tag.id])}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning)/0.85)] border border-[hsl(var(--warning)/0.3)]"
                        : "bg-card border border-border/60 text-foreground hover:border-border"
                    }`}
                  >
                    {tag.emoji} {tag.label}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
