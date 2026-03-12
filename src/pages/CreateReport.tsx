import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDebouncedAutosave } from "@/hooks/useDebouncedAutosave";
import { useMergedInspections } from "@/hooks/useMergedInspections";
import { generateSummaryNote } from "@/lib/summaryNoteGenerator";
import StepCTA from "@/components/StepCTA";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ChevronDown, Clock, FileSearch, XCircle, Monitor, Camera, FileText, X, File, Paintbrush, Shield, Plus, Video, Play, Trash2, ImageIcon, Star, CalendarIcon, Mic, MicOff } from "lucide-react";
import VinScanner from "@/components/VinScanner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import CarPicker, { type CarPickerResult } from "@/components/CarPicker";
import CarPartsList from "@/components/CarPartsList";
import PartInspectionModal from "@/components/PartInspectionModal";
import EditablePaintValue from "@/components/EditablePaintValue";
import InspectionGroupButton from "@/components/InspectionGroupButton";
import type { InspectionGroupDef } from "@/components/InspectionGroupButton";
import SortableMediaGallery, { type MediaItem, MediaPresentation } from "@/components/SortableMediaGallery";
import { SummarySections, SummaryNoteCard } from "@/components/SummarySections";
import { MediaLightbox, type LightboxState } from "@/components/MediaLightbox";
import TestDriveSections from "@/components/TestDriveSections";
import UploadProgressDialog from "@/components/UploadProgressDialog";
import frontCarIcon from "@/assets/front_car.png";
import rightCarIcon from "@/assets/right_car.png";
import leftCarIcon from "@/assets/left_car.png";
import topCarIcon from "@/assets/top_car.png";
import backCarIcon from "@/assets/back_car.png";
import type { PartInspection } from "@/types/inspection";
import { CAR_PARTS, STRUCTURAL_PARTS, UNDERCARRIAGE_PARTS, GLASS_PARTS, GLASS_DAMAGE_TAGS, GLASS_STRATEGY, DAMAGE_TAGS, DAMAGE_TAG_GROUPS } from "@/types/inspection";
import { useUserTags } from "@/contexts/UserTagContext";
import type { DiagnosticFile } from "@/lib/draftStorage";
import { saveDraft, loadDrafts, deleteDraft, type ReportDraft } from "@/lib/draftStorage";
import { normalizeUploadFiles } from "@/lib/media/normalizeUploadFile";
import { generateSummary } from "@/lib/summaryGenerator";
import { buildSummaryInputFromState } from "@/lib/buildSummaryInput";
import { loadAllCustomTags } from "@/lib/customTagsLoader";
import { finalizeDraft } from "@/lib/completedReportStorage";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface StepConfig {
  id: string;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  { id: "vehicle", title: "Автомобиль", description: "VIN, госномер, марка и модель" },
  { id: "params", title: "Параметры", description: "Пробег, двигатель, КПП, привод, цвет и др." },
  { id: "docs_check", title: "Сверка документов", description: "Проверьте соответствие документов и номеров" },
  { id: "legal", title: "Юр. проверка", description: "Загрузка юридической информации об автомобиле" },
  { id: "media", title: "Осмотр", description: "Добавьте файлы осмотра в соответствии с группами, фиксируйте заметки" },
  { id: "test_drive", title: "Тест-драйв", description: "Проверка автомобиля на ходу" },
  { id: "summary", title: "Итог", description: "Данные осмотра и рекомендации" },
];

const TIRE_TAGS = [
  { id: "tire_wear_uneven", label: "Неравномерный износ", emoji: "⚠️" },
  { id: "tire_wear_high", label: "Износ > 70%", emoji: "🔴" },
  { id: "tire_wear_medium", label: "Износ 30–70%", emoji: "🟡" },
  { id: "tire_crack", label: "Трещины / грыжи", emoji: "💥" },
  { id: "tire_mismatch", label: "Разнопарные шины", emoji: "🔄" },
  { id: "tire_season", label: "Не по сезону", emoji: "❄️" },
  { id: "tire_repair", label: "Следы ремонта", emoji: "🩹" },
] as const;

const RIM_TAGS = [
  { id: "rim_curb", label: "Бордюрные повреждения", emoji: "🪨" },
  { id: "rim_crack", label: "Трещина диска", emoji: "💥" },
  { id: "rim_bent", label: "Погнут диск", emoji: "〰️" },
  { id: "rim_corrosion", label: "Коррозия диска", emoji: "🟤" },
  { id: "rim_mismatch", label: "Разнопарные диски", emoji: "🔄" },
  { id: "rim_repainted", label: "Перекрашенный диск", emoji: "🎨" },
] as const;

const BRAKE_TAGS = [
  { id: "brake_pad_low", label: "Колодки изношены", emoji: "⚠️" },
  { id: "brake_disc_wear", label: "Износ тормозного диска", emoji: "🔘" },
  { id: "brake_disc_groove", label: "Борозды на диске", emoji: "〰️" },
  { id: "brake_squeal", label: "Скрип при торможении", emoji: "🔊" },
  { id: "brake_rust", label: "Коррозия суппорта", emoji: "🟤" },
  { id: "brake_fluid_low", label: "Низкий уровень жидкости", emoji: "💧" },
  { id: "handbrake_fault", label: "Ручник не держит", emoji: "🅿️" },
] as const;

const SUSPENSION_TAGS = [
  { id: "shock_leak", label: "Течь амортизатора", emoji: "💧" },
  { id: "shock_knock", label: "Стук амортизатора", emoji: "🔊" },
  { id: "spring_broken", label: "Сломана пружина", emoji: "💥" },
  { id: "spring_sag", label: "Просевшая пружина", emoji: "⬇️" },
  { id: "ball_joint_play", label: "Люфт шаровой опоры", emoji: "🔘" },
  { id: "tie_rod_play", label: "Люфт рулевого наконечника", emoji: "↔️" },
  { id: "bushing_worn", label: "Износ сайлентблоков", emoji: "⚠️" },
  { id: "stabilizer_link", label: "Стойка стабилизатора", emoji: "🔗" },
  { id: "cv_boot_torn", label: "Порван пыльник ШРУСа", emoji: "🩹" },
  { id: "bearing_noise", label: "Шум ступичного подшипника", emoji: "🔊" },
  { id: "alignment_off", label: "Нарушен сход-развал", emoji: "〰️" },
] as const;

// TD tags imported from @/types/inspection
import { TD_ENGINE_TAGS, TD_GEARBOX_TAGS, TD_STEERING_TAGS, TD_RIDE_TAGS, TD_BRAKE_RIDE_TAGS } from "@/types/inspection";

const INTERIOR_DAMAGE_TAGS = [
  { id: "seat_wear", label: "Износ сидений", emoji: "💺" },
  { id: "seat_tear", label: "Разрыв обивки", emoji: "🪡" },
  { id: "dashboard_scratch", label: "Царапины на торпедо", emoji: "✏️" },
  { id: "dashboard_crack", label: "Трещина торпедо", emoji: "💥" },
  { id: "headliner_sag", label: "Провис потолка", emoji: "⬇️" },
  { id: "carpet_stain", label: "Пятна на ковре", emoji: "🟤" },
  { id: "trim_damage", label: "Повреждение обшивки", emoji: "🔲" },
  { id: "steering_wear", label: "Износ руля", emoji: "🎡" },
  { id: "burn_mark", label: "Прожог", emoji: "🔥" },
  { id: "odor", label: "Посторонний запах", emoji: "👃" },
] as const;

const FUNCTION_TAGS = [
  { id: "ac_fault", label: "Кондиционер / климат", emoji: "❄️" },
  { id: "heater_fault", label: "Печка / обогрев", emoji: "🔥" },
  { id: "window_fault", label: "Стеклоподъёмники", emoji: "🪟" },
  { id: "mirror_fault", label: "Зеркала с электроприводом", emoji: "🪞" },
  { id: "seat_adjust_fault", label: "Регулировка сидений", emoji: "💺" },
  { id: "infotainment_fault", label: "Мультимедиа / экран", emoji: "📺" },
  { id: "speaker_fault", label: "Динамики / аудио", emoji: "🔊" },
  { id: "light_fault", label: "Подсветка салона", emoji: "💡" },
  { id: "lock_fault", label: "Центральный замок", emoji: "🔒" },
  { id: "sensor_fault", label: "Датчики (парктроник и т.д.)", emoji: "📡" },
  { id: "cruise_fault", label: "Круиз-контроль", emoji: "🚗" },
  { id: "sunroof_fault", label: "Люк", emoji: "☀️" },
] as const;

const UNDERHOOD_ITEMS = [
  { id: "no_leaks", label: "Течи не выявлены", desc: "Отсутствуют подтёки в подкапотном пространстве" },
  { id: "oil_level", label: "Уровень масла ДВС в пределах нормы", desc: "В пределах нормы по щупу" },
] as const;




const CreateReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getTags, addTag, removeTag, getDisabledDefaults, toggleDefault, getOrder, setOrder } = useUserTags();
  const draftIdParam = searchParams.get("draft");

  // Generate or reuse draft id
  const [draftId] = useState(() => {
    if (draftIdParam) return draftIdParam;
    return `draft-${Date.now()}`;
  });

  // Load existing draft if continuing
  const existingDraft = draftIdParam ? loadDrafts().find((d) => d.id === draftIdParam) : null;

  const [currentStep, setCurrentStep] = useState(existingDraft?.currentStep ?? 0);
  const [direction, setDirection] = useState(1);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [summaryNote, setSummaryNote] = useState(existingDraft?.summaryNote ?? "");
  const [summaryNoteEdited, setSummaryNoteEdited] = useState(
    existingDraft?.summaryNoteEdited ?? !!existingDraft?.summaryNote?.trim()
  );
  const [summaryNoteAutoGenerated, setSummaryNoteAutoGenerated] = useState(
    existingDraft?.summaryNoteAutoGenerated ?? ""
  );
  const [summaryLightbox, setSummaryLightbox] = useState<LightboxState | null>(null);
  const [expertConclusion, setExpertConclusion] = useState(existingDraft?.expertConclusion ?? "");

  const dictation = useSpeechRecognition({
    lang: "ru-RU",
    onResult: (transcript) => {
      setExpertConclusion((prev) => {
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + transcript;
      });
    },
  });

  const goNextFromStep = (fromIdx: number) => {
    if (fromIdx < steps.length - 1) {
      const nextStep = fromIdx + 1;
      const nextId = steps[nextStep].id;
      // Auto-generate summary note when entering the summary step
      if (nextId === "summary") {
        try {
          const draft = buildDraft();
          const autoNote = generateSummaryNote(draft);
          setSummaryNote(autoNote);
          setSummaryNoteAutoGenerated(autoNote);
        } catch {
          // keep existing note if generation fails
        }
      }
      setCurrentStep(nextStep);
      setActiveSection(nextId);
    } else {
      setActiveSection(null);
    }
  };

   const [vin, setVin] = useState(existingDraft?.vin ?? "XW7BF4FK10S012345");
   const [vinUnreadable, setVinUnreadable] = useState(existingDraft?.vinUnreadable ?? false);
  const [plate, setPlate] = useState(existingDraft?.plate ?? "А 777 АА 77");
  const [mileage, setMileage] = useState(existingDraft?.mileage ?? "45000");
  const [mileageMatchesClaimed, setMileageMatchesClaimed] = useState(existingDraft?.mileageMatchesClaimed ?? false);
  const [carResult, setCarResult] = useState<CarPickerResult | null>(existingDraft?.carResult ?? null);
  const [carPickerOpen, setCarPickerOpen] = useState(false);
  const [adLink, setAdLink] = useState(existingDraft?.adLink ?? "");

  // Params state
  const [engineVolume, setEngineVolume] = useState(existingDraft?.engineVolume ?? "");
  const [engineType, setEngineType] = useState(existingDraft?.engineType ?? "");
  const [gearboxType, setGearboxType] = useState(existingDraft?.gearboxType ?? "");
  const [driveType, setDriveType] = useState(existingDraft?.driveType ?? "");
  const [color, setColor] = useState(existingDraft?.color ?? "");
  const [trim, setTrim] = useState(existingDraft?.trim ?? "");
  const [ownersCount, setOwnersCount] = useState(existingDraft?.ownersCount ?? "");
  const [inspectionCity, setInspectionCity] = useState(existingDraft?.inspectionCity ?? "");
  const [inspectionDate, setInspectionDate] = useState<Date>(
    existingDraft?.inspectionDate ? new Date(existingDraft.inspectionDate) : new Date()
  );

  // Inspection state
  const [inspections, setInspections] = useState<Record<string, PartInspection>>(existingDraft?.inspections ?? {});
   const [inspectingPartId, setInspectingPartId] = useState<string | null>(null);
   const [inspectingPartIds, setInspectingPartIds] = useState<string[]>([]);
   const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>(existingDraft?.inspectionPhotos ?? []);
  const inspectionFileRef = useRef<HTMLInputElement>(null);
  const inspectionCameraRef = useRef<HTMLInputElement>(null);

  // Diagnostics state
  const [diagnosticFiles, setDiagnosticFiles] = useState<DiagnosticFile[]>(existingDraft?.diagnosticFiles ?? []);
  const [diagnosticNote, setDiagnosticNote] = useState(existingDraft?.diagnosticNote ?? "");
  const diagFileRef = useRef<HTMLInputElement>(null);

  // Docs check state
  const [docsOwnerMatch, setDocsOwnerMatch] = useState<boolean | null>(existingDraft?.docsOwnerMatch ?? null);
  const [docsVinMatch, setDocsVinMatch] = useState<boolean | null>(existingDraft?.docsVinMatch ?? null);
  const [docsEngineMatch, setDocsEngineMatch] = useState<boolean | null>(existingDraft?.docsEngineMatch ?? null);

  // Underhood state
  const [underhoodChecks, setUnderhoodChecks] = useState<Record<string, boolean>>(existingDraft?.underhoodChecks ?? {});
  const [underhoodNote, setUnderhoodNote] = useState(existingDraft?.underhoodNote ?? "");
  const [underhoodPhotos, setUnderhoodPhotos] = useState<string[]>(existingDraft?.underhoodPhotos ?? []);
  const underhoodFileRef = useRef<HTMLInputElement>(null);

  // Body overview state
  const [bodyPaintFrom, setBodyPaintFrom] = useState(existingDraft?.bodyPaintFrom ?? 80);
  const [bodyPaintTo, setBodyPaintTo] = useState(existingDraft?.bodyPaintTo ?? 200);
  const [bodyPaintEditing, setBodyPaintEditing] = useState(false);
  const [checkAllInspected, setCheckAllInspected] = useState(false);
  const [checkRemainingFactory, setCheckRemainingFactory] = useState(false);
  const [structPaintFrom, setStructPaintFrom] = useState(existingDraft?.structPaintFrom ?? 80);
  const [structPaintTo, setStructPaintTo] = useState(existingDraft?.structPaintTo ?? 200);
  const [structPaintEditing, setStructPaintEditing] = useState(false);
  const [bodyStructural, setBodyStructural] = useState<Record<string, { left: number; right: number }>>(existingDraft?.bodyStructural ?? {});
  const [bodyDamageElements, setBodyDamageElements] = useState<Record<string, boolean>>(existingDraft?.bodyDamageElements ?? {});
  const [bodyStructuralInspections, setBodyStructuralInspections] = useState<Record<string, PartInspection>>(existingDraft?.bodyStructuralInspections ?? {});
  const [bodyUndercarriageInspections, setBodyUndercarriageInspections] = useState<Record<string, PartInspection>>(existingDraft?.bodyUndercarriageInspections ?? {});
  const [bodyInspectingPartId, setBodyInspectingPartId] = useState<string | null>(null);
  const [bodyInspectingPartIds2, setBodyInspectingPartIds2] = useState<string[]>([]);
  const [bodyInspectionModalOpen, setBodyInspectionModalOpen] = useState(false);
  const [bodyCurrentGroupIndex, setBodyCurrentGroupIndex] = useState(0);
  const [bodyGeometryOk, setBodyGeometryOk] = useState(existingDraft?.bodyGeometryOk ?? false);
  const [bodyNote, setBodyNote] = useState(existingDraft?.bodyNote ?? "");
  const [bodyPhotos, setBodyPhotos] = useState<string[]>(existingDraft?.bodyPhotos ?? []);
  const [checkBodyAllInspected, setCheckBodyAllInspected] = useState(false);
  const [checkBodyRemainingFactory, setCheckBodyRemainingFactory] = useState(false);
  const [bodyInspectingPartIds, setBodyInspectingPartIds] = useState<string[]>([]);
  const bodyFileRef = useRef<HTMLInputElement>(null);
  const bodyCameraRef = useRef<HTMLInputElement>(null);

  // Glass inspection state
  const [glassInspections, setGlassInspections] = useState<Record<string, PartInspection>>(existingDraft?.glassInspections ?? {});
  const [glassPhotos, setGlassPhotos] = useState<string[]>(existingDraft?.glassPhotos ?? []);
  const [glassNote, setGlassNote] = useState(existingDraft?.glassNote ?? "");
  const [glassInspectingPartId, setGlassInspectingPartId] = useState<string | null>(null);
  const [glassInspectingPartIds, setGlassInspectingPartIds] = useState<string[]>([]);
  const [glassModalOpen, setGlassModalOpen] = useState(false);
  const [glassCurrentGroupIndex, setGlassCurrentGroupIndex] = useState(0);
  const [checkGlassAllInspected, setCheckGlassAllInspected] = useState(false);
  const [checkGlassRemainingFactory, setCheckGlassRemainingFactory] = useState(false);
  const glassFileRef = useRef<HTMLInputElement>(null);
  const glassCameraRef = useRef<HTMLInputElement>(null);

  // Interior state
  const [interiorNoDamage, setInteriorNoDamage] = useState(existingDraft?.interiorNoDamage ?? false);
  const [interiorTags, setInteriorTags] = useState<string[]>(existingDraft?.interiorTags ?? []);
  const [functionsAllOk, setFunctionsAllOk] = useState(existingDraft?.functionsAllOk ?? false);
  const [functionsTags, setFunctionsTags] = useState<string[]>(existingDraft?.functionsTags ?? []);
  const [interiorPhotos, setInteriorPhotos] = useState<string[]>(existingDraft?.interiorPhotos ?? []);
  const [interiorNote, setInteriorNote] = useState(existingDraft?.interiorNote ?? "");
  const interiorFileRef = useRef<HTMLInputElement>(null);

  // Wheels state
  const [wheelsTiresOk, setWheelsTiresOk] = useState(existingDraft?.wheelsTiresOk ?? false);
  const [wheelsTiresTags, setWheelsTiresTags] = useState<string[]>(existingDraft?.wheelsTiresTags ?? []);
  const [wheelsRimsOk, setWheelsRimsOk] = useState(existingDraft?.wheelsRimsOk ?? false);
  const [wheelsRimsTags, setWheelsRimsTags] = useState<string[]>(existingDraft?.wheelsRimsTags ?? []);
  const [wheelsBrakesOk, setWheelsBrakesOk] = useState(existingDraft?.wheelsBrakesOk ?? false);
  const [wheelsBrakesTags, setWheelsBrakesTags] = useState<string[]>(existingDraft?.wheelsBrakesTags ?? []);
  const [wheelsPhotos, setWheelsPhotos] = useState<string[]>(existingDraft?.wheelsPhotos ?? []);
  const [wheelsNote, setWheelsNote] = useState(existingDraft?.wheelsNote ?? "");
  const [wheelsSuspensionOk, setWheelsSuspensionOk] = useState(existingDraft?.wheelsSuspensionOk ?? false);
  const [wheelsSuspensionTags, setWheelsSuspensionTags] = useState<string[]>(existingDraft?.wheelsSuspensionTags ?? []);
  const wheelsFileRef = useRef<HTMLInputElement>(null);

  // Test drive state
  const [tdConducted, setTdConducted] = useState<boolean | null>(existingDraft?.tdConducted ?? null);
  const [tdEngineOk, setTdEngineOk] = useState(existingDraft?.tdEngineOk ?? false);
  const [tdEngineTags, setTdEngineTags] = useState<string[]>(existingDraft?.tdEngineTags ?? []);
  const [tdGearboxOk, setTdGearboxOk] = useState(existingDraft?.tdGearboxOk ?? false);
  const [tdGearboxTags, setTdGearboxTags] = useState<string[]>(existingDraft?.tdGearboxTags ?? []);
  const [tdSteeringOk, setTdSteeringOk] = useState(existingDraft?.tdSteeringOk ?? false);
  const [tdSteeringTags, setTdSteeringTags] = useState<string[]>(existingDraft?.tdSteeringTags ?? []);
  const [tdRideOk, setTdRideOk] = useState(existingDraft?.tdRideOk ?? false);
  const [tdRideTags, setTdRideTags] = useState<string[]>(existingDraft?.tdRideTags ?? []);
  const [tdBrakeRideOk, setTdBrakeRideOk] = useState(existingDraft?.tdBrakeRideOk ?? false);
  const [tdBrakeRideTags, setTdBrakeRideTags] = useState<string[]>(existingDraft?.tdBrakeRideTags ?? []);
  const [tdPhotos, setTdPhotos] = useState<string[]>(existingDraft?.tdPhotos ?? []);
  const [tdNote, setTdNote] = useState(existingDraft?.tdNote ?? "");
  const tdFileRef = useRef<HTMLInputElement>(null);
  const finalizedRef = useRef(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Legal check state — if resuming at legal step without loaded data, restart loading
  const shouldRestartLegal = existingDraft && !existingDraft.legalLoaded && steps[existingDraft.currentStep]?.id === "legal";
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalSkipped, setLegalSkipped] = useState(shouldRestartLegal ? false : (existingDraft?.legalSkipped ?? false));
  const [legalLoaded, setLegalLoaded] = useState(existingDraft?.legalLoaded ?? false);
  const [legalTimedOut, setLegalTimedOut] = useState(false);
  const [legalPurchased, setLegalPurchased] = useState(false);
  const legalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   // Media gallery state
   const DEMO_MEDIA: MediaItem[] = [
     { id: "demo-1", url: "https://picsum.photos/seed/car1/400/300", type: "image" },
     { id: "demo-2", url: "https://picsum.photos/seed/car2/300/400", type: "image" },
     { id: "demo-3", url: "https://picsum.photos/seed/car3/400/250", type: "image" },
     { id: "demo-4", url: "https://picsum.photos/seed/car4/350/350", type: "image" },
     { id: "demo-5", url: "https://picsum.photos/seed/car5/400/500", type: "image" },
     { id: "demo-6", url: "https://picsum.photos/seed/car6/300/200", type: "image" },
     { id: "demo-7", url: "https://picsum.photos/seed/car7/400/300", type: "image" },
   ];
   const [mediaFiles, setMediaFiles] = useState<MediaItem[]>(existingDraft?.mediaFiles ?? DEMO_MEDIA);
   const mediaFileRef = useRef<HTMLInputElement>(null);
   const pendingMediaGroupRef = useRef<import("@/components/SortableMediaGallery").MediaGroupName | null>(null);


   // Auto-save draft function
  const buildDraft = useCallback((): ReportDraft => ({
    id: draftId,
    currentStep,
    totalSteps: steps.length,
    vin,
    vinUnreadable,
    plate,
    mileage,
    mileageMatchesClaimed,
    carResult,
    legalSkipped,
    legalLoaded,
    inspections,
    inspectionPhotos,
    diagnosticFiles,
    diagnosticNote,
    docsOwnerMatch,
    docsVinMatch,
    docsEngineMatch,
    underhoodChecks,
    underhoodNote,
    underhoodPhotos,
    bodyPaintFrom,
    bodyPaintTo,
    structPaintFrom,
    structPaintTo,
    bodyStructural,
    bodyDamageElements,
    bodyStructuralInspections,
    bodyUndercarriageInspections,
    bodyGeometryOk,
    bodyNote,
    bodyPhotos,
    glassInspections,
    glassPhotos,
    glassNote,
    interiorNoDamage,
    interiorTags,
    functionsAllOk,
    functionsTags,
    interiorPhotos,
    interiorNote,
    wheelsTiresOk,
    wheelsTiresTags,
    wheelsRimsOk,
    wheelsRimsTags,
    wheelsBrakesOk,
    wheelsBrakesTags,
    wheelsPhotos,
    wheelsNote,
    wheelsSuspensionOk,
    wheelsSuspensionTags,
    tdConducted,
    tdEngineOk,
    tdEngineTags,
    tdGearboxOk,
    tdGearboxTags,
    tdSteeringOk,
    tdSteeringTags,
    tdRideOk,
    tdRideTags,
    tdBrakeRideOk,
    tdBrakeRideTags,
    tdPhotos,
    tdNote,
    mediaFiles,
    engineVolume,
    engineType,
    gearboxType,
    driveType,
    color,
    trim,
    ownersCount,
    inspectionCity,
    inspectionDate: inspectionDate.toISOString(),
    adLink,
    summaryNote,
    summaryNoteEdited,
    summaryNoteAutoGenerated,
    expertConclusion,
    updatedAt: new Date().toISOString().slice(0, 10),
  }), [draftId, currentStep, vin, vinUnreadable, plate, mileage, mileageMatchesClaimed, carResult, legalSkipped, legalLoaded, inspections, inspectionPhotos, diagnosticFiles, diagnosticNote, docsOwnerMatch, docsVinMatch, docsEngineMatch, underhoodChecks, underhoodNote, underhoodPhotos, bodyPaintFrom, bodyPaintTo, structPaintFrom, structPaintTo, bodyStructural, bodyDamageElements, bodyStructuralInspections, bodyUndercarriageInspections, bodyGeometryOk, bodyNote, bodyPhotos, glassInspections, glassPhotos, glassNote, interiorNoDamage, interiorTags, functionsAllOk, functionsTags, interiorPhotos, interiorNote, wheelsTiresOk, wheelsTiresTags, wheelsRimsOk, wheelsRimsTags, wheelsBrakesOk, wheelsBrakesTags, wheelsPhotos, wheelsNote, wheelsSuspensionOk, wheelsSuspensionTags, tdConducted, tdEngineOk, tdEngineTags, tdGearboxOk, tdGearboxTags, tdSteeringOk, tdSteeringTags, tdRideOk, tdRideTags, tdBrakeRideOk, tdBrakeRideTags, tdPhotos, tdNote, mediaFiles, engineVolume, engineType, gearboxType, driveType, color, trim, ownersCount, inspectionCity, inspectionDate, adLink, summaryNote, summaryNoteEdited, summaryNoteAutoGenerated, expertConclusion]);

  // Debounced autosave — saves on every state change (with 3s delay) + on unmount
  useDebouncedAutosave(buildDraft, finalizedRef, 3000);

  // Auto-regenerate summary whenever entering the summary step (any navigation path)
  useEffect(() => {
    if (activeSection !== "summary") return;
    try {
      const draft = buildDraft();
      const autoNote = generateSummaryNote(draft);
      setSummaryNote(autoNote);
      setSummaryNoteAutoGenerated(autoNote);
    } catch {
      // keep existing note
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const scheduleLegalTimeout = useCallback(() => {
    if (legalTimeoutRef.current) clearTimeout(legalTimeoutRef.current);
    legalTimeoutRef.current = setTimeout(() => {
      setLegalTimedOut(true);
      setLegalLoading(false);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (legalTimeoutRef.current) clearTimeout(legalTimeoutRef.current);
    };
  }, []);

   // Merged inspections (useMemo) — combines section inspections with media gallery data
   const merged = useMergedInspections(
     inspections,
     bodyStructuralInspections,
     bodyUndercarriageInspections,
     glassInspections,
     mediaFiles,
   );

  // Auto-compute paint thickness range from part inspections (only when not manually editing)
  const prevInspectionsRef = useRef(inspections);
  useEffect(() => {
    if (bodyPaintEditing) return;
    // Only update if inspections object actually changed
    if (prevInspectionsRef.current === inspections) return;
    prevInspectionsRef.current = inspections;
    const values: number[] = [];
    Object.values(inspections).forEach((ins) => {
      if (ins.paintThickness) {
        values.push(ins.paintThickness.from, ins.paintThickness.to);
      }
    });
    if (values.length > 0) {
      setBodyPaintFrom(Math.min(...values));
      setBodyPaintTo(Math.max(...values));
    }
  }, [inspections, bodyPaintEditing]);

  const vinRef = useRef<HTMLInputElement>(null);
  const plateRef = useRef<HTMLInputElement>(null);
  const mileageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSection === "vin") vinRef.current?.focus();
      if (activeSection === "plate") plateRef.current?.focus();
      if (activeSection === "params") mileageRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [activeSection]);


  // Legal loading is now triggered manually by the "Buy" button, not auto-started

  const goPrev = () => {
    navigate(-1);
  };

  // Duplicate VIN dialog state
  const [duplicateDraft, setDuplicateDraft] = useState<ReportDraft | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const handleVinSubmit = () => {
    if (!vinUnreadable && vin.trim().length === 0) return;
    if (vinUnreadable) { goNextFromStep(0); return; }

    // Check if another draft has the same VIN
    const existing = loadDrafts().find(
      (d) => d.vin && d.vin === vin.trim() && d.id !== draftId
    );

    if (existing) {
      setDuplicateDraft(existing);
      setShowDuplicateDialog(true);
      return;
    }

    goNextFromStep(0);
  };

  const handleContinueExistingDraft = () => {
    if (duplicateDraft) {
      setShowDuplicateDialog(false);
      // Navigate with replace and use key to force remount
      navigate(`/create?draft=${duplicateDraft.id}`, { replace: true });
      // Force full remount by reloading state from the draft
      const draft = loadDrafts().find((d) => d.id === duplicateDraft.id);
      if (draft) {
        setVin(draft.vin);
        setPlate(draft.plate);
        setMileage(draft.mileage);
        setMileageMatchesClaimed(draft.mileageMatchesClaimed ?? false);
        setCarResult(draft.carResult);
        setInspections(draft.inspections);
        setInspectionPhotos(draft.inspectionPhotos ?? []);
        setDiagnosticFiles(draft.diagnosticFiles ?? []);
        setDiagnosticNote(draft.diagnosticNote ?? "");
        setDocsOwnerMatch(draft.docsOwnerMatch ?? null);
        setDocsVinMatch(draft.docsVinMatch ?? null);
        setDocsEngineMatch(draft.docsEngineMatch ?? null);
        setUnderhoodChecks(draft.underhoodChecks ?? {});
        setUnderhoodNote(draft.underhoodNote ?? "");
        setUnderhoodPhotos(draft.underhoodPhotos ?? []);
        setBodyPaintFrom(draft.bodyPaintFrom ?? 80);
        setBodyPaintTo(draft.bodyPaintTo ?? 200);
        setStructPaintFrom(draft.structPaintFrom ?? 80);
        setStructPaintTo(draft.structPaintTo ?? 200);
        setBodyStructural(draft.bodyStructural ?? {});
        setBodyDamageElements(draft.bodyDamageElements ?? {});
        setBodyStructuralInspections(draft.bodyStructuralInspections ?? {});
        setBodyUndercarriageInspections(draft.bodyUndercarriageInspections ?? {});
        setBodyGeometryOk(draft.bodyGeometryOk ?? false);
        setBodyNote(draft.bodyNote ?? "");
        setBodyPhotos(draft.bodyPhotos ?? []);
        setGlassInspections(draft.glassInspections ?? {});
        setGlassPhotos(draft.glassPhotos ?? []);
        setGlassNote(draft.glassNote ?? "");
        setInteriorNoDamage(draft.interiorNoDamage ?? false);
        setInteriorTags(draft.interiorTags ?? []);
        setFunctionsAllOk(draft.functionsAllOk ?? false);
        setFunctionsTags(draft.functionsTags ?? []);
        setInteriorPhotos(draft.interiorPhotos ?? []);
        setInteriorNote(draft.interiorNote ?? "");
        setWheelsTiresOk(draft.wheelsTiresOk ?? false);
        setWheelsTiresTags(draft.wheelsTiresTags ?? []);
        setWheelsRimsOk(draft.wheelsRimsOk ?? false);
        setWheelsRimsTags(draft.wheelsRimsTags ?? []);
        setWheelsBrakesOk(draft.wheelsBrakesOk ?? false);
        setWheelsBrakesTags(draft.wheelsBrakesTags ?? []);
        setWheelsPhotos(draft.wheelsPhotos ?? []);
        setWheelsNote(draft.wheelsNote ?? "");
        setWheelsSuspensionOk(draft.wheelsSuspensionOk ?? false);
        setWheelsSuspensionTags(draft.wheelsSuspensionTags ?? []);
        setTdConducted(draft.tdConducted ?? null);
        setTdEngineOk(draft.tdEngineOk ?? false);
        setTdEngineTags(draft.tdEngineTags ?? []);
        setTdGearboxOk(draft.tdGearboxOk ?? false);
        setTdGearboxTags(draft.tdGearboxTags ?? []);
        setTdSteeringOk(draft.tdSteeringOk ?? false);
        setTdSteeringTags(draft.tdSteeringTags ?? []);
        setTdRideOk(draft.tdRideOk ?? false);
        setTdRideTags(draft.tdRideTags ?? []);
        setTdBrakeRideOk(draft.tdBrakeRideOk ?? false);
        setTdBrakeRideTags(draft.tdBrakeRideTags ?? []);
        setTdPhotos(draft.tdPhotos ?? []);
        setTdNote(draft.tdNote ?? "");
        setMediaFiles(draft.mediaFiles ?? []);
        setEngineVolume(draft.engineVolume ?? "");
        setEngineType(draft.engineType ?? "");
        setGearboxType(draft.gearboxType ?? "");
        setDriveType(draft.driveType ?? "");
        setColor(draft.color ?? "");
        setTrim(draft.trim ?? "");
        setOwnersCount(draft.ownersCount ?? "");
        setInspectionCity(draft.inspectionCity ?? "");
        setInspectionDate(draft.inspectionDate ? new Date(draft.inspectionDate) : new Date());
        setAdLink(draft.adLink ?? "");
        setSummaryNote(draft.summaryNote ?? "");
        setSummaryNoteEdited(draft.summaryNoteEdited ?? !!draft.summaryNote?.trim());
        setSummaryNoteAutoGenerated(draft.summaryNoteAutoGenerated ?? "");
        setExpertConclusion(draft.expertConclusion ?? "");
        setLegalSkipped(draft.legalSkipped);
        setLegalLoaded(draft.legalLoaded);
        setDirection(1);
        setCurrentStep(draft.currentStep);
        setActiveSection(steps[draft.currentStep]?.id || null);
      }
    }
  };

  const handleStartFresh = () => {
    if (duplicateDraft) {
      deleteDraft(duplicateDraft.id);
    }
    setShowDuplicateDialog(false);
    setDuplicateDraft(null);
    goNextFromStep(0);
  };

  const handlePlateSubmit = () => {
    if (plate.trim().length > 0) goNextFromStep(1);
  };

  const handleMileageSubmit = () => {
    if (mileage.trim().length > 0) goNextFromStep(2);
  };

  const handleCarSelect = (result: CarPickerResult) => {
    setCarResult(result);
  };

  const handlePartClick = (partId: string) => {
    setInspectingPartId(partId);
    setInspectingPartIds([]);
    setInspectionModalOpen(true);
  };

  const INSPECTION_GROUPS = [
    { title: "Передняя часть", icon: <img src={frontCarIcon} alt="Передняя часть" className="w-7 h-7 object-contain" />, parts: ["front_bumper", "hood"] },
    { title: "Левая сторона", icon: <img src={leftCarIcon} alt="Левая сторона" className="w-7 h-7 object-contain" />, parts: ["left_front_fender", "left_front_door", "left_rear_door", "left_rear_fender"] },
    { title: "Правая сторона", icon: <img src={rightCarIcon} alt="Правая сторона" className="w-7 h-7 object-contain" />, parts: ["right_front_fender", "right_front_door", "right_rear_door", "right_rear_fender"] },
    { title: "Верх", icon: <img src={topCarIcon} alt="Верх" className="w-7 h-7 object-contain" />, parts: ["roof"] },
    { title: "Задняя часть", icon: <img src={backCarIcon} alt="Задняя часть" className="w-7 h-7 object-contain" />, parts: ["trunk", "rear_bumper"] },
  ];

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const handlePartsSelect = (partIds: string[], groupIdx?: number) => {
    if (groupIdx !== undefined) setCurrentGroupIndex(groupIdx);
    setInspectingPartIds(partIds);
    setInspectingPartId(partIds[0]);
    setInspectionModalOpen(true);
  };

  const handleGroupClick = (groupIdx: number) => {
    const group = INSPECTION_GROUPS[groupIdx];
    setCurrentGroupIndex(groupIdx);
    setInspectingPartIds(group.parts);
    setInspectingPartId(group.parts[0]);
    setInspectionModalOpen(true);
  };

  const handleSwitchGroup = (groupIdx: number, currentResults: Record<string, PartInspection>) => {
    // Save current group results
    setInspections((prev) => ({ ...prev, ...currentResults }));
    // Switch to new group
    const newGroup = INSPECTION_GROUPS[groupIdx];
    setCurrentGroupIndex(groupIdx);
    setInspectingPartIds(newGroup.parts);
    setInspectingPartId(newGroup.parts[0]);
    // Force re-open by toggling
    setInspectionModalOpen(false);
    setTimeout(() => setInspectionModalOpen(true), 50);
  };

  const handleInspectionSave = (inspection: PartInspection) => {
    setInspections((prev) => ({ ...prev, [inspection.partId]: inspection }));
  };

  const handleInspectionSaveMultiple = (results: Record<string, PartInspection>) => {
    setInspections((prev) => ({ ...prev, ...results }));
  };

  const BODY_GROUPS = [
    { title: "Стойки", parts: STRUCTURAL_PARTS.map((p) => p.id) },
    { title: "Лонжероны, пороги, брызговики", parts: UNDERCARRIAGE_PARTS.map((p) => p.id) },
  ];

  const allBodyPartsMap: Record<string, { id: string; label: string }> = {};
  [...STRUCTURAL_PARTS, ...UNDERCARRIAGE_PARTS].forEach((p) => { allBodyPartsMap[p.id] = p; });

  const allBodyInspections = { ...bodyStructuralInspections, ...bodyUndercarriageInspections };

  const handleBodyPartsSelect = (partIds: string[], groupIdx?: number) => {
    if (groupIdx !== undefined) setBodyCurrentGroupIndex(groupIdx);
    setBodyInspectingPartIds2(partIds);
    setBodyInspectingPartId(partIds[0]);
    setBodyInspectionModalOpen(true);
  };

  const handleBodyPartClick = (partId: string) => {
    // Find which group this part belongs to
    const gIdx = BODY_GROUPS.findIndex((g) => g.parts.includes(partId));
    if (gIdx >= 0) setBodyCurrentGroupIndex(gIdx);
    const group = BODY_GROUPS[gIdx >= 0 ? gIdx : 0];
    setBodyInspectingPartIds2(group.parts);
    setBodyInspectingPartId(partId);
    setBodyInspectionModalOpen(true);
  };

  const handleBodySwitchGroup = (groupIdx: number, currentResults: Record<string, PartInspection>) => {
    // Save current results to appropriate state
    handleBodySaveMultiple(currentResults);
    const newGroup = BODY_GROUPS[groupIdx];
    setBodyCurrentGroupIndex(groupIdx);
    setBodyInspectingPartIds2(newGroup.parts);
    setBodyInspectingPartId(newGroup.parts[0]);
    setBodyInspectionModalOpen(false);
    setTimeout(() => setBodyInspectionModalOpen(true), 50);
  };

  const handleBodySaveMultiple = (results: Record<string, PartInspection>) => {
    const structResults: Record<string, PartInspection> = {};
    const underResults: Record<string, PartInspection> = {};
    for (const [id, ins] of Object.entries(results)) {
      if (STRUCTURAL_PARTS.some((p) => p.id === id)) {
        structResults[id] = ins;
      } else {
        underResults[id] = ins;
      }
    }
    if (Object.keys(structResults).length > 0) {
      setBodyStructuralInspections((prev) => ({ ...prev, ...structResults }));
    }
    if (Object.keys(underResults).length > 0) {
      setBodyUndercarriageInspections((prev) => ({ ...prev, ...underResults }));
    }
  };

  const handleBodyInspectionSave = (inspection: PartInspection) => {
    if (STRUCTURAL_PARTS.some((p) => p.id === inspection.partId)) {
      setBodyStructuralInspections((prev) => ({ ...prev, [inspection.partId]: inspection }));
    } else {
      setBodyUndercarriageInspections((prev) => ({ ...prev, [inspection.partId]: inspection }));
    }
  };

  // Glass inspection groups & handlers
  const GLASS_GROUPS = [
    { title: "Лобовое и заднее", parts: ["windshield", "rear_glass"] },
    { title: "Боковые стёкла", parts: ["glass_front_left", "glass_front_right", "glass_rear_left", "glass_rear_right"] },
    { title: "Зеркала", parts: ["mirror_left", "mirror_right"] },
  ];

  const allGlassPartsMap: Record<string, { id: string; label: string }> = {};
  GLASS_PARTS.forEach((p) => { allGlassPartsMap[p.id] = p; });

  const handleGlassSaveMultiple = (results: Record<string, PartInspection>) => {
    setGlassInspections((prev) => ({ ...prev, ...results }));
  };

  const handleGlassInspectionSave = (inspection: PartInspection) => {
    setGlassInspections((prev) => ({ ...prev, [inspection.partId]: inspection }));
  };

  const handleGlassSwitchGroup = (groupIdx: number, currentResults: Record<string, PartInspection>) => {
    handleGlassSaveMultiple(currentResults);
    const newGroup = GLASS_GROUPS[groupIdx];
    setGlassCurrentGroupIndex(groupIdx);
    setGlassInspectingPartIds(newGroup.parts);
    setGlassInspectingPartId(newGroup.parts[0]);
    setGlassModalOpen(false);
    setTimeout(() => setGlassModalOpen(true), 50);
  };

  const glassInspectingParts = glassInspectingPartIds.map((id) => allGlassPartsMap[id]).filter(Boolean);
  const glassInspectedCount = Object.values(glassInspections).filter((i) => i.noDamage || i.tags.length > 0).length;

  const inspectedCount = Object.values(inspections).filter((i) => i.noDamage || i.tags.length > 0).length;
  const inspectingPart = inspectingPartId ? CAR_PARTS.find((p) => p.id === inspectingPartId) : null;
  const structuralInspectedCount = Object.values(bodyStructuralInspections).filter((i) => i.noDamage || i.tags.length > 0).length;
  const undercarriageInspectedCount = Object.values(bodyUndercarriageInspections).filter((i) => i.noDamage || i.tags.length > 0).length;
  const bodyInspectingParts = bodyInspectingPartIds2.map((id) => allBodyPartsMap[id]).filter(Boolean);

  // Completed values for summary chips
  const completedValues: Record<string, string> = {};
  if (vin || plate || carResult) {
    const vp: string[] = [];
    if (carResult) vp.push(`${carResult.brand.name} ${carResult.model.model}`);
    if (vin) vp.push(vin);
    if (plate) vp.push(plate);
    completedValues["vehicle"] = vp.join(" · ");
  }
  {
    const pp: string[] = [];
    if (mileage) pp.push(`${Number(mileage).toLocaleString("ru-RU")} км`);
    if (engineVolume) pp.push(`${engineVolume} л`);
    if (engineType) pp.push(engineType);
    if (gearboxType) pp.push(gearboxType);
    if (driveType) pp.push(driveType);
    if (color) pp.push(color);
    if (pp.length > 0) completedValues["params"] = pp.join(" · ");
  }
  if (legalSkipped && !legalLoaded) {
    completedValues["legal"] = "Пропущено";
  } else if (legalLoaded) {
    completedValues["legal"] = "Проверено";
  }
  if (docsOwnerMatch !== null && docsVinMatch !== null && docsEngineMatch !== null) {
    const count = [docsOwnerMatch, docsVinMatch, docsEngineMatch].filter(v => v === true).length;
    completedValues["docs_check"] = `${count} из 3`;
  }
  if (tdConducted === false) {
    completedValues["test_drive"] = "Не проводился";
  } else if (tdConducted === true) {
    if (tdEngineOk && tdGearboxOk && tdSteeringOk && tdRideOk && tdBrakeRideOk) {
      completedValues["test_drive"] = "Всё ✓";
    } else if (tdEngineOk || tdGearboxOk || tdSteeringOk || tdRideOk || tdBrakeRideOk || tdEngineTags.length > 0 || tdGearboxTags.length > 0 || tdSteeringTags.length > 0 || tdRideTags.length > 0 || tdBrakeRideTags.length > 0 || tdPhotos.length > 0) {
      const tp: string[] = [];
      const allOks = [tdEngineOk && "ДВС", tdGearboxOk && "КПП", tdSteeringOk && "Руль", tdRideOk && "Подвеска", tdBrakeRideOk && "Тормоза"].filter(Boolean);
      if (allOks.length > 0) tp.push(allOks.join(", ") + " ✓");
      const tdDefects = tdEngineTags.length + tdGearboxTags.length + tdSteeringTags.length + tdRideTags.length + tdBrakeRideTags.length;
      if (tdDefects > 0) tp.push(`${tdDefects} замеч.`);
      completedValues["test_drive"] = tp.join(", ");
    }
  }

  // If a section is active, render it as a full-screen page
  if (activeSection) {
    const stepIndex = steps.findIndex(s => s.id === activeSection);
    const step = steps[stepIndex];
    if (!step) { setActiveSection(null); return null; }
    const goNext = () => goNextFromStep(stepIndex);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 pb-3 pt-12">
          <button onClick={() => setActiveSection(null)} className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{step.title}</h1>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">{stepIndex + 1}/{steps.length}</span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="flex flex-col gap-4">

            {step.id === "vehicle" && (
              <div className="space-y-6">
                {/* VIN */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">VIN-номер</p>
                  <div className="flex gap-2">
                    <Input
                      ref={vinRef}
                      value={vin}
                      onChange={(e) => setVin(e.target.value.toUpperCase())}
                      placeholder="XW7BF4FK10S0*****"
                      className="h-14 text-lg font-mono tracking-wider flex-1"
                      maxLength={17}
                      disabled={vinUnreadable}
                    />
                    <VinScanner
                      onResult={(v) => setVin(v)}
                      disabled={vinUnreadable}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !vinUnreadable;
                      setVinUnreadable(next);
                      if (next) setVin("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      vinUnreadable
                        ? "border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.05)]"
                        : "border-border/60 bg-card"
                    }`}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all flex-shrink-0 ${
                      vinUnreadable
                        ? "border-[hsl(var(--warning))] bg-[hsl(var(--warning))]"
                        : "border-muted-foreground/30"
                    }`}>
                      {vinUnreadable && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${vinUnreadable ? "text-[hsl(var(--warning)/0.85)]" : "text-foreground"}`}>
                        Нечитабельный VIN
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">VIN-номер повреждён или не читается</p>
                    </div>
                  </button>
                </div>

                {/* Plate */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Госномер</p>
                  <Input
                    ref={plateRef}
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="А 000 АА 000"
                    className="h-14 text-lg font-mono tracking-wider text-center"
                  />
                </div>

                {/* Car picker */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Марка и модель</p>
                  <button
                    type="button"
                    onClick={() => setCarPickerOpen(true)}
                    className="flex h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-base transition-colors hover:bg-accent active:scale-[0.98]"
                  >
                    <span className={carResult ? "font-medium text-foreground truncate" : "text-muted-foreground"}>
                      {carResult
                        ? `${carResult.brand.name} ${carResult.model.model}`
                        : "Нажмите для выбора автомобиля"}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>

                  {carResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {(() => {
                        const photo = carResult.restyling.photos.find((p) => p.size === "m") || carResult.restyling.photos[0];
                        return photo ? (
                          <img src={photo.urlX1} alt="Авто" className="w-full h-40 object-cover" />
                        ) : null;
                      })()}
                      <div className="p-3 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {carResult.brand.name} {carResult.model.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {carResult.generation ? `Поколение ${carResult.generation.generation}` : "Поколение не выбрано"}{carResult.restyling ? ` · ${carResult.restyling.frames.map((f) => f.frame).join(" / ")}` : ""}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Ссылка на объявление */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Ссылка на объявление</p>
                  <Input
                    value={adLink}
                    onChange={(e) => setAdLink(e.target.value)}
                    placeholder="https://auto.ru/..."
                    className="h-12"
                    type="url"
                    inputMode="url"
                  />
                </div>

                {/* Continue */}
                <StepCTA
                  onClick={goNext}
                  disabled={!vinUnreadable && !vin.trim()}
                  reasons={[
                    ...(!vin.trim() && !vinUnreadable ? ["Укажите VIN-номер или отметьте как нечитаемый"] : []),
                  ].filter(Boolean)}
                />
              </div>
            )}

            {step.id === "params" && (
              <div className="space-y-5">
                {/* Пробег */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Пробег (км)</p>
                  <Input
                    ref={mileageRef}
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
                    placeholder="45 000"
                    className="h-14 text-lg font-mono tracking-wider"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => setMileageMatchesClaimed(!mileageMatchesClaimed)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      mileageMatchesClaimed
                        ? "border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.05)]"
                        : "border-border/60 bg-card"
                    }`}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all flex-shrink-0 ${
                      mileageMatchesClaimed
                        ? "border-[hsl(var(--warning))] bg-[hsl(var(--warning))]"
                        : "border-muted-foreground/30"
                    }`}>
                      {mileageMatchesClaimed && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <p className={`text-sm font-medium ${mileageMatchesClaimed ? "text-[hsl(var(--warning))]" : "text-foreground"}`}>
                      По внешнему состоянию пробег не соответствует заявленному
                    </p>
                  </button>
                </div>

                {/* Объём двигателя */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Объём двигателя (л)</p>
                  <Select value={engineVolume} onValueChange={setEngineVolume}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите объём" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 43 }, (_, i) => {
                        const val = (0.8 + i * 0.1).toFixed(1);
                        return (
                          <SelectItem key={val} value={val}>
                            {val}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Тип двигателя */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Тип двигателя</p>
                  <Select value={engineType} onValueChange={setEngineType}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Бензин">Бензин</SelectItem>
                      <SelectItem value="Дизель">Дизель</SelectItem>
                      <SelectItem value="Гибрид">Гибрид</SelectItem>
                      <SelectItem value="Электро">Электро</SelectItem>
                      <SelectItem value="Газ/Бензин">Газ/Бензин</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Тип КПП */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Коробка передач</p>
                  <Select value={gearboxType} onValueChange={setGearboxType}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="АКПП">АКПП</SelectItem>
                      <SelectItem value="МКПП">МКПП</SelectItem>
                      <SelectItem value="Робот">Робот</SelectItem>
                      <SelectItem value="Вариатор">Вариатор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Привод */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Привод</p>
                  <Select value={driveType} onValueChange={setDriveType}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Передний">Передний</SelectItem>
                      <SelectItem value="Задний">Задний</SelectItem>
                      <SelectItem value="Полный">Полный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Цвет */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Цвет</p>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите цвет" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Белый", "Чёрный", "Серый", "Серебристый", "Синий", "Голубой", "Красный", "Бордовый", "Зелёный", "Жёлтый", "Оранжевый", "Коричневый", "Бежевый", "Фиолетовый", "Золотистый"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Комплектация */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Комплектация</p>
                  <Input
                    value={trim}
                    onChange={(e) => setTrim(e.target.value)}
                    placeholder="Comfort, Elegance..."
                    className="h-12"
                  />
                </div>

                {/* Количество владельцев */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Количество владельцев</p>
                  <Select value={ownersCount} onValueChange={setOwnersCount}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4+"].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Город осмотра */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Город осмотра</p>
                  <Input
                    value={inspectionCity}
                    onChange={(e) => setInspectionCity(e.target.value)}
                    placeholder="Москва"
                    className="h-12"
                  />
                </div>

                {/* Дата осмотра */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Дата осмотра</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-12 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent",
                          !inspectionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {format(inspectionDate, "dd.MM.yyyy")}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={inspectionDate}
                        onSelect={(d) => d && setInspectionDate(d)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Continue */}
                <StepCTA
                  onClick={goNext}
                  disabled={!mileage.trim()}
                  reasons={[
                    ...(!mileage.trim() ? ["Укажите пробег автомобиля"] : []),
                  ]}
                />
              </div>
            )}

            {step.id === "legal" && (
              <div className="space-y-6 overflow-y-auto pb-24">

                {legalLoaded ? (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Проверка завершена</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Юридическая информация загружена
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 active:scale-[0.98]"
                    >
                      Продолжить
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : legalLoading && !legalSkipped ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="relative flex items-center justify-center">
                        <div
                          className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
                          style={{ animationDuration: "2s" }}
                        />
                        <div className="p-3">
                          <FileSearch className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">Загрузка данных…</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Проверяем юридическую историю автомобиля
                      </p>
                    </div>

                    <div className="space-y-3">
                      {["Владельцы", "ДТП", "Залоги", "Ограничения"].map((label, i) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4"
                        >
                          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <Skeleton className="h-4 w-3/4 rounded" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : !legalPurchased && !legalTimedOut ? (
                  /* Initial state — offer to buy */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="rounded-full bg-primary/10 p-3">
                        <FileSearch className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Юридическая проверка</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Проверка владельцев, ДТП, залогов, ограничений и розыска
                      </p>
                    </div>

                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        <p className="text-sm font-semibold text-foreground">Купить полный отчёт</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Получите полную юридическую проверку: владельцы, ДТП, залоги, ограничения, розыск и история обслуживания.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLegalPurchased(true);
                          setLegalLoading(true);
                          setLegalTimedOut(false);
                          scheduleLegalTimeout();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98]"
                      >
                        Купить отчёт — 50 ₽
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalSkipped(true);
                        goNext();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card py-3.5 text-sm font-medium text-muted-foreground transition-all active:scale-[0.98]"
                    >
                      Пропустить
                    </button>
                  </motion.div>
                ) : legalTimedOut && !legalSkipped ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="rounded-full bg-destructive/10 p-3">
                        <XCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Не удалось подгрузить</p>
                      <p className="text-xs text-muted-foreground text-center">
                        Сервер не ответил. Вы можете загрузить данные позже.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLegalSkipped(true);
                        goNext();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] py-4 text-sm font-semibold text-[hsl(var(--warning)/0.85)] transition-all active:scale-[0.98]"
                    >
                      <Clock className="h-4 w-4" />
                      Подгрузить позже
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 py-6">
                      {legalPurchased ? (
                        <>
                          <div className="rounded-full bg-primary/10 p-3">
                            <Check className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Отчёт уже куплен</p>
                          <p className="text-xs text-muted-foreground text-center">
                            Данные будут загружены автоматически, когда сервер ответит
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Проверка пропущена</p>
                      )}
                    </div>
                    {legalPurchased && (
                      <button
                        type="button"
                        onClick={() => {
                          setLegalSkipped(false);
                          setLegalLoading(true);
                          setLegalTimedOut(false);
                          scheduleLegalTimeout();
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3.5 text-sm font-semibold text-primary transition-all active:scale-[0.98]"
                      >
                        <FileSearch className="h-4 w-4" />
                        Повторить загрузку
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 active:scale-[0.98]"
                    >
                      Продолжить
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {step.id === "docs_check" && (
              <div className="space-y-4 overflow-y-auto pb-24">
                {[
                  { key: "owner", checked: docsOwnerMatch, set: setDocsOwnerMatch, label: "Данные владельца", desc: "ФИО владельца совпадает с данными в ПТС / СТС" },
                  { key: "vin", checked: docsVinMatch, set: setDocsVinMatch, label: "Идентификационные номера", desc: "VIN-номер на кузове совпадает с ПТС / СТС" },
                  { key: "engine", checked: docsEngineMatch, set: setDocsEngineMatch, label: "Модель двигателя", desc: "Модель ДВС совпадает с данными в ПТС / СТС" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-4"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground/70">{item.desc}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {/* "Да" button */}
                      <button
                        type="button"
                        onClick={() => item.set(true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          item.checked === true
                            ? "bg-[hsl(var(--success))] text-white shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >Да</button>
                      {/* "Нет" button */}
                      <button
                        type="button"
                        onClick={() => item.set(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          item.checked === false
                            ? "bg-destructive text-destructive-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >Нет</button>
                    </div>
                  </div>
                ))}

                <StepCTA
                  onClick={goNext}
                  disabled={docsOwnerMatch === null || docsVinMatch === null || docsEngineMatch === null}
                  label={docsOwnerMatch !== null && docsVinMatch !== null && docsEngineMatch !== null && !(docsOwnerMatch && docsVinMatch && docsEngineMatch) ? "Продолжить с расхождениями" : "Продолжить"}
                  reasons={[
                    ...(docsOwnerMatch === null ? ["Подтвердите совпадение данных владельца"] : []),
                    ...(docsVinMatch === null ? ["Подтвердите совпадение VIN-номера"] : []),
                    ...(docsEngineMatch === null ? ["Подтвердите совпадение модели двигателя"] : []),
                  ]}
                />
              </div>
            )}

            {step.id === "media" && (
              <div className="space-y-4 overflow-y-auto pb-24">
                <SortableMediaGallery
                  items={mediaFiles}
                  onChange={setMediaFiles}
                  onAddFiles={(groupName) => {
                    pendingMediaGroupRef.current = groupName;
                    mediaFileRef.current?.click();
                  }}
                />

                <input
                  ref={mediaFileRef}
                  type="file"
                  accept="image/*,image/heic,image/heif,video/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const rawFiles = Array.from(e.target.files ?? []);
                    const groupName = pendingMediaGroupRef.current;
                    pendingMediaGroupRef.current = null;

                    const { files, failedHeicNames } = await convertHeicFiles(rawFiles);
                    if (failedHeicNames.length > 0) {
                      window.alert(`Не удалось обработать HEIC: ${failedHeicNames.join(", ")}. Сохраните фото как JPEG и попробуйте снова.`);
                    }

                    if (files.length === 0) {
                      e.target.value = "";
                      return;
                    }

                    const newMediaItems: MediaItem[] = [];
                    let processed = 0;
                    const finalize = () => {
                      if (processed !== files.length) return;
                      if (groupName) {
                        setMediaFiles((prev) => {
                          const existingGroup = prev.find((item) => item.groupName === groupName && item.children);
                          if (existingGroup) {
                            return prev.map((item) =>
                              item.id === existingGroup.id
                                ? { ...item, children: [...(item.children || []), ...newMediaItems] }
                                : item
                            );
                          }
                          const group: MediaItem = {
                            id: `group-${Date.now()}`,
                            url: newMediaItems[0]?.url || "",
                            type: newMediaItems[0]?.type || "image",
                            children: newMediaItems,
                            groupName,
                          };
                          return [...prev, group];
                        });
                      } else {
                        setMediaFiles((prev) => [...prev, ...newMediaItems]);
                      }
                    };

                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          const fileType: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
                          newMediaItems.push({
                            id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            url: reader.result,
                            type: fileType,
                          });
                        }
                        processed++;
                        finalize();
                      };
                      reader.onerror = () => {
                        console.error("FileReader failed for", file.name);
                        processed++;
                        finalize();
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />

                {/* Paint thickness ranges — body */}
                {(() => {
                  const filledCount = Object.values(inspections).filter(i => i.paintThickness).length;
                  return (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Paintbrush className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Разброс толщины ЛКП — кузов</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            {bodyPaintEditing ? (
                              <>
                                <EditablePaintValue value={bodyPaintFrom} min={50} max={bodyPaintTo} className="text-2xl" onChange={setBodyPaintFrom} />
                                <span className="text-muted-foreground">–</span>
                                <EditablePaintValue value={bodyPaintTo} min={bodyPaintFrom} max={1500} className="text-2xl" onChange={setBodyPaintTo} />
                              </>
                            ) : (
                              <>
                                <span className="text-2xl font-bold text-foreground tracking-tight">{bodyPaintFrom}–{bodyPaintTo}</span>
                                <span className="text-xs text-muted-foreground">мкм</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setBodyPaintEditing(!bodyPaintEditing)}
                            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            {bodyPaintEditing ? "Готово" : "Изменить"}
                          </button>
                        </div>
                        {filledCount > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            📊 На основе {filledCount} из 15 элементов
                          </p>
                        ) : (bodyPaintFrom !== 80 || bodyPaintTo !== 200) ? (
                          <p className="text-[11px] text-muted-foreground">
                            ✏️ Задано вручную
                          </p>
                        ) : (
                          <p className="text-[11px] text-[hsl(var(--warning)/0.85)]">
                            ⚠️ Нет данных из осмотра — задайте вручную
                          </p>
                        )}
                        {bodyPaintEditing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-1"
                          >
                            <Slider
                              min={50}
                              max={1500}
                              step={50}
                              value={[bodyPaintFrom, bodyPaintTo]}
                              onValueChange={([from, to]) => {
                                setBodyPaintFrom(from);
                                setBodyPaintTo(to);
                              }}
                              minStepsBetweenThumbs={1}
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
                              <span>50 мкм</span>
                              <span>1500 мкм</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Paint thickness ranges — structural */}
                {(() => {
                  const filledCount = Object.values(bodyStructuralInspections).filter(i => i.paintThickness).length;
                  return (
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Paintbrush className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Разброс толщины ЛКП — силовые</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            {structPaintEditing ? (
                              <>
                                <EditablePaintValue value={structPaintFrom} min={50} max={structPaintTo} className="text-2xl" onChange={setStructPaintFrom} />
                                <span className="text-muted-foreground">–</span>
                                <EditablePaintValue value={structPaintTo} min={structPaintFrom} max={1500} className="text-2xl" onChange={setStructPaintTo} />
                              </>
                            ) : (
                              <>
                                <span className="text-2xl font-bold text-foreground tracking-tight">{structPaintFrom}–{structPaintTo}</span>
                                <span className="text-xs text-muted-foreground">мкм</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setStructPaintEditing(!structPaintEditing)}
                            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            {structPaintEditing ? "Готово" : "Изменить"}
                          </button>
                        </div>
                        {filledCount > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            📊 На основе {filledCount} из {STRUCTURAL_PARTS.length + UNDERCARRIAGE_PARTS.length} элементов
                          </p>
                        ) : (structPaintFrom !== 80 || structPaintTo !== 200) ? (
                          <p className="text-[11px] text-muted-foreground">
                            ✏️ Задано вручную
                          </p>
                        ) : (
                          <p className="text-[11px] text-[hsl(var(--warning)/0.85)]">
                            ⚠️ Нет данных из осмотра — задайте вручную
                          </p>
                        )}
                        {structPaintEditing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-1"
                          >
                            <Slider
                              min={50}
                              max={1500}
                              step={50}
                              value={[structPaintFrom, structPaintTo]}
                              onValueChange={([from, to]) => {
                                setStructPaintFrom(from);
                                setStructPaintTo(to);
                              }}
                              minStepsBetweenThumbs={1}
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
                              <span>50 мкм</span>
                              <span>1500 мкм</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const requiredGroups: { key: import("@/components/SortableMediaGallery").MediaGroupName; label: string }[] = [
                    { key: "body", label: "Кузов" },
                    { key: "glass", label: "Остекление" },
                    { key: "underhood", label: "Подкапотное пространство" },
                    { key: "interior", label: "Салон" },
                  ];
                  const missingGroups = requiredGroups.filter(g => !mediaFiles.some(f => f.groupName === g.key && f.children && f.children.length > 0));
                  const allFilled = missingGroups.length === 0;
                  const filledCount = requiredGroups.length - missingGroups.length;

                  return (
                    <div className="space-y-3">
                      <StepCTA
                        onClick={goNext}
                        disabled={!allFilled}
                        reasons={missingGroups.map(g => `Добавьте фото: ${g.label}`)}
                      />
                    </div>
                  );
                })()}
              </div>
            )}







            {step.id === "test_drive" && (
              <div className="space-y-4 overflow-y-auto pb-24">
                {/* Conducted question */}
                <div className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-4">
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">Тест-драйв проводился?</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setTdConducted(true)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        tdConducted === true
                          ? "bg-[hsl(var(--success))] text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >Да</button>
                    <button
                      type="button"
                      onClick={() => setTdConducted(false)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        tdConducted === false
                          ? "bg-destructive text-destructive-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >Нет</button>
                  </div>
                </div>

                {tdConducted === true && (
                  <TestDriveSections
                    sections={[
                      { key: "engine", label: "🔧 Двигатель", ok: tdEngineOk, setOk: setTdEngineOk, tags: tdEngineTags, setTags: setTdEngineTags, allTags: TD_ENGINE_TAGS, okLabel: "Двигатель работает исправно" },
                      { key: "gearbox", label: "⚙️ КПП", ok: tdGearboxOk, setOk: setTdGearboxOk, tags: tdGearboxTags, setTags: setTdGearboxTags, allTags: TD_GEARBOX_TAGS, okLabel: "КПП работает исправно" },
                      { key: "steering", label: "🎯 Рулевое управление", ok: tdSteeringOk, setOk: setTdSteeringOk, tags: tdSteeringTags, setTags: setTdSteeringTags, allTags: TD_STEERING_TAGS, okLabel: "Рулевое без замечаний" },
                      { key: "ride", label: "🛣️ Подвеска на ходу", ok: tdRideOk, setOk: setTdRideOk, tags: tdRideTags, setTags: setTdRideTags, allTags: TD_RIDE_TAGS, okLabel: "Подвеска без замечаний на ходу" },
                      { key: "brake_ride", label: "🛑 Тормоза на ходу", ok: tdBrakeRideOk, setOk: setTdBrakeRideOk, tags: tdBrakeRideTags, setTags: setTdBrakeRideTags, allTags: TD_BRAKE_RIDE_TAGS, okLabel: "Тормоза работают исправно" },
                    ]}
                    getTags={getTags}
                    addTag={addTag}
                    removeTag={removeTag}
                    getDisabledDefaults={getDisabledDefaults}
                    toggleDefault={toggleDefault}
                    getOrder={getOrder}
                    setOrder={setOrder}
                    tdNote={tdNote}
                    setTdNote={setTdNote}
                    goNext={goNext}
                    hasData={(tdEngineOk || tdEngineTags.length > 0) && (tdGearboxOk || tdGearboxTags.length > 0) && (tdSteeringOk || tdSteeringTags.length > 0) && (tdRideOk || tdRideTags.length > 0) && (tdBrakeRideOk || tdBrakeRideTags.length > 0)}
                  />
                )}

                {tdConducted === false && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Заметка</p>
                    </div>
                    <textarea
                      value={tdNote}
                      onChange={(e) => setTdNote(e.target.value)}
                      placeholder="Причина отсутствия тест-драйва..."
                      className="w-full min-h-[80px] rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/30 focus:border-primary/20 resize-none transition-all"
                    />
                  </div>
                )}

                {(() => {
                  const tdDisabled = tdConducted === null || (tdConducted === true && !((tdEngineOk || tdEngineTags.length > 0) && (tdGearboxOk || tdGearboxTags.length > 0) && (tdSteeringOk || tdSteeringTags.length > 0) && (tdRideOk || tdRideTags.length > 0) && (tdBrakeRideOk || tdBrakeRideTags.length > 0)));
                  const tdReasons: string[] = [];
                  if (tdConducted === null) tdReasons.push("Выберите, проводился ли тест-драйв");
                  else if (tdConducted === true) {
                    if (!(tdEngineOk || tdEngineTags.length > 0)) tdReasons.push("Проверьте двигатель");
                    if (!(tdGearboxOk || tdGearboxTags.length > 0)) tdReasons.push("Проверьте КПП");
                    if (!(tdSteeringOk || tdSteeringTags.length > 0)) tdReasons.push("Проверьте рулевое управление");
                    if (!(tdRideOk || tdRideTags.length > 0)) tdReasons.push("Проверьте подвеску на ходу");
                    if (!(tdBrakeRideOk || tdBrakeRideTags.length > 0)) tdReasons.push("Проверьте тормоза на ходу");
                  }
                  return (
                    <StepCTA
                      onClick={goNext}
                      disabled={tdDisabled}
                      reasons={tdReasons}
                    />
                  );
                })()}
              </div>
            )}



            {step.id === "summary" && (() => {
              const summaryInput = buildSummaryInputFromState({
                vin, vinUnreadable, plate, carResult, mileage, mileageMatchesClaimed, adLink,
                engineVolume, engineType, gearboxType, driveType, color, trim, ownersCount,
                inspectionCity, inspectionDate: inspectionDate.toISOString(),
                merged, bodyGeometryOk, bodyNote,
                bodyPaintFrom, bodyPaintTo, structPaintFrom, structPaintTo,
                glassNote, underhoodNote, interiorNote, wheelsNote,
                docsOwnerMatch, docsVinMatch, docsEngineMatch, mediaFiles,
                tdConducted, tdEngineOk, tdEngineTags, tdGearboxOk, tdGearboxTags,
                tdSteeringOk, tdSteeringTags, tdRideOk, tdRideTags,
                tdBrakeRideOk, tdBrakeRideTags, tdNote, diagnosticNote,
                diagnosticFilesCount: diagnosticFiles.length,
                legalLoaded, legalSkipped,
              });
              const summary = generateSummary(summaryInput);
              const verdictColor = summary.verdict === "recommended"
                ? "hsl(var(--primary))"
                : summary.verdict === "with_reservations"
                ? "hsl(var(--warning))"
                : "hsl(var(--destructive))";
              const verdictBg = summary.verdict === "recommended"
                ? "hsl(var(--primary)/0.08)"
                : summary.verdict === "with_reservations"
                ? "hsl(var(--warning)/0.08)"
                : "hsl(var(--destructive)/0.08)";
              const statusColors = { ok: "text-primary", warn: "text-[hsl(var(--warning))]", bad: "text-destructive" };
              const statusIcons = { ok: "✓", warn: "⚠", bad: "✗" };

              const severityColors = {
                critical: "border-destructive/30 bg-destructive/5",
                warning: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5",
                info: "border-border/60 bg-card",
              };
              const severityDot = {
                critical: "bg-destructive",
                warning: "bg-[hsl(var(--warning))]",
                info: "bg-muted-foreground/40",
              };

              return (
                <div className="space-y-4 overflow-y-auto pb-24">

                  {/* Sections — shared renderer */}
                  {(() => {
                    const summaryMediaGroups: Record<string, MediaItem[]> = {};
                    for (const group of mediaFiles) {
                      if (group.groupName && group.children && group.children.length > 0) {
                        summaryMediaGroups[group.groupName] = group.children;
                      }
                    }
                    return (
                      <SummarySections
                        sections={summary.sections}
                        mediaGroups={summaryMediaGroups}
                        onOpenMediaRef={(ref) => {
                          const group = mediaFiles.find(f => f.groupName === ref.groupName && f.children && f.children.length > 0);
                          if (!group?.children) return;
                          const idx = group.children.findIndex(c => c.id === ref.mediaId);
                          setSummaryLightbox({
                            items: group.children,
                            index: idx >= 0 ? idx : 0,
                            groupName: ref.groupName as import("@/components/SortableMediaGallery").MediaGroupName,
                          });
                        }}
                        onOpenCollage={(items, index, groupName) =>
                          setSummaryLightbox({ items, index, groupName })
                        }
                      />
                    );
                  })()}

                  <SummaryNoteCard note={summaryNote} />

                  {/* 2. Итог специалиста */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✍️</span>
                        <span className="text-sm font-semibold">Итог специалиста</span>
                      </div>
                      {dictation.isSupported && (
                        <button
                          type="button"
                          onClick={dictation.toggle}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            dictation.isListening
                              ? "bg-destructive/10 text-destructive animate-pulse"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {dictation.isListening ? (
                            <>
                              <MicOff className="h-3.5 w-3.5" />
                              Остановить
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5" />
                              Надиктовать
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>🔒</span> Видна только заказчику
                    </p>
                    {dictation.isListening && (
                      <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                        </span>
                        Говорите... Текст добавится автоматически
                      </p>
                    )}
                    <textarea
                      value={expertConclusion}
                      onChange={(e) => setExpertConclusion(e.target.value)}
                      placeholder="Ваш вывод, рекомендации, условия сделки, комментарий для клиента..."
                      className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    />
                    {expertConclusion.trim().length > 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          const text = expertConclusion.trim();
                          const sentences = text
                            .replace(/([.!?])\s*/g, "$1\n")
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
                          setExpertConclusion(paragraphs.join("\n\n"));
                        }}
                        className="flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                      >
                        <span>✨</span> Отформатировать с ИИ
                      </button>
                    )}
                  </motion.div>

                  {(() => {
                    // Check required sections are filled
                    const hasVehicle = !!(vin || vinUnreadable || carResult);
                    const hasParams = !!mileage;
                    const hasDocs = docsOwnerMatch !== null && docsVinMatch !== null && docsEngineMatch !== null;
                    const hasLegal = true; // Юр. проверка необязательна
                    const requiredMediaGroups: import("@/components/SortableMediaGallery").MediaGroupName[] = ["body", "glass", "underhood", "interior"];
                    const mediaGroupsFilled = requiredMediaGroups.filter(g => mediaFiles.some(f => f.groupName === g && f.children && f.children.length > 0));
                    const mediaGroupsMissing = requiredMediaGroups.filter(g => !mediaGroupsFilled.includes(g));
                    const hasMedia = mediaGroupsMissing.length === 0;
                    const hasTd = tdConducted !== null;
                    const hasExpertConclusion = expertConclusion.trim().length > 0;
                    const allRequired = hasVehicle && hasParams && hasDocs && hasLegal && hasMedia && hasTd && hasExpertConclusion;

                    const mediaGroupLabels: Record<string, string> = {
                      body: "Кузов", glass: "Остекление", lighting: "Светотехника",
                      underhood: "Подкапотное пространство", interior: "Салон",
                      diagnostics: "Компьютерная диагностика", structural: "Силовые элементы кузова",
                      wheels: "Колёса и тормозные механизмы",
                    };

                    const goToStep = (stepId: string) => {
                      const idx = steps.findIndex(s => s.id === stepId);
                      if (idx >= 0) {
                        setDirection(idx > currentStep ? 1 : -1);
                        setCurrentStep(idx);
                        setActiveSection(stepId);
                      }
                    };

                    const missing: import("@/components/StepCTA").StepCTAReason[] = [];
                    if (!hasVehicle) missing.push({ text: "Автомобиль — укажите VIN или марку/модель", onClick: () => goToStep("vehicle") });
                    if (!hasParams) missing.push({ text: "Параметры — укажите пробег", onClick: () => goToStep("params") });
                    if (!hasDocs) missing.push({ text: "Сверка документов — ответьте на все вопросы", onClick: () => goToStep("docs_check") });
                    if (!hasTd) missing.push({ text: "Тест-драйв — отметьте проведение", onClick: () => goToStep("test_drive") });
                    mediaGroupsMissing.forEach(g => missing.push({ text: `Осмотр — добавьте фото: ${mediaGroupLabels[g] ?? g}`, onClick: () => goToStep("media") }));
                    if (!hasExpertConclusion) missing.push({ text: "Итог специалиста — заполните заключение" });

                    return (
                      <>
                        <StepCTA
                          onClick={() => {
                            if (!allRequired) return;
                            setShowUploadDialog(true);
                          }}
                          disabled={!allRequired}
                          reasons={missing}
                          label={allRequired ? "Завершить отчёт" : "Заполните обязательные разделы"}
                          icon="done"
                        />
                        <UploadProgressDialog
                          open={showUploadDialog}
                          onComplete={() => {
                            try {
                              const draft = buildDraft();
                              finalizedRef.current = true;
                              finalizeDraft(draft);
                              navigate("/");
                            } catch (err) {
                              finalizedRef.current = false;
                              setShowUploadDialog(false);
                              console.error("Ошибка завершения отчёта:", err);
                              const isQuota = err instanceof DOMException &&
                                (err.name === "QuotaExceededError" || err.code === 22);
                              alert(
                                isQuota
                                  ? "Недостаточно места в хранилище. Удалите старые отчёты или черновики и попробуйте снова."
                                  : "Не удалось сохранить отчёт. Попробуйте ещё раз."
                              );
                            }
                          }}
                          onError={() => setShowUploadDialog(false)}
                        />
                      </>
                    );
                  })()}
                </div>
              );
            })()}

          </div>
        </div>

        <CarPicker
          open={carPickerOpen}
          onOpenChange={setCarPickerOpen}
          onSelect={handleCarSelect}
          initialBrand={carResult?.brand}
          initialModel={carResult?.model}
          initialRestylingId={carResult?.restyling?.id}
        />


        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Черновик с таким VIN уже есть</AlertDialogTitle>
              <AlertDialogDescription>
                Найден незавершённый отчёт с VIN {duplicateDraft?.vin}. Хотите продолжить его или начать заново?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={handleContinueExistingDraft} className="w-full">
                Продолжить черновик
              </AlertDialogAction>
              <AlertDialogCancel onClick={handleStartFresh} className="w-full">
                Заполнить заново
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <MediaLightbox state={summaryLightbox} onClose={() => setSummaryLightbox(null)} />
      </div>
    );
  }

  // Main sections list
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pb-3 pt-12">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Новый отчёт</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {steps.map((step, stepIndex) => {
          const value = completedValues[step.id];
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveSection(step.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:bg-accent/5 transition-colors active:scale-[0.98]"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {value ? <Check className="h-3.5 w-3.5" /> : stepIndex + 1}
              </span>
              <div className="flex-1 text-left min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                {value && <p className="text-xs text-primary mt-0.5 truncate">{value}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Черновик с таким VIN уже есть</AlertDialogTitle>
            <AlertDialogDescription>
              Найден незавершённый отчёт с VIN {duplicateDraft?.vin}. Хотите продолжить его или начать заново?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleContinueExistingDraft} className="w-full">
              Продолжить черновик
            </AlertDialogAction>
            <AlertDialogCancel onClick={handleStartFresh} className="w-full">
              Заполнить заново
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MediaLightbox state={summaryLightbox} onClose={() => setSummaryLightbox(null)} />
    </div>
  );
};

export default CreateReport;
