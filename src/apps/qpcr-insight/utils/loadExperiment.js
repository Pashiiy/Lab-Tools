import { parseEDS } from './parseEDS';
import { parseExcel } from './parseExcel';

export async function loadExperiment(file) {
  const buffer = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith('.eds')) {
    return parseEDS(buffer, file.name);
  }
  if (/\.xlsx?$/i.test(file.name)) {
    return parseExcel(buffer, file.name);
  }
  throw new Error(
    'Unsupported file type. Please upload a .eds or .xlsx file from QuantStudio.'
  );
}
