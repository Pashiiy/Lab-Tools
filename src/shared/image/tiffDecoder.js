import { fromArrayBuffer } from 'geotiff';
import { FIJI_GRAY_WEIGHTS, rgbToFijiGray } from './fijiGrayscale';

/**
 * Decode TIFF from ArrayBuffer into a new owned Uint16Array.
 * Never mutates library-returned buffers or the source ArrayBuffer.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ pixels: Uint16Array, width: number, height: number, bitDepth: 8|16 }>}
 */
export async function decodeTiffToRaw(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    throw new Error('TIFF decode requires an ArrayBuffer');
  }

  const tiff = await fromArrayBuffer(arrayBuffer.slice(0));
  const image = await tiff.getImage(0);

  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  const bitsPerSample = image.getBitsPerSample();
  const bps = Array.isArray(bitsPerSample) ? bitsPerSample[0] : bitsPerSample;
  const bitDepth = bps >= 16 ? 16 : 8;

  const rasters = await image.readRasters({ interleave: false });
  const pixels = new Uint16Array(width * height);
  const count = width * height;

  if (samplesPerPixel >= 3) {
    const rBand = copyBandToArray(rasters[0], count);
    const gBand = copyBandToArray(rasters[1], count);
    const bBand = copyBandToArray(rasters[2], count);

    if (bitDepth === 16) {
      for (let i = 0; i < count; i++) {
        pixels[i] = Math.round(
          rBand[i] * FIJI_GRAY_WEIGHTS.r +
            gBand[i] * FIJI_GRAY_WEIGHTS.g +
            bBand[i] * FIJI_GRAY_WEIGHTS.b
        );
      }
    } else {
      for (let i = 0; i < count; i++) {
        const r8 = rBand[i] > 255 ? rBand[i] >> 8 : rBand[i];
        const g8 = gBand[i] > 255 ? gBand[i] >> 8 : gBand[i];
        const b8 = bBand[i] > 255 ? bBand[i] >> 8 : bBand[i];
        pixels[i] = rgbToFijiGray(r8, g8, b8);
      }
    }
  } else {
    const band = copyBandToArray(rasters[0], count);
    for (let i = 0; i < count; i++) {
      pixels[i] = band[i];
    }
  }

  return { pixels, width, height, bitDepth };
}

/** Copy band into a new buffer — never store geotiff's typed array by reference. */
function copyBandToArray(band, length) {
  const out = new Uint16Array(length);
  if (!band || length <= 0) return out;

  if (ArrayBuffer.isView(band)) {
    const n = Math.min(length, band.length);
    for (let i = 0; i < n; i++) {
      out[i] = band[i];
    }
    return out;
  }

  for (let i = 0; i < length; i++) {
    out[i] = band[i] ?? 0;
  }
  return out;
}
