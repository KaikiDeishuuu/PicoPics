import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// 设置 MSW 服务器
export const server = setupServer(...handlers);
