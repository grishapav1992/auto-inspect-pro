import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Inspection, MediaItem, CarInfo, BodyPartData, LegalCheckItem, DiagnosticItem, FinalVerdictData, createNewInspection, InspectionSection } from '@/types/inspection';
import { saveImage, deleteImages as deleteImagesFromDB } from '@/lib/mediaDB';

interface InspectionStore {
  inspections: Inspection[];
  activeInspectionId: string | null;
  customDamageTags: string[];
  hiddenDefaultTags: string[];
  tagPriorities: string[]; // ordered list of prioritized tags (shown first)
  addCustomDamageTag: (tag: string) => void;
  removeCustomDamageTag: (tag: string) => void;
  toggleHiddenDefaultTag: (tag: string) => void;
  setTagPriorities: (tags: string[]) => void;
  
  getActiveInspection: () => Inspection | undefined;
  createInspection: () => string;
  deleteInspection: (id: string) => void;
  setActiveInspection: (id: string | null) => void;
  
  addMedia: (items: (MediaItem & { dataUrl: string })[]) => Promise<void>;
  updateMedia: (mediaId: string, updates: Partial<MediaItem>) => void;
  removeMedia: (mediaIds: string[]) => void;
  bulkAssignMedia: (mediaIds: string[], updates: Partial<MediaItem>) => void;
  
  updateCarInfo: (info: Partial<CarInfo>) => void;
  updateBodyPart: (part: string, data: Partial<BodyPartData>) => void;
  updateLegalCheck: (index: number, item: Partial<LegalCheckItem>) => void;
  updateDiagnostic: (index: number, item: Partial<DiagnosticItem>) => void;
  updateTestDrive: (index: number, item: Partial<DiagnosticItem>) => void;
  updateBodyPaintThickness: (value: string) => void;
  updateFinalVerdict: (data: Partial<FinalVerdictData>) => void;
  toggleOptionalSection: (section: InspectionSection) => void;
}

export const useInspectionStore = create<InspectionStore>()(
  persist(
    (set, get) => ({
      inspections: [],
      activeInspectionId: null,
      customDamageTags: [] as string[],
      hiddenDefaultTags: [] as string[],
      tagPriorities: [] as string[],
      
      addCustomDamageTag: (tag: string) => set(state => ({
        customDamageTags: state.customDamageTags.includes(tag) ? state.customDamageTags : [...state.customDamageTags, tag],
      })),

      removeCustomDamageTag: (tag: string) => set(state => ({
        customDamageTags: state.customDamageTags.filter(t => t !== tag),
        tagPriorities: state.tagPriorities.filter(t => t !== tag),
      })),

      toggleHiddenDefaultTag: (tag: string) => set(state => ({
        hiddenDefaultTags: state.hiddenDefaultTags.includes(tag)
          ? state.hiddenDefaultTags.filter(t => t !== tag)
          : [...state.hiddenDefaultTags, tag],
      })),

      setTagPriorities: (tags: string[]) => set({ tagPriorities: tags }),
      
      getActiveInspection: () => {
        const { inspections, activeInspectionId } = get();
        return inspections.find(i => i.id === activeInspectionId);
      },
      
      createInspection: () => {
        const newInspection = createNewInspection();
        set(state => ({
          inspections: [newInspection, ...state.inspections],
          activeInspectionId: newInspection.id,
        }));
        return newInspection.id;
      },
      
      deleteInspection: (id) => {
        const inspection = get().inspections.find(i => i.id === id);
        if (inspection) {
          deleteImagesFromDB(inspection.media.map(m => m.id)).catch(console.error);
        }
        set(state => ({
          inspections: state.inspections.filter(i => i.id !== id),
          activeInspectionId: state.activeInspectionId === id ? null : state.activeInspectionId,
        }));
      },
      
      setActiveInspection: (id) => set({ activeInspectionId: id }),
      
      addMedia: async (items) => {
        await Promise.all(items.map(item => saveImage(item.id, item.dataUrl)));
        const metaItems: MediaItem[] = items.map(({ dataUrl, ...meta }) => meta);
        set(state => ({
          inspections: state.inspections.map(i =>
            i.id === state.activeInspectionId
              ? { ...i, media: [...i.media, ...metaItems] }
              : i
          ),
        }));
      },
      
      updateMedia: (mediaId, updates) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, media: i.media.map(m => m.id === mediaId ? { ...m, ...updates } : m) }
            : i
        ),
      })),
      
      removeMedia: (mediaIds) => {
        deleteImagesFromDB(mediaIds).catch(console.error);
        set(state => ({
          inspections: state.inspections.map(i =>
            i.id === state.activeInspectionId
              ? { ...i, media: i.media.filter(m => !mediaIds.includes(m.id)) }
              : i
          ),
        }));
      },
      
      bulkAssignMedia: (mediaIds, updates) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, media: i.media.map(m => mediaIds.includes(m.id) ? { ...m, ...updates } : m) }
            : i
        ),
      })),
      
      updateCarInfo: (info) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, carInfo: { ...i.carInfo, ...info } }
            : i
        ),
      })),
      
      updateBodyPart: (part, data) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, bodyParts: { ...i.bodyParts, [part]: { ...(i.bodyParts[part] || {}), ...data } } }
            : i
        ),
      })),
      
      updateLegalCheck: (index, item) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, legalChecks: i.legalChecks.map((c, idx) => idx === index ? { ...c, ...item } : c) }
            : i
        ),
      })),
      
      updateDiagnostic: (index, item) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, diagnostics: i.diagnostics.map((d, idx) => idx === index ? { ...d, ...item } : d) }
            : i
        ),
      })),

      updateTestDrive: (index, item) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, testDrive: (i.testDrive || []).map((d, idx) => idx === index ? { ...d, ...item } : d) }
            : i
        ),
      })),
      
      updateBodyPaintThickness: (value) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, bodyPaintThickness: value }
            : i
        ),
      })),

      updateFinalVerdict: (data) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, finalVerdict: { ...i.finalVerdict, ...data } }
            : i
        ),
      })),

      toggleOptionalSection: (section) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? {
                ...i,
                enabledOptionalSections: (i.enabledOptionalSections || []).includes(section)
                  ? (i.enabledOptionalSections || []).filter(s => s !== section)
                  : [...(i.enabledOptionalSections || []), section],
              }
            : i
        ),
      })),
    }),
    { name: 'car-inspection-storage' }
  )
);
