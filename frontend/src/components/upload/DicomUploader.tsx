'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileArchive } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadApi } from '@/lib/api';

const MAX_FILE_SIZE_MB = 2048;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadResult {
  studyId: string;
  patientName?: string;
  numberOfInstances?: number;
}

interface DicomUploaderProps {
  onUploadComplete?: (result: UploadResult) => void;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DicomUploader({ onUploadComplete }: DicomUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'zip') {
      return 'Only ZIP archives are accepted. Please package your DICOM files in a .zip file.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size exceeds the ${MAX_FILE_SIZE_MB} MB limit. Current size: ${formatFileSize(file.size)}.`;
    }
    return null;
  }

  function handleFileSelection(file: File) {
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      setState('error');
      toast.error(err);
      return;
    }
    setSelectedFile(file);
    setState('selected');
    setErrorMessage('');
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelection(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  }

  async function handleUpload() {
    if (!selectedFile || state === 'uploading') return;

    setState('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const toastId = toast.loading('Uploading DICOM archive...');

    try {
      const result = await uploadApi.uploadStudy(formData, (p) => {
        setProgress(p);
      }) as UploadResult;

      setState('success');
      setUploadResult(result);
      toast.success('Study uploaded successfully!', { id: toastId });
      onUploadComplete?.(result);
    } catch (err: unknown) {
      setState('error');
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Upload failed. Please try again.';
      setErrorMessage(message);
      toast.error(message, { id: toastId });
    }
  }

  function handleReset() {
    setState('idle');
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage('');
    setUploadResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Drop Zone */}
      {(state === 'idle' || state === 'error') && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragOver
                ? 'border-rad-cyan-500 bg-rad-cyan-500/5 scale-[1.01]'
                : state === 'error'
                ? 'border-red-500/50 bg-red-500/5 hover:border-red-500'
                : 'border-rad-border bg-rad-card hover:border-rad-cyan-500/60 hover:bg-rad-cyan-500/5'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                state === 'error'
                  ? 'bg-red-500/10'
                  : isDragOver
                  ? 'bg-rad-cyan-500/20'
                  : 'bg-rad-panel'
              }`}
            >
              {state === 'error' ? (
                <AlertCircle size={32} className="text-red-400" />
              ) : (
                <Upload
                  size={32}
                  className={isDragOver ? 'text-rad-cyan-500' : 'text-rad-text-secondary'}
                />
              )}
            </div>

            {state === 'error' ? (
              <>
                <div className="text-red-400 font-semibold text-lg">Upload Error</div>
                <p className="text-red-400/80 text-sm max-w-sm">{errorMessage}</p>
                <p className="text-rad-text-secondary text-sm">
                  Click to try a different file
                </p>
              </>
            ) : (
              <>
                <div>
                  <p className="text-rad-text-primary font-semibold text-lg">
                    {isDragOver ? 'Drop your file here' : 'Drag & drop DICOM archive'}
                  </p>
                  <p className="text-rad-text-secondary text-sm mt-1">
                    or <span className="text-rad-cyan-500 underline underline-offset-2">browse files</span>
                  </p>
                </div>
                <div className="text-rad-text-secondary text-xs space-y-0.5">
                  <p>Accepts: <span className="text-rad-text-primary font-medium">.zip</span> archives</p>
                  <p>Max size: <span className="text-rad-text-primary font-medium">{MAX_FILE_SIZE_MB} MB</span></p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* File selected, ready to upload */}
      {state === 'selected' && selectedFile && (
        <div className="border border-rad-border rounded-xl bg-rad-card overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-lg bg-rad-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <FileArchive size={24} className="text-rad-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-rad-text-primary font-medium truncate">{selectedFile.name}</div>
              <div className="text-rad-text-secondary text-sm">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button
              onClick={handleReset}
              className="text-rad-text-secondary hover:text-red-400 transition-colors p-1 rounded"
              aria-label="Remove file"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={handleUpload}
              className="w-full py-3 bg-rad-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Upload Study
            </button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {state === 'uploading' && selectedFile && (
        <div className="border border-rad-border rounded-xl bg-rad-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rad-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <FileArchive size={24} className="text-rad-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-rad-text-primary font-medium truncate">{selectedFile.name}</div>
              <div className="text-rad-text-secondary text-sm">
                {formatFileSize(selectedFile.size)} &mdash; Uploading...
              </div>
            </div>
            <span className="text-rad-cyan-500 font-bold text-sm tabular-nums">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-rad-panel rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-rad-cyan-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-rad-text-secondary text-xs text-center">
            Please do not close this page while uploading.
          </p>
        </div>
      )}

      {/* Success */}
      {state === 'success' && uploadResult && (
        <div className="border border-emerald-500/30 rounded-xl bg-emerald-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-rad-text-primary font-semibold text-lg">Upload Successful</h3>
              <p className="text-rad-text-secondary text-sm mt-1">
                Your DICOM study has been uploaded and is being processed.
              </p>
              {uploadResult.patientName && (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-rad-text-secondary">Patient:</span>
                    <span className="text-rad-text-primary">{uploadResult.patientName}</span>
                  </div>
                  {uploadResult.numberOfInstances !== undefined && (
                    <div className="flex gap-2">
                      <span className="text-rad-text-secondary">Instances:</span>
                      <span className="text-rad-text-primary">{uploadResult.numberOfInstances}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <a
                  href={`/viewer/${uploadResult.studyId}`}
                  className="px-4 py-2 bg-rad-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Open Viewer
                </a>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-rad-panel hover:bg-rad-card border border-rad-border text-rad-text-secondary hover:text-rad-text-primary text-sm font-medium rounded-lg transition-colors"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
