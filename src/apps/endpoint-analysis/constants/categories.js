export const REPAIR_CATEGORIES = [
  { id: 'A', galcen: 0, cen3: 0, rearrangement: 1, reciprocal: 1, repairProduct: 'HR' },
  { id: 'B', galcen: 0, cen3: 0, rearrangement: 1, reciprocal: 0, repairProduct: 'SSA' },
  { id: 'C', galcen: 1, cen3: 1, rearrangement: 0, reciprocal: 0, repairProduct: 'UNRERRANGED' },
  { id: 'D', galcen: 0, cen3: 1, rearrangement: 0, reciprocal: 0, repairProduct: 'NHEJ' },
  { id: 'E', galcen: 0, cen3: 1, rearrangement: 1, reciprocal: 0, repairProduct: 'ANEUPLOID' },
  { id: 'F', galcen: 1, cen3: 0, rearrangement: 1, reciprocal: 0, repairProduct: 'ANEUPLOID' },
  { id: 'G', galcen: 1, cen3: 0, rearrangement: 0, reciprocal: 0, repairProduct: 'NHEJ' },
  { id: 'H', galcen: 1, cen3: 1, rearrangement: 1, reciprocal: 0, repairProduct: 'ANEUPLOID+SSA' },
  { id: 'I', galcen: 0, cen3: 1, rearrangement: 0, reciprocal: 1, repairProduct: 'SSA+EJ' },
];

export const REPAIR_COLORS = {
  HR: '#4A90D9',
  SSA: '#50C878',
  UNRERRANGED: '#A0A0B0',
  NHEJ: '#F5A623',
  ANEUPLOID: '#E05C5C',
  'ANEUPLOID+SSA': '#9B59B6',
  'SSA+EJ': '#1ABC9C',
  UNCLASSIFIED: '#555566',
};

export const REPAIR_PRODUCTS = [
  'HR',
  'SSA',
  'UNRERRANGED',
  'NHEJ',
  'ANEUPLOID',
  'ANEUPLOID+SSA',
  'SSA+EJ',
  'UNCLASSIFIED',
];

export function classifyColony({ galcen, cen3, rearrangement, reciprocal }) {
  const match = REPAIR_CATEGORIES.find(
    (cat) =>
      cat.galcen === galcen &&
      cat.cen3 === cen3 &&
      cat.rearrangement === rearrangement &&
      cat.reciprocal === reciprocal
  );
  return match
    ? { categoryId: match.id, repairProduct: match.repairProduct }
    : { categoryId: '?', repairProduct: 'UNCLASSIFIED' };
}
