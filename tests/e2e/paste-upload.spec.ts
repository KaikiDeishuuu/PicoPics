import { expect, test } from "@playwright/test";

const mockAuth = {
  user: { id: 1, login: "e2e-user" },
  accessToken: "fake-token",
};

test.describe("paste upload queue", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((auth) => {
      window.localStorage.setItem("auth", JSON.stringify(auth));
    }, mockAuth);
  });

  test("queues pasted image and shows uploaded state", async ({ page }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "test-id",
            url: "https://example.com/test.png",
            filename: "test.png",
            size: 4,
            type: "image/png",
            uploadedAt: new Date().toISOString(),
            r2ObjectKey: "images/2026-04-24/test.png",
          },
        }),
      });
    });

    await page.goto("/upload");
    await expect(page.getByText("上传队列")).toBeVisible();

    await page.evaluate(() => {
      const file = new File(["test"], "pasted.png", { type: "image/png" });
      const clipboardData = {
        items: [
          {
            kind: "file",
            getAsFile: () => file,
          },
        ],
        files: [file],
      };
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", {
        value: clipboardData,
      });
      window.dispatchEvent(event);
    });

    await expect(page.getByText("pasted.png")).toBeVisible();
    await expect(page.getByText("success")).toBeVisible();
  });

  test("ignores non-image paste content", async ({ page }) => {
    await page.goto("/upload");

    await page.evaluate(() => {
      const clipboardData = {
        items: [
          {
            kind: "string",
            getAsFile: () => null,
          },
        ],
        files: [],
      };
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", {
        value: clipboardData,
      });
      window.dispatchEvent(event);
    });

    await expect(page.getByText("当前队列为空。")).toBeVisible();
  });
});
