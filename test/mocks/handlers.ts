import { HttpResponse, http } from "msw";

export const handlers = [
  // 上传 API
  http.post("https://uploader-worker-v2-prod.haoweiw370.workers.dev/upload", () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: "test-image-id",
        url: "https://cdn-worker-v2-prod.haoweiw370.workers.dev/test-image.jpg",
        filename: "test-image.jpg",
        size: 1024,
        type: "image/jpeg",
      },
    });
  }),

  // 历史记录 API
  http.get("https://history-worker-v2-prod.haoweiw370.workers.dev/api/history", () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          fileName: "test-image.jpg",
          url: "https://cdn-worker-v2-prod.haoweiw370.workers.dev/test-image.jpg",
          size: 1024,
          type: "image/jpeg",
          uploadedAt: "2024-01-01T00:00:00Z",
          r2ObjectKey: "test-image.jpg",
        },
      ],
    });
  }),

  // GitHub OAuth API
  http.get("https://api.github.com/user", () => {
    return HttpResponse.json({
      id: 12345,
      login: "testuser",
      name: "Test User",
      email: "test@example.com",
      avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
    });
  }),

  // 配额 API
  http.get("https://uploader-worker-v2-prod.haoweiw370.workers.dev/api/quota", () => {
    return HttpResponse.json({
      success: true,
      data: {
        used: 1024,
        limit: 104857600, // 100MB
        percentage: 0.001,
      },
    });
  }),

  // 清空存储 API
  http.post("https://uploader-worker-v2-prod.haoweiw370.workers.dev/api/clear-storage", () => {
    return HttpResponse.json({
      success: true,
      message: "存储已清空",
      deleted: {
        r2Objects: ["test-image.jpg"],
        dbRecords: 1,
      },
    });
  }),
];


