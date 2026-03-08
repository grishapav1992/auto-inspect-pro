import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Inspection, MediaItem, CarInfo, BodyPartData, LegalCheckItem, DiagnosticItem, FinalVerdictData, createNewInspection, InspectionSection, CustomSection } from '@/types/inspection';
import { saveImage, deleteImages as deleteImagesFromDB } from '@/lib/mediaDB';

interface InspectionStore {
  inspections: Inspection[];
  activeInspectionId: string | null;
  customDamageTags: string[];
  addCustomDamageTag: (tag: string) => void;
  
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
  addCustomSection: (section: CustomSection) => void;
  updateCustomSection: (sectionId: string, updates: Partial<CustomSection>) => void;
  removeCustomSection: (sectionId: string) => void;
  addCustomSectionTag: (sectionId: string, tag: string) => void;
}

export const useInspectionStore = create<InspectionStore>()(
  persist(
    (set, get) => ({
      inspections: [],
      activeInspectionId: null,
      customDamageTags: [] as string[],
      
      addCustomDamageTag: (tag: string) => set(state => ({
        customDamageTags: state.customDamageTags.includes(tag) ? state.customDamageTags : [...state.customDamageTags, tag],
      })),
      
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

      addCustomSection: (section) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, customSections: [...(i.customSections || []), section] }
            : i
        ),
      })),

      updateCustomSection: (sectionId, updates) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, customSections: (i.customSections || []).map(s => s.id === sectionId ? { ...s, ...updates } : s) }
            : i
        ),
      })),

      removeCustomSection: (sectionId) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, customSections: (i.customSections || []).filter(s => s.id !== sectionId), media: i.media.filter(m => m.section !== `custom-${sectionId}`) }
            : i
        ),
      })),

      addCustomSectionTag: (sectionId, tag) => set(state => ({
        inspections: state.inspections.map(i =>
          i.id === state.activeInspectionId
            ? { ...i, customSections: (i.customSections || []).map(s => s.id === sectionId ? { ...s, customTags: s.customTags.includes(tag) ? s.customTags : [...s.customTags, tag] } : s) }
            : i
        ),
      })),
    }),
    { name: 'car-inspection-storage' }
  )
);
