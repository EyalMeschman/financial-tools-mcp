import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSse } from '../hooks/useSse';
import { ProgressBar } from './ProgressBar';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_FILES = 100;
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

interface ProgressData {
  percentage: number;
}

export default function UploadArea() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { data: progressData } = useSse<ProgressData>(selectedFiles.length > 0 ? '/progress/demo' : '');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      return file.size <= MAX_FILE_SIZE;
    });

    const totalFiles = selectedFiles.length + validFiles.length;
    const filesToAdd = totalFiles > MAX_FILES 
      ? validFiles.slice(0, MAX_FILES - selectedFiles.length)
      : validFiles;

    setSelectedFiles(prev => [...prev, ...filesToAdd]);
  }, [selectedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-gray-600">
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <div>
              <p className="mb-2">Drag & drop files here, or click to select</p>
              <p className="text-sm text-gray-500">
                PDF, JPG, PNG files only. Max 1MB per file, 100 files total.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
          {progressData?.percentage !== undefined && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Processing Progress</span>
                <span className="text-sm text-gray-600">{progressData.percentage}%</span>
              </div>
              <ProgressBar percentage={progressData.percentage} />
            </div>
          )}
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                data-testid="selected-file"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  data-testid="remove-file-button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}