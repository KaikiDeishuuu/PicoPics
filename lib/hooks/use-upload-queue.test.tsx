// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useUploadQueue } from "./use-upload-queue";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useUploadQueue", () => {
  test("respects concurrency and processes queued files", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const third = deferred<void>();
    const uploads = [first, second, third];
    let callIndex = 0;

    const uploadFile = vi.fn(async () => {
      const current = uploads[callIndex];
      callIndex += 1;
      await current.promise;
    });

    const { result } = renderHook(() =>
      useUploadQueue({
        concurrency: 2,
        createUploadTask: () => ({
          promise: uploadFile(),
          cancel: vi.fn(),
        }),
      })
    );

    act(() => {
      result.current.enqueueFiles([
        new File(["a"], "a.png", { type: "image/png" }),
        new File(["b"], "b.png", { type: "image/png" }),
        new File(["c"], "c.png", { type: "image/png" }),
      ]);
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(2);
    });

    act(() => {
      first.resolve();
    });

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(3);
    });

    act(() => {
      second.resolve();
      third.resolve();
    });

    await waitFor(() => {
      expect(result.current.items.every((item) => item.status === "success")).toBe(true);
    });
  });

  test("can retry a failed queue item", async () => {
    let shouldFail = true;
    const uploadFile = vi.fn(async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("boom");
      }
    });

    const { result } = renderHook(() =>
      useUploadQueue({
        createUploadTask: () => ({
          promise: uploadFile(),
          cancel: vi.fn(),
        }),
      })
    );

    act(() => {
      result.current.enqueueFiles([new File(["a"], "a.png", { type: "image/png" })]);
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("error");
    });

    act(() => {
      result.current.retryItem(result.current.items[0].id);
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("success");
    });
  });

  test("can cancel queued uploads", async () => {
    const pending = deferred<void>();
    const cancelSpy = vi.fn();
    const { result } = renderHook(() =>
      useUploadQueue({
        createUploadTask: () => ({
          promise: pending.promise,
          cancel: cancelSpy,
        }),
      })
    );

    act(() => {
      result.current.enqueueFiles([new File(["a"], "a.png", { type: "image/png" })]);
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("uploading");
    });

    act(() => {
      result.current.cancelItem(result.current.items[0].id);
    });

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(result.current.items[0]?.status).toBe("cancelled");
  });
});
