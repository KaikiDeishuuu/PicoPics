import { useEffect, useRef } from "react";

const DEFAULT_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ExtractOptions = {
  acceptedTypes: string[];
  maxSize: number;
};

export type ClipboardUploadOptions = {
  enabled?: boolean;
  acceptedTypes?: string[];
  maxSize?: number;
  onFiles: (files: File[]) => void | Promise<void>;
  onRejected?: (reason: string) => void;
  ignoreWhenTyping?: boolean;
};

function getFileExtensionFromMimeType(type: string) {
  return MIME_EXTENSION_MAP[type] || "png";
}

function toNormalizedFile(file: File | Blob): File {
  if (file instanceof File && file.name) {
    return file;
  }

  const fileType = file.type || "image/png";
  const extension = getFileExtensionFromMimeType(fileType);
  const timestamp = Date.now();

  return new File([file], `clipboard-${timestamp}.${extension}`, {
    type: fileType,
    lastModified: timestamp,
  });
}

export function extractImageFilesFromClipboardData(
  clipboardData: DataTransfer,
  options: ExtractOptions
): {
  files: File[];
  rejected: string[];
} {
  const { acceptedTypes, maxSize } = options;
  const files: File[] = [];
  const rejected: string[] = [];
  const seenFiles = new Set<string>();

  const addCandidate = (candidate: File | Blob | null) => {
    if (!candidate) {
      return;
    }

    const normalizedFile = toNormalizedFile(candidate);
    const dedupeKey = `${normalizedFile.name}-${normalizedFile.size}-${normalizedFile.type}`;

    if (seenFiles.has(dedupeKey)) {
      return;
    }
    seenFiles.add(dedupeKey);

    if (!normalizedFile.type.startsWith("image/")) {
      return;
    }

    if (!acceptedTypes.includes(normalizedFile.type)) {
      rejected.push(`Unsupported image type: ${normalizedFile.type}`);
      return;
    }

    if (normalizedFile.size > maxSize) {
      rejected.push(`Image exceeds ${Math.round(maxSize / 1024 / 1024)}MB size limit`);
      return;
    }

    files.push(normalizedFile);
  };

  for (const item of Array.from(clipboardData.items ?? [])) {
    if (item.kind !== "file") {
      continue;
    }
    addCandidate(item.getAsFile());
  }

  for (const file of Array.from(clipboardData.files ?? [])) {
    addCandidate(file);
  }

  return { files, rejected };
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const typingElement = target.closest("input, textarea, [contenteditable=true]");
  return Boolean(typingElement);
}

export function useClipboardUpload(options: ClipboardUploadOptions): void {
  const {
    enabled = true,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    maxSize = DEFAULT_MAX_SIZE,
    onFiles,
    onRejected,
    ignoreWhenTyping = true,
  } = options;
  const isUploadingRef = useRef(false);
  const onFilesRef = useRef(onFiles);
  const onRejectedRef = useRef(onRejected);

  useEffect(() => {
    onFilesRef.current = onFiles;
  }, [onFiles]);

  useEffect(() => {
    onRejectedRef.current = onRejected;
  }, [onRejected]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (ignoreWhenTyping && isTypingElement(event.target)) {
        return;
      }

      if (!event.clipboardData) {
        return;
      }

      const { files, rejected } = extractImageFilesFromClipboardData(event.clipboardData, {
        acceptedTypes,
        maxSize,
      });

      if (files.length === 0) {
        if (rejected[0] && onRejectedRef.current) {
          onRejectedRef.current(rejected[0]);
        }
        return;
      }

      if (isUploadingRef.current) {
        onRejectedRef.current?.("An upload is already in progress.");
        return;
      }

      event.preventDefault();
      isUploadingRef.current = true;

      Promise.resolve(onFilesRef.current(files.slice(0, 1)))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Paste upload failed";
          onRejectedRef.current?.(message);
        })
        .finally(() => {
          isUploadingRef.current = false;
        });
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [acceptedTypes, enabled, ignoreWhenTyping, maxSize]);
}
