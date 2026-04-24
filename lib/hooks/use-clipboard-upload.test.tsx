// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { extractImageFilesFromClipboardData, useClipboardUpload } from "./use-clipboard-upload";

function createClipboardData({
  files = [],
  items = [],
}: {
  files?: File[];
  items?: Array<{ kind: string; file: File | null }>;
}): DataTransfer {
  return {
    files,
    items: items.map((item) => ({
      kind: item.kind,
      getAsFile: () => item.file,
    })),
  } as unknown as DataTransfer;
}

describe("extractImageFilesFromClipboardData", () => {
  test("extracts image files", () => {
    const imageFile = new File(["image"], "test.png", { type: "image/png" });
    const clipboardData = createClipboardData({
      items: [{ kind: "file", file: imageFile }],
    });

    const result = extractImageFilesFromClipboardData(clipboardData, {
      acceptedTypes: ["image/png"],
      maxSize: 10 * 1024 * 1024,
    });

    expect(result.files).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  test("rejects non-image or unsupported image content", () => {
    const textLikeFile = new File(["hello"], "hello.txt", {
      type: "text/plain",
    });
    const unsupportedImage = new File(["bmp"], "test.bmp", {
      type: "image/bmp",
    });
    const clipboardData = createClipboardData({
      items: [
        { kind: "file", file: textLikeFile },
        { kind: "file", file: unsupportedImage },
      ],
    });

    const result = extractImageFilesFromClipboardData(clipboardData, {
      acceptedTypes: ["image/png"],
      maxSize: 10 * 1024 * 1024,
    });

    expect(result.files).toHaveLength(0);
    expect(result.rejected).toEqual(["Unsupported image type: image/bmp"]);
  });

  test("rejects oversized file", () => {
    const largeFile = new File([new Uint8Array(11 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    const clipboardData = createClipboardData({
      items: [{ kind: "file", file: largeFile }],
    });

    const result = extractImageFilesFromClipboardData(clipboardData, {
      acceptedTypes: ["image/png"],
      maxSize: 10 * 1024 * 1024,
    });

    expect(result.files).toHaveLength(0);
    expect(result.rejected[0]).toContain("size limit");
  });
});

describe("useClipboardUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("registers and removes paste listener on unmount", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useClipboardUpload({
        onFiles: vi.fn(),
      })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function));
  });
});
