import { applyOutlierFlags } from './computeAveraged';

export function wellsToRawData(wells) {
  const rows = [];
  wells.forEach((well) => {
    well.reactions.forEach((r, ri) => {
      rows.push({
        _id: `row_${well.index}_${ri}`,
        wellPosition: well.position,
        well: well.position,
        sampleName: well.sampleName,
        targetName: r.targetName,
        ct: r.cq,
        ctSd: null,
        ampStatus: r.ampStatus,
        task: r.task,
        isUndetermined: r.cq === null,
        isNTC: /ntc|no.?template/i.test(String(r.task || '')),
        _original: {
          'Well Position': well.position,
          'Sample Name': well.sampleName,
          'Target Name': r.targetName,
          CT: r.cq ?? 'Undetermined',
          'Amp Status': r.ampStatus ?? '',
          Task: r.task ?? '',
        },
      });
    });
  });
  return applyOutlierFlags(rows);
}
