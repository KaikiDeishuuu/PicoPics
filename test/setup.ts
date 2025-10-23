import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// 启动 MSW 服务器
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// 重置所有处理器
afterEach(() => server.resetHandlers());

// 关闭服务器
afterAll(() => server.close());


