import { useState, useEffect, useRef } from 'react';
import { MediaItem, InspectionSection, BODY_PARTS, INTERIOR_PARTS, UNDER_HOOD_PARTS, TECHNICAL_PARTS, ELECTRICAL_PARTS, SECTION_DAMAGE_TAGS, DEFAULT_DAMAGE_TAGS } from '@/types/inspection';
import { Button } from '@/components/ui/button';
import { X, Plus, Mic, Square, Play, Trash2, Pause, Settings } from 'lucide-react';
import { useInspectionStore } from '@/store/useInspectionStore';
import { saveImage, getImage, deleteImages } from '@/lib/mediaDB';
import TagManagerSheet from '@/components/TagManagerSheet';

const MAX_AUDIO_NOTES = 3;

interface MediaDetailSheetProps {
  media: MediaItem | null;
  onClose: () => void;
  onUpdate: (mediaId: string, updates: Partial<MediaItem>) => void;
}

const SECTION_PARTS: Partial<Record<InspectionSection, readonly string[]>> = {
  'body': BODY_PARTS,
  'interior': INTERIOR_PARTS,
  'under-hood': UNDER_HOOD_PARTS,
  'technical': TECHNICAL_PARTS,
  'electrical': ELECTRICAL_PARTS,
};

interface AudioNote {
  id: string;
  url: string;
}

const MediaDetailSheet = ({ media, onClose, onUpdate }: MediaDetailSheetProps) => {
  const [note, setNote] = useState('');
  const [damageTags, setDamageTags] = useState<string[]>([]);
  const [noDamage, setNoDamage] = useState(false);
  const [paintThicknessMin, setPaintThicknessMin] = useState('');
  const [paintThicknessMax, setPaintThicknessMax] = useState('');
  const [carPart, setCarPart] = useState<string | undefined>();
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  // Audio state - multiple notes
  const [isRecording, setIsRecording] = useState(false);
  const [audioNotes, setAudioNotes] = useState<AudioNote[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const { customDamageTags, addCustomDamageTag, hiddenDefaultTags, tagPriorities } = useInspectionStore();

  useEffect(() => {
    if (media) {
      setNote(media.note || '');
      setDamageTags(media.damageTags || []);
      setNoDamage(media.noDamage || false);
      setPaintThicknessMin(media.paintThicknessMin?.toString() || '');
      setPaintThicknessMax(media.paintThicknessMax?.toString() || '');
      setCarPart(media.carPart);
      setPlayingId(null);
      setRecordingDuration(0);

      // Load existing audio notes
      const ids = media.audioNoteIds || [];
      if (ids.length > 0) {
        Promise.all(ids.map(async (id) => {
          const url = await getImage(id);
          return url ? { id, url } : null;
        })).then(results => {
          setAudioNotes(results.filter(Boolean) as AudioNote[]);
        });
      } else {
        setAudioNotes([]);
      }
    }
  }, [media]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!media) return null;

  const currentSection = media.section;
  const sectionTags = currentSection ? (SECTION_DAMAGE_TAGS[currentSection] || DEFAULT_DAMAGE_TAGS) : DEFAULT_DAMAGE_TAGS;
  const visibleSectionTags = sectionTags.filter(t => !hiddenDefaultTags.includes(t));
  const visibleCustomTags = customDamageTags.filter(t => !sectionTags.includes(t));
  // Sort: prioritized first, then rest
  const sortTags = (tags: string[]) => {
    const prioritized = tags.filter(t => tagPriorities.includes(t));
    const rest = tags.filter(t => !tagPriorities.includes(t));
    return [...prioritized, ...rest];
  };
  const allTags = sortTags([...visibleSectionTags, ...visibleCustomTags]);
  const availableParts = currentSection ? SECTION_PARTS[currentSection] : undefined;
  const isBodySection = currentSection === 'body';

  const handleSave = () => {
    onUpdate(media.id, {
      note,
      noDamage,
      damageTags: !noDamage && damageTags.length > 0 ? damageTags : undefined,
      paintThicknessMin: !noDamage && isBodySection && paintThicknessMin ? Number(paintThicknessMin) : undefined,
      paintThicknessMax: !noDamage && isBodySection && paintThicknessMax ? Number(paintThicknessMax) : undefined,
      carPart,
      audioNoteIds: audioNotes.length > 0 ? audioNotes.map(a => a.id) : undefined,
    });
    onClose();
  };

  const toggleTag = (tag: string) => {
    setDamageTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      addCustomDamageTag(trimmed);
      setDamageTags(prev => [...prev, trimmed]);
    } else if (trimmed && allTags.includes(trimmed)) {
      if (!damageTags.includes(trimmed)) {
        setDamageTags(prev => [...prev, trimmed]);
      }
    }
    setNewTag('');
    setShowNewTagInput(false);
  };

  const handleNumericInput = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  const startRecording = async () => {
    if (audioNotes.length >= MAX_AUDIO_NOTES) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const id = `audio-${media.id}-${Date.now()}`;
          await saveImage(id, dataUrl);
          setAudioNotes(prev => [...prev, { id, url: dataUrl }]);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      console.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (audioNote: AudioNote) => {
    if (playingId === audioNote.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(audioNote.url);
    audioRef.current = audio;
    setPlayingId(audioNote.id);
    audio.onended = () => { setPlayingId(null); audioRef.current = null; };
    audio.play();
  };

  const deleteAudioNote = async (audioNote: AudioNote) => {
    await deleteImages([audioNote.id]);
    setAudioNotes(prev => prev.filter(a => a.id !== audioNote.id));
    if (playingId === audioNote.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-foreground/30 z-30 flex items-end" onClick={onClose}>
      <div
        className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg">Детали фото</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* No Damage Toggle */}
          <div>
            <button
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                noDamage
                  ? 'bg-success text-success-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              onClick={() => {
                setNoDamage(prev => {
                  if (!prev) {
                    setDamageTags([]);
                    setPaintThicknessMin('');
                    setPaintThicknessMax('');
                  }
                  return !prev;
                });
              }}
            >
              ✓ Без повреждений
            </button>
          </div>

          {/* Damage Tags - hidden when noDamage */}
          {!noDamage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Повреждения
                </label>
                <button
                  onClick={() => setShowTagManager(true)}
                  className="p-1 text-muted-foreground"
                  title="Настройки тегов"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                      damageTags.includes(tag)
                        ? tag === 'OK' ? 'bg-success text-success-foreground'
                          : tag === 'Риск' ? 'bg-destructive text-destructive-foreground'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
                {showNewTagInput ? (
                  <div className="flex gap-1 items-center">
                    <input
                      autoFocus
                      className="bg-secondary rounded-xl px-3 py-2 text-sm text-foreground outline-none w-28"
                      placeholder="Название..."
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); if (e.key === 'Escape') setShowNewTagInput(false); }}
                      maxLength={30}
                    />
                    <button onClick={handleAddCustomTag} className="p-1.5 bg-primary text-primary-foreground rounded-lg">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="px-3.5 py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground border border-dashed border-muted-foreground/30"
                    onClick={() => setShowNewTagInput(true)}
                  >
                    <Plus className="w-4 h-4 inline -mt-0.5 mr-1" />Свой тег
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Paint Thickness Range - only for body section and when has damage */}
          {!noDamage && isBodySection && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Толщина ЛКП (мкм)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder="От"
                  inputMode="numeric"
                  value={paintThicknessMin}
                  onChange={e => handleNumericInput(e.target.value, setPaintThicknessMin)}
                />
                <span className="text-muted-foreground">—</span>
                <input
                  className="flex-1 bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none"
                  placeholder="До"
                  inputMode="numeric"
                  value={paintThicknessMax}
                  onChange={e => handleNumericInput(e.target.value, setPaintThicknessMax)}
                />
              </div>
            </div>
          )}

          {/* Car Part - only if section has parts */}
          {availableParts && (
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Деталь
              </label>
              <select
                className="w-full bg-secondary text-foreground rounded-xl px-4 py-3 outline-none border-none text-sm"
                value={carPart || ''}
                onChange={e => setCarPart(e.target.value || undefined)}
              >
                <option value="">Не указана</option>
                {availableParts.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Audio Notes (up to 3) */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Аудиозаметки ({audioNotes.length}/{MAX_AUDIO_NOTES})
            </label>
            <div className="flex flex-col gap-2">
              {/* Existing audio notes */}
              {audioNotes.map((audioNote, idx) => (
                <div key={audioNote.id} className="flex items-center gap-2">
                  <button
                    onClick={() => playAudio(audioNote)}
                    className="flex-1 flex items-center gap-3 bg-secondary rounded-xl px-4 py-3"
                  >
                    {playingId === audioNote.id ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-sm text-foreground">
                      {playingId === audioNote.id ? 'Воспроизводится...' : `Запись ${idx + 1}`}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteAudioNote(audioNote)}
                    className="p-3 bg-secondary rounded-xl text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-3 bg-destructive/10 rounded-xl px-4 py-3">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm text-foreground font-medium flex-1">
                    Запись... {formatTime(recordingDuration)}
                  </span>
                  <button
                    onClick={stopRecording}
                    className="p-2 bg-destructive text-destructive-foreground rounded-xl"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Add recording button */}
              {!isRecording && audioNotes.length < MAX_AUDIO_NOTES && (
                <button
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground"
                >
                  <Mic className="w-4 h-4" />
                  {audioNotes.length === 0 ? 'Записать аудиозаметку' : 'Добавить ещё запись'}
                </button>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Заметка
            </label>
            <textarea
              className="w-full bg-secondary border-none rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px]"
              placeholder="Добавить описание..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MediaDetailSheet;
