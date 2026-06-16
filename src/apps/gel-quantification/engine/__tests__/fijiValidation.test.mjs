/**
 * Fiji/ImageJ compatibility validation for the gel quantification engine.
 *
 * Runs with plain Node (no test framework): `npm run test:gel`.
 *
 * Strategy: synthesize images whose Fiji measurements are known exactly by
 * construction (uniform fills, gradients, a band-on-background), then assert the
 * engine reproduces them. For uncalibrated images Fiji IntDen == RawIntDen ==
 * sum of pixel values, so the expected values are computed directly.
 */
import { measureRectROI, verifyIntDenIdentity } from '../measurements.js';
import {
  computeCorrectedIntensity,
  computeBackground,
  computeBackgroundMean,
  computeControlRatio,
  buildSampleMeasurements,
} from '../boxInBox.js';
import {
  excelBackground,
  excelCorrected,
  excelRatio,
} from '../fijiExcelWorkflow.js';
import { rgbToFijiGray } from '../../../../shared/image/fijiGrayscale.js';
import { percentDifference } from '../diagnostics.js';
import { buildParityReport, buildRatioParity } from '../parityReport.js';

let passed = 0;
let failed = 0;

function approx(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}${detail ? `  — ${detail}` : ''}`);
  }
}

/** Build an analysis-image stub: { pixels, width, height, bitDepth }. */
function makeImage(width, height, fill) {
  const pixels = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels[y * width + x] = typeof fill === 'function' ? fill(x, y) : fill;
    }
  }
  return { pixels, width, height, bitDepth: 16, name: 'synthetic' };
}

console.log('\nGel quantification — Fiji compatibility validation\n');

// 1. Uniform fill: Area = w*h, Mean = fill, IntDen = fill * area (exact).
console.log('Uniform ROI measurement');
{
  const img = makeImage(100, 60, 200);
  const roi = { x: 10, y: 10, width: 20, height: 15 };
  const m = measureRectROI(img, roi);
  assert('area = pixel count', m.area === 300, `got ${m.area}`);
  assert('mean = fill value', m.mean === 200, `got ${m.mean}`);
  assert('intDen = sum of pixels', m.intDen === 200 * 300, `got ${m.intDen}`);
  assert('IntDen identity (IntDen = Area x Mean)', verifyIntDenIdentity(m));
  assert('min == max == fill', m.min === 200 && m.max === 200);
}

// 2. Gradient fill: IntDen = exact running sum over the ROI.
console.log('\nGradient ROI measurement');
{
  const img = makeImage(50, 50, (x, y) => (x + y) % 256);
  const roi = { x: 5, y: 7, width: 11, height: 9 };
  let expectedSum = 0;
  for (let y = roi.y; y < roi.y + roi.height; y++) {
    for (let x = roi.x; x < roi.x + roi.width; x++) {
      expectedSum += (x + y) % 256;
    }
  }
  const m = measureRectROI(img, roi);
  assert('intDen = exact pixel sum', m.intDen === expectedSum, `got ${m.intDen}, expected ${expectedSum}`);
  assert('mean = sum / area', approx(m.mean, expectedSum / (11 * 9)));
}

// 3. ROI clipping at image boundary (Fiji clips ROI to image bounds).
console.log('\nROI boundary clipping');
{
  const img = makeImage(20, 20, 100);
  const roi = { x: 15, y: 15, width: 10, height: 10 }; // extends past edge
  const m = measureRectROI(img, roi);
  assert('clipped area = 5x5', m.area === 25, `got ${m.area}`);
  assert('clipped intDen', m.intDen === 100 * 25, `got ${m.intDen}`);
}

// 4. Box-in-box recovers a known band signal (the core correctness fix).
console.log('\nBox-in-box background correction');
{
  const bg = 50;
  const delta = 80; // band adds this per pixel on top of background
  const inner = { x: 40, y: 30, width: 20, height: 30 };
  const outer = { x: 32, y: 22, width: 36, height: 46 };
  // Band occupies exactly the inner rectangle; everything else is background.
  const img = makeImage(120, 100, (x, y) => {
    const inInner =
      x >= inner.x && x < inner.x + inner.width &&
      y >= inner.y && y < inner.y + inner.height;
    return inInner ? bg + delta : bg;
  });

  const innerM = measureRectROI(img, inner);
  const outerM = measureRectROI(img, outer);

  const areaInner = inner.width * inner.height; // 600
  const ringArea = outer.width * outer.height - areaInner; // 1056

  const bgMean = computeBackgroundMean({
    intDenInner: innerM.intDen,
    intDenOuter: outerM.intDen,
    areaInner: innerM.area,
    areaOuter: outerM.area,
  });
  assert('background mean recovered = bg', approx(bgMean, bg), `got ${bgMean}`);

  const corrected = computeCorrectedIntensity({
    intDenInner: innerM.intDen,
    intDenOuter: outerM.intDen,
    areaInner: innerM.area,
    areaOuter: outerM.area,
  });
  const expectedSignal = delta * areaInner; // 48000
  assert('corrected = delta x innerArea (pure band signal)', approx(corrected, expectedSignal), `got ${corrected}, expected ${expectedSignal}`);

  // Prove the OLD formula was wrong: it ignored the band entirely.
  const oldFormula = (innerM.intDen - outerM.intDen) * (areaInner / ringArea);
  assert('old formula discarded the band (regression guard)', !approx(oldFormula, expectedSignal) && approx(oldFormula, -bg * areaInner), `old=${oldFormula}`);

  const built = buildSampleMeasurements(innerM, outerM);
  assert('buildSampleMeasurements corrected matches', approx(built.correctedIntensity, expectedSignal));
  assert('buildSampleMeasurements exposes backgroundMean', approx(built.backgroundMean, bg));
  assert('buildSampleMeasurements exposes ringArea', built.ringArea === ringArea);
}

// 5. Invalid geometry returns null instead of a bogus number.
console.log('\nGuards');
{
  assert('equal areas (denominator 0) returns null', computeCorrectedIntensity({ intDenInner: 1, intDenOuter: 2, areaInner: 100, areaOuter: 100 }) === null);
  assert('outer smaller than inner returns null', computeCorrectedIntensity({ intDenInner: 1, intDenOuter: 2, areaInner: 100, areaOuter: 50 }) === null);
  assert('non-finite IntDen returns null', computeCorrectedIntensity({ intDenInner: NaN, intDenOuter: 2, areaInner: 100, areaOuter: 200 }) === null);
}

// 6. RGB -> gray rounding matches ImageJ (int)(weighted + 0.5), no extra bias.
console.log('\nRGB to grayscale rounding (ImageJ ColorProcessor)');
{
  assert('white -> 255', rgbToFijiGray(255, 255, 255) === 255, `got ${rgbToFijiGray(255, 255, 255)}`);
  assert('black -> 0', rgbToFijiGray(0, 0, 0) === 0);
  // gray 10: correct = round(10) = 10. The old +0.5 bug produced 11.
  assert('flat gray 10 -> 10 (no +0.5 bias)', rgbToFijiGray(10, 10, 10) === 10, `got ${rgbToFijiGray(10, 10, 10)}`);
  // 100,150,200 -> 0.299*100+0.587*150+0.114*200 = 140.75 -> round = 141.
  assert('weighted 100/150/200 -> 141', rgbToFijiGray(100, 150, 200) === 141, `got ${rgbToFijiGray(100, 150, 200)}`);
}

// 6b. EXACT Excel parity: engine outputs == literal spreadsheet transcription.
console.log('\nFiji/Excel workflow parity (exact)');
{
  // Literal, independent transcription of the spreadsheet formulas.
  const xlBackground = (innerIntDen, outerIntDen, innerArea, outerArea) =>
    ((outerIntDen - innerIntDen) * innerArea) / (outerArea - innerArea);
  const xlCorrected = (innerIntDen, outerIntDen, innerArea, outerArea) =>
    innerIntDen - xlBackground(innerIntDen, outerIntDen, innerArea, outerArea);

  // A spread of realistic cases, including non-integer IntDen and unequal boxes.
  const cases = [
    { innerIntDen: 78000, outerIntDen: 130800, innerArea: 600, outerArea: 1656 },
    { innerIntDen: 1234567, outerIntDen: 2345678, innerArea: 2100, outerArea: 3825 },
    { innerIntDen: 42.5, outerIntDen: 99.9, innerArea: 137, outerArea: 410 },
    { innerIntDen: 5_000_000, outerIntDen: 5_100_000, innerArea: 1000, outerArea: 1200 },
  ];

  for (const c of cases) {
    const { innerIntDen, outerIntDen, innerArea, outerArea } = c;
    const refBg = xlBackground(innerIntDen, outerIntDen, innerArea, outerArea);
    const refCorr = xlCorrected(innerIntDen, outerIntDen, innerArea, outerArea);

    const appBgFn = excelBackground({ innerIntDen, outerIntDen, innerArea, outerArea });
    const appCorrFn = excelCorrected({ innerIntDen, outerIntDen, innerArea, outerArea });
    const appBgEngine = computeBackground({ intDenInner: innerIntDen, intDenOuter: outerIntDen, areaInner: innerArea, areaOuter: outerArea });
    const appCorrEngine = computeCorrectedIntensity({ intDenInner: innerIntDen, intDenOuter: outerIntDen, areaInner: innerArea, areaOuter: outerArea });

    const tag = `inner=${innerIntDen} outer=${outerIntDen} A=${innerArea}/${outerArea}`;
    assert(`excel Background parity (${tag})`, appBgFn === refBg, `app=${appBgFn} excel=${refBg}`);
    assert(`excel Corrected parity (${tag})`, appCorrFn === refCorr, `app=${appCorrFn} excel=${refCorr}`);
    assert(`engine Background parity (${tag})`, appBgEngine === refBg, `engine=${appBgEngine} excel=${refBg}`);
    assert(`engine Corrected parity (${tag})`, appCorrEngine === refCorr, `engine=${appCorrEngine} excel=${refCorr}`);
  }

  // Ratio parity.
  const corrA = xlCorrected(78000, 130800, 600, 1656);
  const corrB = xlCorrected(64000, 116800, 600, 1656);
  const refRatio = corrA / corrB;
  assert('excel Ratio parity', excelRatio(corrA, corrB) === refRatio, `app=${excelRatio(corrA, corrB)} excel=${refRatio}`);
  assert('engine Ratio parity (computeControlRatio)', computeControlRatio(corrA, corrB) === refRatio);

  // End-to-end: measured-from-image IntDen flow == literal Excel on those numbers.
  const bg = 50;
  const delta = 80;
  const inner = { x: 40, y: 30, width: 20, height: 30 };
  const outer = { x: 32, y: 22, width: 36, height: 46 };
  const img = makeImage(120, 100, (x, y) => {
    const inInner = x >= inner.x && x < inner.x + inner.width && y >= inner.y && y < inner.y + inner.height;
    return inInner ? bg + delta : bg;
  });
  const built = buildSampleMeasurements(measureRectROI(img, inner), measureRectROI(img, outer));
  const refBuiltBg = xlBackground(built.intDenInner, built.intDenOuter, built.areaInner, built.areaOuter);
  const refBuiltCorr = xlCorrected(built.intDenInner, built.intDenOuter, built.areaInner, built.areaOuter);
  assert('measured Background == Excel', built.background === refBuiltBg, `app=${built.background} excel=${refBuiltBg}`);
  assert('measured Corrected == Excel', built.correctedIntensity === refBuiltCorr, `app=${built.correctedIntensity} excel=${refBuiltCorr}`);
}

// 7. percentDifference sanity.
console.log('\nDiagnostics helpers');
{
  assert('0% when equal', approx(percentDifference(100, 100), 0));
  assert('+1% when 1 high', approx(percentDifference(101, 100), 1));
  assert('null when reference is 0', percentDifference(5, 0) === null);
}

// 8. Parity report — divergence localization (no math change; verification only).
console.log('\nParity report divergence localization');
{
  // Matching measurements (uncalibrated): Fiji == App everywhere → no divergence.
  const fiji = { innerArea: 600, outerArea: 1656, innerMean: 130, outerMean: 78.985507, innerIntDen: 78000, outerIntDen: 130800 };
  const app = { ...fiji };
  const r = buildParityReport({ fiji, app, tolerancePct: 1 });
  assert('matching → no divergence', r.divergence === null);
  assert('matching → allWithinTolerance', r.allWithinTolerance === true);
  assert('matching → corrected metric within tolerance', r.metrics.corrected.withinTolerance);

  // Area mismatch → flagged at ROI/pixel-counting stage first.
  const rArea = buildParityReport({ fiji, app: { ...app, innerArea: 660 }, tolerancePct: 1 });
  assert('area mismatch → divergence at Inner Area', rArea.divergence?.metric === 'innerArea');
  assert('area mismatch → ROI stage', /ROI coordinate/.test(rArea.divergence?.stage ?? ''));

  // Mean mismatch (areas equal) → grayscale/pixel-value stage.
  const rMean = buildParityReport({ fiji, app: { ...app, innerMean: 140 }, tolerancePct: 1 });
  assert('mean mismatch → divergence at Inner Mean', rMean.divergence?.metric === 'innerMean');
  assert('mean mismatch → grayscale stage', /Grayscale/.test(rMean.divergence?.stage ?? ''));

  // IntDen mismatch while area+mean match → calibration/scaling stage.
  const rCal = buildParityReport({ fiji, app: { ...app, innerIntDen: 81900 }, tolerancePct: 1 });
  assert('intden mismatch → divergence at Inner IntDen', rCal.divergence?.metric === 'innerIntDen');
  assert('intden mismatch → calibration stage', /calibration|RawIntDen/.test(rCal.divergence?.stage ?? ''));

  // Ratio parity passes when both ROIs match.
  const rA = buildParityReport({ fiji, app, tolerancePct: 1 });
  const fijiB = { innerArea: 600, outerArea: 1656, innerMean: 110, outerMean: 70, innerIntDen: 66000, outerIntDen: 115920 };
  const rB = buildParityReport({ fiji: fijiB, app: { ...fijiB }, tolerancePct: 1 });
  const ratio = buildRatioParity(rA, rB, 1);
  assert('ratio parity within tolerance when matched', ratio.withinTolerance === true);
  assert('ratio abs error 0 when matched', Math.abs(ratio.abs) < 1e-9);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
