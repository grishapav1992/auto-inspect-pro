/**
 * checklistGenerator.ts
 *
 * Generates a checklist of gaps, missing data, and items requiring
 * additional attention — aimed at the inspector (подборщик), not the buyer.
 * Highlights unfilled sections, skipped checks, and areas that need
 * clarification or supplementary inspection.
 */

import type { PartInspection } from "@/types/inspection";
import {
  CAR_PARTS,
  STRUCTURAL_PARTS,
  UNDERCARRIAGE_PARTS,
  GLASS_PARTS,
  DAMAGE_TAG_GROUPS,
} from "@/types/inspection";
import type { SummaryInput } from "@/lib/summaryGenerator";

export interface ChecklistItem {
  emoji: string;
  text: string;
  severity: "info" | "warning" | "critical";
}

/** IDs of tags classified as "serious" from body damage tag groups */
const SERIOUS_TAG_IDS: string[] = DAMAGE_TAG_GROUPS[0].tags.map((t) => t.id);

/**
 * generateChecklist — scans the report for unfilled sections, skipped
 * steps, and data that needs clarification. Returns actionable items
 * for the inspector to complete the report properly.
 */
export function generateChecklist(input: SummaryInput): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // ============================
  // 1. VEHICLE IDENTIFICATION
  // ============================

  /** VIN not provided and not marked as unreadable */
  if (!input.vin && !input.vinUnreadable) {
    items.push({ emoji: "🔢", text: "VIN не указан — заполните или отметьте как нечитаемый", severity: "critical" });
  }

  /** Mileage not filled */
  if (!input.mileage || input.mileage === "0") {
    items.push({ emoji: "📏", text: "Пробег не указан — зафиксируйте показания одометра", severity: "critical" });
  }

  // ============================
  // 2. DOCUMENT VERIFICATION
  // ============================

  /** None of the document checks were performed */
  if (!input.docsOwnerMatch && !input.docsVinMatch && !input.docsEngineMatch) {
    items.push({ emoji: "📄", text: "Сверка документов не выполнена — проверьте владельца, VIN и модель двигателя", severity: "critical" });
  } else {
    if (!input.docsOwnerMatch) {
      items.push({ emoji: "📄", text: "Не подтверждено совпадение владельца в ПТС — уточните", severity: "warning" });
    }
    if (!input.docsVinMatch) {
      items.push({ emoji: "🔢", text: "VIN не сверен с документами — проверьте соответствие", severity: "warning" });
    }
    if (!input.docsEngineMatch) {
      items.push({ emoji: "🔧", text: "Модель двигателя не сверена с ПТС — дополните проверку", severity: "warning" });
    }
  }

  // ============================
  // 3. LEGAL CHECK
  // ============================

  /** Legal check was skipped entirely */
  if (!input.legalLoaded && !input.legalSkipped) {
    items.push({ emoji: "⚖️", text: "Юридическая проверка не выполнена — запустите проверку или отметьте как пропущенную", severity: "warning" });
  } else if (input.legalSkipped && !input.legalLoaded) {
    items.push({ emoji: "⚖️", text: "Юридическая проверка пропущена — рекомендуется выполнить до завершения отчёта", severity: "info" });
  }

  // ============================
  // 4. BODY INSPECTION GAPS
  // ============================

  /** Count body parts that were not inspected at all */
  const bodyInspected = Object.values(input.inspections);
  const bodyNotInspected = CAR_PARTS.length - bodyInspected.length;
  if (bodyNotInspected > 0) {
    const missing = CAR_PARTS
      .filter((p) => !input.inspections[p.id])
      .map((p) => p.label);
    if (bodyNotInspected <= 4) {
      items.push({ emoji: "🚗", text: `Не осмотрены элементы кузова: ${missing.join(", ")}`, severity: "warning" });
    } else {
      items.push({ emoji: "🚗", text: `Не осмотрено ${bodyNotInspected} из ${CAR_PARTS.length} элементов кузова — завершите осмотр ЛКП`, severity: "critical" });
    }
  }


  /** Body parts with serious tags but no note — inspector should add context */
  const seriousBodyParts = bodyInspected.filter((p) => p.tags.some((t) => SERIOUS_TAG_IDS.includes(t)));
  const seriousWithoutNote = seriousBodyParts.filter((p) => !p.note && !(p.audioRecordings && p.audioRecordings.length > 0));
  if (seriousWithoutNote.length > 0) {
    items.push({ emoji: "✏️", text: `Серьёзные дефекты без заметки: ${seriousWithoutNote.map((p) => p.label).join(", ")} — добавьте описание`, severity: "warning" });
  }

  // ============================
  // 5. STRUCTURAL ELEMENTS (optional)
  // ============================

  const totalStructural = STRUCTURAL_PARTS.length + UNDERCARRIAGE_PARTS.length;
  const structInspectedCount = Object.keys(input.bodyStructuralInspections).length + Object.keys(input.bodyUndercarriageInspections).length;
  if (structInspectedCount > 0 && structInspectedCount < totalStructural) {
    const missing = totalStructural - structInspectedCount;
    items.push({ emoji: "🏗️", text: `Не осмотрено ${missing} из ${totalStructural} структурных элементов — дополните при необходимости`, severity: "info" });
  }

  // ============================
  // 6. GLASS GAPS
  // ============================

  const glassInspectedCount = Object.keys(input.glassInspections).length;
  if (glassInspectedCount === 0) {
    items.push({ emoji: "🪟", text: "Остекление не проверено — осмотрите стёкла и зеркала", severity: "warning" });
  } else if (glassInspectedCount < GLASS_PARTS.length) {
    const missing = GLASS_PARTS
      .filter((p) => !input.glassInspections[p.id])
      .map((p) => p.label);
    if (missing.length <= 3) {
      items.push({ emoji: "🪟", text: `Не осмотрены: ${missing.join(", ")}`, severity: "info" });
    } else {
      items.push({ emoji: "🪟", text: `Не осмотрено ${missing.length} из ${GLASS_PARTS.length} элементов остекления`, severity: "warning" });
    }
  }

  // ============================
  // 7. UNDERHOOD GAPS
  // ============================

  const underhoodInspected = Object.keys(input.underhoodInspections).length;
  if (underhoodInspected === 0) {
    items.push({ emoji: "🔧", text: "Подкапотное пространство не проверено — выполните осмотр", severity: "critical" });
  }

  // ============================
  // 8. INTERIOR GAPS
  // ============================

  const interiorInspected = Object.keys(input.interiorInspections).length;
  if (interiorInspected === 0) {
    items.push({ emoji: "💺", text: "Состояние салона не заполнено — добавьте фото и заметки", severity: "warning" });
  }

  // ============================
  // 9. WHEELS (optional)
  // ============================

  const wheelsInspected = Object.keys(input.wheelsInspections).length;
  if (wheelsInspected === 0 && input.hasWheelsPhotos) {
    items.push({ emoji: "🛞", text: "Колёса не проверены — добавьте заметки к фото", severity: "info" });
  }

  // ============================
  // 10. DIAGNOSTICS GAPS
  // ============================

  if (input.diagnosticFilesCount === 0 && !input.diagnosticNote) {
    items.push({ emoji: "💻", text: "Компьютерная диагностика не выполнена — загрузите файлы или добавьте заметку", severity: "warning" });
  }

  // ============================
  // 11. TEST DRIVE GAPS
  // ============================

  const tdNotDone =
    !input.tdEngineOk && input.tdEngineTags.length === 0 &&
    !input.tdGearboxOk && input.tdGearboxTags.length === 0 &&
    !input.tdSteeringOk && input.tdSteeringTags.length === 0 &&
    !input.tdRideOk && input.tdRideTags.length === 0 &&
    !input.tdBrakeRideOk && input.tdBrakeRideTags.length === 0;

  if (tdNotDone) {
    items.push({ emoji: "🏁", text: "Тест-драйв не проводился — заполните результаты поездки", severity: "critical" });
  } else {
    if (!input.tdEngineOk && input.tdEngineTags.length === 0) {
      items.push({ emoji: "🔥", text: "Двигатель на ходу не проверен — дополните", severity: "info" });
    }
    if (!input.tdGearboxOk && input.tdGearboxTags.length === 0) {
      items.push({ emoji: "⚙️", text: "КПП на ходу не проверена — дополните", severity: "info" });
    }
    if (!input.tdSteeringOk && input.tdSteeringTags.length === 0) {
      items.push({ emoji: "🎯", text: "Рулевое не проверено на ходу — дополните", severity: "info" });
    }
    if (!input.tdRideOk && input.tdRideTags.length === 0) {
      items.push({ emoji: "🛣️", text: "Подвеска не проверена на ходу — дополните", severity: "info" });
    }
    if (!input.tdBrakeRideOk && input.tdBrakeRideTags.length === 0) {
      items.push({ emoji: "🛑", text: "Тормоза не проверены на ходу — дополните", severity: "warning" });
    }
  }

  // ============================
  // 12. MISSING NOTES
  // ============================

  /** Warn if there are issues found but no general note for key sections */
  if (!input.bodyNote && seriousBodyParts.length > 0) {
    items.push({ emoji: "📝", text: "Нет общей заметки по кузову при наличии серьёзных дефектов — добавьте комментарий", severity: "info" });
  }
  if (!input.tdNote && !tdNotDone && (input.tdEngineTags.length > 0 || input.tdGearboxTags.length > 0 || input.tdBrakeRideTags.length > 0)) {
    items.push({ emoji: "📝", text: "Нет заметки по тест-драйву при наличии замечаний — добавьте описание", severity: "info" });
  }

  // ============================
  // FALLBACK: Report is complete
  // ============================

  if (items.length === 0) {
    items.push({ emoji: "✅", text: "Отчёт заполнен полностью — все разделы проверены, данных достаточно для итога", severity: "info" });
  }

  return items;
}
