import { formatSciNotationParts } from '../utils/cfu';

export default function SciNotation({ value }) {
  const parts = formatSciNotationParts(value);
  if (!parts) return <>—</>;
  return (
    <>
      {parts.coeff} × 10<sup>{parts.exp}</sup>
    </>
  );
}
