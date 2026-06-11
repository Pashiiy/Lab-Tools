import { useState, useRef } from 'react';
import { IMAGE_FILE_ACCEPT, isTiffFile } from '../../../shared/image/constants';

export default function UploadZone({ onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const isImage =
      file.type.startsWith('image/') ||
      isTiffFile(file) ||
      /\.(jpe?g|png|tiff?)$/i.test(file.name);
    if (!isImage) return;
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => handleFile(e.target.files[0]);

  return (
    <div
      className={`upload-zone${dragOver ? ' upload-zone--active' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="upload-zone__icon">+</div>
      <p className="upload-zone__title">Drop an image here</p>
      <p className="upload-zone__subtitle">or click to browse</p>
      <p className="upload-zone__formats">JPG, PNG, TIFF</p>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="upload-zone__input"
        onChange={handleChange}
      />
    </div>
  );
}
