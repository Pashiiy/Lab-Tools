/** Build a lowercase search index from all strain record fields. */
export function strainSearchText(strain) {
  const listFields = [
    ...(strain.dnaRepairCharacteristics || []),
    ...(strain.expectedPhenotypes || []),
    ...(strain.tags || []),
  ];

  return [
    strain.strainId,
    strain.commonName,
    strain.genotype,
    strain.description,
    ...listFields,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function strainRecordId(strain) {
  return strain.strainId ?? strain.id ?? '';
}
