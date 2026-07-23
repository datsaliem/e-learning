"use client";

import { Upload } from "tus-js-client";

const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export class UploadCancelledError extends Error {
  constructor() {
    super("Đã huỷ tải file.");
    this.name = "UploadCancelledError";
  }
}

export interface ResumableUploadTask {
  promise: Promise<void>;
  cancel: () => Promise<void>;
}

interface CreateResumableUploadTaskOptions {
  file: File;
  storagePath: string;
  uploadEndpoint: string;
  uploadToken: string;
  onProgress: (percentage: number) => void;
}

export function createResumableUploadTask({
  file,
  storagePath,
  uploadEndpoint,
  uploadToken,
  onProgress,
}: CreateResumableUploadTaskOptions): ResumableUploadTask {
  let settled = false;
  let cancelled = false;
  let resolvePromise: () => void = () => undefined;
  let rejectPromise: (reason: Error) => void = () => undefined;

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const upload = new Upload(file, {
    endpoint: uploadEndpoint,
    retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
    headers: { "x-signature": uploadToken },
    uploadDataDuringCreation: true,
    chunkSize: TUS_CHUNK_SIZE,
    storeFingerprintForResuming: false,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: "course-content",
      objectName: storagePath,
      contentType: file.type,
      cacheControl: "3600",
    },
    onProgress(bytesUploaded, bytesTotal) {
      const percentage = bytesTotal === 0 ? 0 : Math.round((bytesUploaded / bytesTotal) * 100);
      onProgress(Math.min(100, Math.max(0, percentage)));
    },
    onError(error) {
      if (settled) return;
      settled = true;
      rejectPromise(cancelled ? new UploadCancelledError() : error);
    },
    onSuccess() {
      if (settled) return;
      settled = true;
      onProgress(100);
      resolvePromise();
    },
  });

  upload.start();

  return {
    promise,
    async cancel() {
      if (settled) return;
      cancelled = true;
      try {
        await upload.abort(true);
      } catch {
        await upload.abort(false);
      }
      if (!settled) {
        settled = true;
        rejectPromise(new UploadCancelledError());
      }
    },
  };
}
