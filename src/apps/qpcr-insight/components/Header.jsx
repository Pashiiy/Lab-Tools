import { FormulasButton } from './FormulasPanel';

export default function Header({
  experimentName,
  onUploadNew,
  onExportExcel,
  onOpenFormulas,
  exporting,
}) {
  return (
    <header className="qi-header">
      <h1 className="qi-header__title">{experimentName}</h1>
      <div className="qi-header__actions">
        <FormulasButton onClick={onOpenFormulas} />
        <button
          type="button"
          className="qi-header__export-btn"
          onClick={onExportExcel}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
        <button type="button" className="qi-header__upload-btn" onClick={onUploadNew}>
          Upload new file
        </button>
      </div>
    </header>
  );
}
