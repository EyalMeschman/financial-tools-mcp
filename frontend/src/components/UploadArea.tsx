import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSse } from '../hooks/useSse';
import { ProgressBar } from './ProgressBar';
import CurrencySelect from './CurrencySelect';
import { getApiUrl } from '../config';

const MAX_FILE_SIZE = 1024 * 1024 * 4; // 4MB
const MAX_FILES = 100;
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

interface ProgressData {
  job_id: string;
  status: string;
  current_step: string;
  processed: number;
  total: number;
  percentage: number;
  message: string;
  keepalive?: boolean;
}

interface FileResult {
  filename: string;
  status: 'success' | 'error';
  message?: string;
}

export default function UploadArea() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const { data: progressData } = useSse<ProgressData>(jobId ? getApiUrl(`/progress/${jobId}`) : '');

  // Handle progress updates
  useEffect(() => {
    if (progressData && !progressData.keepalive) {
      if (progressData.status === 'completed') {
        setIsProcessing(false);
        // Auto-download the report
        window.location.href = getApiUrl(`/download/${progressData.job_id}`);
        // Update file results to show success
        const successResults = selectedFiles.map(file => ({
          filename: file.name,
          status: 'success' as const,
          message: 'Processed successfully'
        }));
        setFileResults(successResults);
      } else if (progressData.status === 'error') {
        setIsProcessing(false);
        // Update file results to show error
        const errorResults = selectedFiles.map(file => ({
          filename: file.name,
          status: 'error' as const,
          message: progressData.message || 'Processing failed'
        }));
        setFileResults(errorResults);
      }
    }
  }, [progressData, selectedFiles]);

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
    maxFiles: MAX_FILES,
    disabled: isProcessing
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('target_currency', targetCurrency);

    setIsProcessing(true);
    setFileResults([]);

    try {
      const response = await fetch(getApiUrl('/process-invoices'), {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setJobId(result.job_id);
      } else {
        console.error('Failed to submit files');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error submitting files:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isProcessing
          ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
          : isDragActive
            ? 'border-blue-400 bg-blue-50 cursor-pointer'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
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
                PDF, JPG, PNG files only. Max 4MB per file, 100 files total.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label htmlFor="currency-select" className="text-sm font-medium text-gray-700">
            Target Currency:
          </label>
          <CurrencySelect
            selectedCurrency={targetCurrency}
            onCurrencyChange={setTargetCurrency}
          />
        </div>
        {selectedFiles.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
              }`}
            data-testid="submit-button"
          >
            {isProcessing ? 'Processing...' : 'Process Invoices'}
          </button>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
          {progressData?.percentage !== undefined && !progressData.keepalive && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {progressData.message || 'Processing Progress'}
                </span>
                <span className="text-sm text-gray-600">{progressData.percentage}%</span>
              </div>
              <ProgressBar percentage={progressData.percentage} />
              <div className="text-xs text-gray-500 mt-1">
                Step: {progressData.current_step} ({progressData.processed}/{progressData.total} files)
              </div>
            </div>
          )}
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const fileResult = fileResults.find(result => result.filename === file.name);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`flex items-center justify-between p-2 rounded border ${fileResult?.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : fileResult?.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                    }`}
                  data-testid="selected-file"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    {fileResult && (
                      <span className={`text-xs px-2 py-1 rounded ${fileResult.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {fileResult.status === 'success' ? '✓ Success' : '✗ Error'}
                      </span>
                    )}
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      data-testid="remove-file-button"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}