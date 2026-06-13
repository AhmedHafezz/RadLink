'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import DicomUploader from '@/components/upload/DicomUploader';

export default function UploadPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="w-px h-5 bg-gray-700" />
          <div>
            <h1 className="text-xl font-bold text-white">
              رفع دراسة جديدة / Upload New Study
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload a DICOM study archive (.zip) to RadLink Cloud-PACS
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4 text-sm text-blue-300">
          <p className="font-semibold mb-1">Before uploading:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-400">
            <li>Export the study as a DICOM ZIP archive from your scanner or workstation</li>
            <li>Ensure the ZIP contains valid .dcm files at the root or in subdirectories</li>
            <li>Maximum file size is 2 GB per study</li>
            <li>Patient data is encrypted at rest and in transit (AES-256)</li>
          </ul>
        </div>

        {/* Uploader */}
        <DicomUploader
          onUploadComplete={(result) => {
            const studyId = (result as { studyId?: string })?.studyId;
            if (studyId) {
              router.push(`/viewer/${studyId}`);
            } else {
              router.push('/dashboard');
            }
          }}
        />

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600">
          All DICOM data is processed and stored in compliance with HIPAA regulations.
          Studies are accessible only to authorized users within your organization.
        </p>
      </div>
    </div>
  );
}
