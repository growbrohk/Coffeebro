const MAX_EDGE = 1280;
const SKIP_MAX_BYTES = 400_000;
const JPEG_QUALITY = 0.85;

/** True when re-encoding is unlikely to help (already small file and resolution). */
export function shouldSkipReceiptCompression(
  fileSize: number,
  width: number,
  height: number,
): boolean {
  const longEdge = Math.max(width, height);
  return fileSize <= SKIP_MAX_BYTES && longEdge <= MAX_EDGE;
}

function scaledDimensions(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_EDGE) {
    return { width, height };
  }
  const scale = MAX_EDGE / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

const BITMAP_OPTIONS: ImageBitmapOptions = { imageOrientation: "from-image" };

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, BITMAP_OPTIONS);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = url;
    });
    return createImageBitmap(img, BITMAP_OPTIONS);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downscale receipt photos before upload. Returns the original file on skip or failure.
 */
export async function compressReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await loadBitmap(file);
    const { width, height } = bitmap;

    if (shouldSkipReceiptCompression(file.size, width, height)) {
      return file;
    }

    const { width: outW, height: outH } = scaledDimensions(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) {
      return file;
    }

    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
