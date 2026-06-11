import UploadZone from './UploadZone';
import CanvasView from './CanvasView';

export default function Workspace({
  image,
  dots,
  opacity,
  onUpload,
  onAddDot,
  onRemoveDot,
  findDotAt,
}) {
  return (
    <main className={`workspace${image ? ' workspace--canvas' : ''}`}>
      {!image ? (
        <UploadZone onUpload={onUpload} />
      ) : (
        <CanvasView
          image={image}
          dots={dots}
          opacity={opacity}
          onAddDot={onAddDot}
          onRemoveDot={onRemoveDot}
          findDotAt={findDotAt}
        />
      )}
    </main>
  );
}
