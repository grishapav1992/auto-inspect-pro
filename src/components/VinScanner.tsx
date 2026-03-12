import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { convertHeicIfNeeded } from "@/lib/convertHeic";

interface VinScannerProps {
  onResult: (vin: string) => void;
  disabled?: boolean;
}

type CameraState = "idle" | "starting" | "live" | "fallback";

const VIN_CHARS = /[A-HJ-NPR-Z0-9]/g;
const VIN_LENGTH = 17;

function cleanVin(raw: string): string {
  const chars = raw.toUpperCase().match(VIN_CHARS);
  if (!chars) return "";
  return chars.join("").slice(0, VIN_LENGTH);
}

function normalizeOcrText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[|IL]/g, "1")
    .replace(/[OQ]/g, "0");
}

function isValidVin(vin: string): boolean {
  return vin.length === VIN_LENGTH && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

function extractVin(text: string): string | null {
  const normalizedVariants = [
    text.toUpperCase(),
    normalizeOcrText(text),
  ];

  for (const variant of normalizedVariants) {
    const cleaned = variant.replace(/[^A-HJ-NPR-Z0-9]/g, "");
    for (let i = 0; i <= cleaned.length - VIN_LENGTH; i++) {
      const candidate = cleaned.slice(i, i + VIN_LENGTH);
      if (isValidVin(candidate)) return candidate;
    }
  }

  const best = normalizedVariants
    .map(cleanVin)
    .sort((left, right) => right.length - left.length)[0];

  return best && best.length >= 8 ? best : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось подготовить снимок"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function applyGrayscale(imageData: ImageData): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
}

function applyContrast(imageData: ImageData, factor: number): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - 128) * factor + 128, 0, 255);
    d[i + 1] = clamp((d[i + 1] - 128) * factor + 128, 0, 255);
    d[i + 2] = clamp((d[i + 2] - 128) * factor + 128, 0, 255);
  }
}

function applyThreshold(imageData: ImageData, threshold: number): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
}

function applyInvert(imageData: ImageData): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
}

function makeVariantCanvas(
  bitmap: ImageBitmap,
  transforms: Array<(img: ImageData) => void>,
): HTMLCanvasElement {
  const c = createCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (const t of transforms) t(img);
  ctx.putImageData(img, 0, 0);
  return c;
}

async function buildOcrVariants(source: Blob | File): Promise<Blob[]> {
  const bitmap = await createImageBitmap(source);

  const variants = [
    // 0. Original (no processing — best for clean digital text)
    makeVariantCanvas(bitmap, []),
    // 1. Grayscale only
    makeVariantCanvas(bitmap, [applyGrayscale]),
    // 2. High-contrast grayscale
    makeVariantCanvas(bitmap, [applyGrayscale, (img) => applyContrast(img, 2.2)]),
    // 3. Binary threshold
    makeVariantCanvas(bitmap, [applyGrayscale, (img) => applyContrast(img, 1.8), (img) => applyThreshold(img, 140)]),
    // 4. Inverted binary (white text on dark → dark on white)
    makeVariantCanvas(bitmap, [applyGrayscale, (img) => applyContrast(img, 1.8), (img) => applyThreshold(img, 140), applyInvert]),
  ];

  bitmap.close();
  return Promise.all(variants.map(canvasToBlob));
}

async function cropGuideArea(
  video: HTMLVideoElement,
  frame: HTMLDivElement,
  guide: HTMLDivElement,
): Promise<Blob> {
  const frameRect = frame.getBoundingClientRect();
  const guideRect = guide.getBoundingClientRect();

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) {
    throw new Error("Камера не успела подготовить кадр");
  }

  // object-cover scaling: video fills frame, may overflow
  const scale = Math.max(frameRect.width / videoWidth, frameRect.height / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const offsetX = (renderedWidth - frameRect.width) / 2;
  const offsetY = (renderedHeight - frameRect.height) / 2;

  // Guide position relative to frame — NO padding, exact crop
  const guideLeft = guideRect.left - frameRect.left;
  const guideTop = guideRect.top - frameRect.top;

  const sourceX = clamp((guideLeft + offsetX) / scale, 0, videoWidth);
  const sourceY = clamp((guideTop + offsetY) / scale, 0, videoHeight);
  const sourceWidth = clamp(guideRect.width / scale, 1, videoWidth - sourceX);
  const sourceHeight = clamp(guideRect.height / scale, 1, videoHeight - sourceY);

  const canvas = document.createElement("canvas");
  // Upscale for better OCR readability
  canvas.width = Math.max(1200, Math.round(sourceWidth * 2));
  canvas.height = Math.round((canvas.width / sourceWidth) * sourceHeight);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Не удалось подготовить область распознавания");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvasToBlob(canvas);
}

const VinScanner = ({ onResult, disabled }: VinScannerProps) => {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }, []);

  const replacePreview = useCallback((source: Blob | File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!source) {
      setPreview(null);
      return;
    }

    const nextUrl = URL.createObjectURL(source);
    previewUrlRef.current = nextUrl;
    setPreview(nextUrl);
  }, []);

  const reset = useCallback(() => {
    replacePreview(null);
    setResult(null);
    setRawOcrText(null);
    setError(null);
    setProcessing(false);
    setCameraError(null);
  }, [replacePreview]);

  const stopCamera = useCallback(() => {
    releaseStream();
    setCameraState("idle");
  }, [releaseStream]);

  const processImage = useCallback(async (source: Blob | File, extraSources: Array<Blob | File> = []) => {
    reset();
    replacePreview(source);
    setProcessing(true);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: () => {},
      });

      let bestCandidate: string | null = null;
      const allRawTexts: string[] = [];

      const sources = [source, ...extraSources];
      // PSM 8 = single word, PSM 7 = single line, PSM 13 = raw line, PSM 6 = block
      const psmModes = ["8", "7", "13", "6"];

      for (const currentSource of sources) {
        const variants = await buildOcrVariants(currentSource);

        for (const pageSegMode of psmModes) {
          await worker.setParameters({
            tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
            tessedit_pageseg_mode: pageSegMode as any,
          });

          for (const variant of variants) {
            const { data } = await worker.recognize(variant);
            const rawLine = data.text.trim();
            if (rawLine) allRawTexts.push(`[PSM${pageSegMode}] ${rawLine}`);

            const vin = extractVin(data.text);
            if (!vin) continue;

            if (isValidVin(vin)) {
              bestCandidate = vin;
              break;
            }

            if (!bestCandidate || vin.length > bestCandidate.length) {
              bestCandidate = vin;
            }
          }

          if (bestCandidate && isValidVin(bestCandidate)) break;
        }

        if (bestCandidate && isValidVin(bestCandidate)) break;
      }

      await worker.terminate();

      // Always show raw text for debugging
      setRawOcrText(allRawTexts.join("\n") || "Текст не распознан");

      if (bestCandidate) {
        setResult(bestCandidate);
      } else {
        setError("Не удалось распознать VIN. Подведите камеру ближе, избегайте бликов и попробуйте ещё раз.");
      }
    } catch (ocrError) {
      console.error("OCR error:", ocrError);
      setError("Ошибка распознавания. Попробуйте снять VIN ещё раз.");
    } finally {
      setProcessing(false);
    }
  }, [replacePreview, reset]);

  const startCamera = useCallback(async () => {
    reset();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("fallback");
      setCameraError("Камера недоступна. Используйте фото.");
      return;
    }

    setCameraState("starting");
    releaseStream();

    const attempts: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      {
        audio: false,
        video: { facingMode: "environment" },
      },
      {
        audio: false,
        video: true,
      },
    ];

    let lastError: unknown = null;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          throw new Error("Видеоэлемент не найден");
        }

        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const onLoaded = async () => {
            try {
              await video.play();
              resolve();
            } catch (playError) {
              reject(playError);
            }
          };

          video.onloadedmetadata = onLoaded;
        });

        setCameraState("live");
        return;
      } catch (cameraOpenError) {
        lastError = cameraOpenError;
        releaseStream();
      }
    }

    console.error("Camera error:", lastError);
    setCameraState("fallback");
    setCameraError("Не удалось открыть камеру. Используйте фото.");
  }, [releaseStream, reset]);

  useEffect(() => {
    if (!open) return;

    void startCamera();

    return () => {
      releaseStream();
    };
  }, [open, releaseStream, startCamera]);

  useEffect(() => {
    return () => {
      releaseStream();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [releaseStream]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      stopCamera();
      reset();
    }
  }, [reset, stopCamera]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      stopCamera();
      void processImage(file);
    }

    event.target.value = "";
  }, [processImage, stopCamera]);

  const handleCaptureFrame = useCallback(async () => {
    const video = videoRef.current;
    const frame = frameRef.current;
    const guide = guideRef.current;

    if (!video || !frame || !guide) {
      setError("Не удалось подготовить снимок. Попробуйте ещё раз.");
      return;
    }

    try {
      const crop = await cropGuideArea(video, frame, guide);
      stopCamera();
      await processImage(crop);
    } catch (captureError) {
      console.error("Capture error:", captureError);
      setError("Не удалось снять область VIN. Попробуйте ещё раз.");
    }
  }, [processImage, stopCamera]);

  const handleAccept = useCallback(() => {
    if (!result) return;
    onResult(result);
    handleOpenChange(false);
  }, [handleOpenChange, onResult, result]);

  const handleRetake = useCallback(() => {
    void startCamera();
  }, [startCamera]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/40 disabled:opacity-50"
        title="Сканировать VIN"
      >
        <Camera className="h-5 w-5 text-muted-foreground" />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md overflow-hidden border-border bg-background p-0 sm:w-full">
          <div className="space-y-4 p-4">
            <h3 className="text-base font-semibold text-foreground">Сканирование VIN</h3>

            {!preview && !processing && !result && !error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div
                  ref={frameRef}
                  className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-black shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)]"
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`absolute inset-0 h-full w-full object-cover ${cameraState === "live" ? "opacity-100" : "opacity-0"}`}
                  />

                  {/* Overlay: darken everything outside the guide */}
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
                    <div className="absolute inset-x-0 top-0 h-[39%] bg-black/65" />
                    <div className="absolute inset-x-0 bottom-0 h-[39%] bg-black/65" />
                    <div className="absolute left-0 top-[39%] h-[22%] w-[7%] bg-black/65" />
                    <div className="absolute right-0 top-[39%] h-[22%] w-[7%] bg-black/65" />

                    {/* Guide frame */}
                    <div
                      ref={guideRef}
                      className="absolute left-1/2 top-1/2 h-[22%] w-[86%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border-[3px] border-white shadow-[0_0_12px_2px_rgba(255,255,255,0.25)]"
                    >
                      {cameraState === "live" && (
                        <motion.div
                          initial={{ x: "-35%" }}
                          animate={{ x: "125%" }}
                          transition={{ duration: 2.1, ease: "linear", repeat: Infinity }}
                          className="absolute inset-y-3 w-16 bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent opacity-75 blur-sm"
                        />
                      )}
                    </div>

                    {/* Corner markers */}
                    {(() => {
                      const cornerSize = "18px";
                      const cornerBorder = "3px solid white";
                      const offset = { top: "38.2%", bottom: "38.2%", left: "5.5%", right: "5.5%" };
                      return (
                        <>
                          <div className="absolute" style={{ top: offset.top, left: offset.left, width: cornerSize, height: cornerSize, borderTop: cornerBorder, borderLeft: cornerBorder, borderTopLeftRadius: "6px" }} />
                          <div className="absolute" style={{ top: offset.top, right: offset.right, width: cornerSize, height: cornerSize, borderTop: cornerBorder, borderRight: cornerBorder, borderTopRightRadius: "6px" }} />
                          <div className="absolute" style={{ bottom: offset.bottom, left: offset.left, width: cornerSize, height: cornerSize, borderBottom: cornerBorder, borderLeft: cornerBorder, borderBottomLeftRadius: "6px" }} />
                          <div className="absolute" style={{ bottom: offset.bottom, right: offset.right, width: cornerSize, height: cornerSize, borderBottom: cornerBorder, borderRight: cornerBorder, borderBottomRightRadius: "6px" }} />
                        </>
                      );
                    })()}

                    {/* Label */}
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "33%", zIndex: 3 }}>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-black tracking-wide shadow-md">
                        VIN
                      </span>
                    </div>
                  </div>

                  {cameraState !== "live" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                      {cameraState === "starting" ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                          <p className="text-sm text-white/80">Открываю камеру…</p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-sm text-white/80">
                            {cameraError ?? "Камера недоступна. Используйте фото."}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCaptureFrame()}
                    disabled={cameraState !== "live"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    Фиксировать
                  </button>
                </div>
              </motion.div>
            )}

            {processing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                {preview && (
                  <img src={preview} alt="VIN crop" className="max-h-44 w-full rounded-2xl object-contain bg-muted/20" />
                )}
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Распознаю VIN…</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {preview && (
                  <img src={preview} alt="VIN crop" className="max-h-40 w-full rounded-2xl object-contain bg-muted/20" />
                )}

                {rawOcrText && (
                  <details className="rounded-xl bg-muted/30 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground select-none">Сырой текст OCR</summary>
                    <p className="mt-1 max-h-28 overflow-y-auto text-xs font-mono text-muted-foreground break-all whitespace-pre-wrap">{rawOcrText}</p>
                  </details>
                )}

                <div className="rounded-2xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)] p-4">
                  <p className="mb-1 text-[11px] text-muted-foreground text-center">Распознанный VIN (можно редактировать)</p>
                  <input
                    type="text"
                    value={result}
                    onChange={(e) => setResult(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17))}
                    className="w-full bg-transparent text-center text-lg font-bold tracking-widest text-foreground font-mono border-none outline-none focus:ring-0"
                    maxLength={17}
                  />
                  {!isValidVin(result) && (
                    <p className="mt-1 text-[11px] text-[hsl(var(--warning)/0.85)] text-center">
                      {result.length} из 17 символов
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Заново
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Применить
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {preview && (
                  <img src={preview} alt="VIN crop" className="max-h-40 w-full rounded-2xl object-contain bg-muted/20" />
                )}
                {rawOcrText && (
                  <details className="rounded-xl bg-muted/30 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground select-none">Сырой текст OCR</summary>
                    <p className="mt-1 max-h-28 overflow-y-auto text-xs font-mono text-muted-foreground break-all whitespace-pre-wrap">{rawOcrText}</p>
                  </details>
                )}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Фиксировать ещё раз
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VinScanner;
