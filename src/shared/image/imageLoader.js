import UTIF from 'utif';

const MAX_DISPLAY_DIMENSION = 2000;

function isTiffBuffer(bytes) {
  return (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  );
}

/**
 * Universal image loader. Accepts a File object.
 * Detects TIFF by magic bytes (not just extension). Decodes TIFF via UTIF;
 * other formats via createImageBitmap with a FileReader fallback.
 *
 * @returns {Promise<{
 *   name: string,
 *   canvas: HTMLCanvasElement,
 *   displaySrc: string,
 *   naturalWidth: number,
 *   naturalHeight: number,
 *   displayWidth: number,
 *   displayHeight: number,
 * }>}
 */
export async function loadImageUniversal(file) {
  if (!file) throw new Error('No file provided.');

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const isTiff = isTiffBuffer(bytes) || /\.tiff?$/i.test(file.name);

  try {
    if (isTiff) {
      return decodeTiff(buffer, file.name);
    }
    return await decodeStandardImage(file);
  } catch (err) {
    console.error('Image import failed:', err);
    throw new Error(
      `Could not load "${file.name}". ${err.message || 'The file may be corrupted or an unsupported format.'}`
    );
  }
}

function decodeTiff(buffer, name) {
  const ifds = UTIF.decode(buffer);
  if (!ifds || ifds.length === 0) {
    throw new Error('This TIFF file has no readable image data.');
  }

  const page = ifds[0];
  UTIF.decodeImage(buffer, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  const w = page.width;
  const h = page.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(w, h);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);

  return finalize(canvas, name);
}

async function decodeStandardImage(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      return finalize(canvas, file.name);
    } catch {
      // fall through to FileReader fallback
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(finalize(canvas, file.name));
      };
      img.onerror = () => reject(new Error('Browser could not decode this image format.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function finalize(canvas, name) {
  const w = canvas.width;
  const h = canvas.height;

  let displayCanvas = canvas;
  let displayWidth = w;
  let displayHeight = h;

  if (Math.max(w, h) > MAX_DISPLAY_DIMENSION) {
    const scale = MAX_DISPLAY_DIMENSION / Math.max(w, h);
    displayWidth = Math.round(w * scale);
    displayHeight = Math.round(h * scale);
    displayCanvas = document.createElement('canvas');
    displayCanvas.width = displayWidth;
    displayCanvas.height = displayHeight;
    displayCanvas.getContext('2d').drawImage(canvas, 0, 0, displayWidth, displayHeight);
  }

  return {
    name,
    canvas,
    displaySrc: displayCanvas.toDataURL('image/jpeg', 0.92),
    naturalWidth: w,
    naturalHeight: h,
    displayWidth,
    displayHeight,
  };
}
