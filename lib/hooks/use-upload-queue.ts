import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UploadQueueItemStatus = "queued" | "uploading" | "success" | "error";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: UploadQueueItemStatus;
  progress: number;
  error?: string;
  result?: unknown;
};

type UseUploadQueueOptions = {
  concurrency?: number;
  uploadFile: (file: File, onProgress: (progress: number) => void) => Promise<unknown>;
};

function createQueueId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useUploadQueue({ concurrency = 2, uploadFile }: UseUploadQueueOptions) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const uploadFileRef = useRef(uploadFile);

  useEffect(() => {
    uploadFileRef.current = uploadFile;
  }, [uploadFile]);

  const enqueueFiles = useCallback((files: File[]) => {
    if (!files.length) {
      return;
    }

    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: createQueueId(),
        file,
        status: "queued" as const,
        progress: 0,
      })),
    ]);
  }, []);

  const updateItem = useCallback(
    (id: string, updater: (item: UploadQueueItem) => UploadQueueItem) => {
      setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const retryItem = useCallback(
    (id: string) => {
      updateItem(id, (item) => ({
        ...item,
        status: "queued",
        progress: 0,
        error: undefined,
        result: undefined,
      }));
    },
    [updateItem]
  );

  const activeUploads = useMemo(
    () => items.filter((item) => item.status === "uploading").length,
    [items]
  );

  useEffect(() => {
    const availableSlots = Math.max(0, concurrency - activeUploads);
    if (!availableSlots) {
      return;
    }

    const nextQueuedItems = items
      .filter((item) => item.status === "queued")
      .slice(0, availableSlots);
    if (!nextQueuedItems.length) {
      return;
    }

    for (const item of nextQueuedItems) {
      updateItem(item.id, (currentItem) => ({
        ...currentItem,
        status: "uploading",
        progress: 0,
        error: undefined,
      }));

      void uploadFileRef
        .current(item.file, (progress) => {
          updateItem(item.id, (currentItem) =>
            currentItem.status === "uploading" ? { ...currentItem, progress } : currentItem
          );
        })
        .then((result) => {
          updateItem(item.id, (currentItem) => ({
            ...currentItem,
            status: "success",
            progress: 100,
            result,
            error: undefined,
          }));
        })
        .catch((error: unknown) => {
          updateItem(item.id, (currentItem) => ({
            ...currentItem,
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          }));
        });
    }
  }, [activeUploads, concurrency, items, updateItem]);

  const isUploading = items.some((item) => item.status === "uploading");

  return {
    items,
    enqueueFiles,
    retryItem,
    removeItem,
    isUploading,
  };
}
