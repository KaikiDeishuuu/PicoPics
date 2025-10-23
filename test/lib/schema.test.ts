import { describe, expect, it } from "vitest";
import { ImageHistorySchema, UserSchema } from "@/lib/schema";

describe("Schema Validation", () => {
  describe("ImageHistorySchema", () => {
    it("should validate valid history data", () => {
      const validData = {
        id: 1,
        fileName: "test.jpg",
        url: "https://example.com/image.jpg",
        size: 1024,
        type: "image/jpeg",
        uploadedAt: "2024-01-01T00:00:00Z",
        r2ObjectKey: "test-key",
      };

      const result = ImageHistorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("UserSchema", () => {
    it("should validate valid user data", () => {
      const validData = {
        id: 12345,
        login: "testuser",
        name: "Test User",
        email: "test@example.com",
        avatar_url: "https://example.com/avatar.jpg",
      };

      const result = UserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
