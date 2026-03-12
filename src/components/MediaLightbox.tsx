/**
 * MediaLightbox — unified overlay host for MediaPresentation lightbox.
 * Replaces duplicated createPortal + AnimatePresence patterns in
 * CreateReport and ReportDetail.
 */

import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { MediaPresentation, type MediaItem, type MediaGroupName } from "@/components/SortableMediaGallery";

export interface LightboxState {
  items: MediaItem[];
  index: number;
  groupName?: MediaGroupName;
}

interface MediaLightboxProps {
  state: LightboxState | null;
  onClose: () => void;
  onNote?: (itemId: string) => void;
}

export function MediaLightbox({ state, onClose, onNote }: MediaLightboxProps) {
  return createPortal(
    <AnimatePresence>
      {state && (
        <MediaPresentation
          items={state.items}
          initialIndex={state.index}
          onClose={onClose}
          groupName={state.groupName}
          onNote={onNote}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
