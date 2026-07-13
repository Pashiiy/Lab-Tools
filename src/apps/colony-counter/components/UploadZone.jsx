import { IMAGE_FILE_ACCEPT, isImageFile } from '../../../shared/image/constants';
import FileDropZone from '../../../shared/ui/FileDropZone';

export default function UploadZone({ onUpload, multiple = true }) {
  return (
    <FileDropZone
      accept={IMAGE_FILE_ACCEPT}
      multiple={multiple}
      title={multiple ? 'Drop plate images here' : 'Drop an image here'}
      subtitle={multiple ? 'or click to browse — select one or many' : 'or click to browse'}
      formats="JPG, PNG, TIFF"
      data-tour="cc-upload"
      onFiles={(files) => {
        const images = files.filter(isImageFile);
        if (images.length === 0) return;
        if (typeof onUpload === 'function') {
          // Prefer batch handler when provided as addPlatesFromFiles
          onUpload(multiple ? images : images[0]);
        }
      }}
    />
  );
}
