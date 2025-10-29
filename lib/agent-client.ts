/**
 * Agent API客户端 - 用于从Nezha Agent接收器获取实时系统监控数据
 */

export interface AgentServerInfo {
  id: number;
  name: string;
  remote_addr: string;
  uuid?: string;
  platform: string;
  platform_version: string;
  arch: string;
  version: string;
  status: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
  country?: string;
  real_ip?: string;
}

export interface AgentHostInfo {
  id: number;
  remote_addr: string;
  platform: string;
  platform_version: string;
  cpu: string[];
  mem_total: number;
  disk_total: number;
  swap_total: number;
  arch: string;
  virtualization: string;
  boot_time: number;
  version: string;
  gpu: string[];
  created_at: string;
}

export interface AgentStateInfo {
  id: number;
  agent_id: number;
  remote_addr: string;
  cpu: number;
  mem_used: number;
  swap_used: number;
  disk_used: number;
  net_in_transfer: number;
  net_out_transfer: number;
  net_in_speed: number;
  net_out_speed: number;
  uptime: number;
  load1: number;
  load5: number;
  load15: number;
  tcp_conn_count: number;
  udp_conn_count: number;
  process_count: number;
  temperatures: Array<{
    name: string;
    temperature: number;
  }>;
  gpu: number[];
  created_at: string;
}

export interface AgentGeoIPInfo {
  id: number;
  remote_addr: string;
  use6: boolean;
  ipv4: string;
  ipv6: string;
  country_code: string;
  region: string;
  city: string;
  dashboard_boot_time: number;
  created_at: string;
}

export interface AgentHealthResponse {
  status: string;
  timestamp: number;
  version: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  status: "online" | "offline" | "unknown";
  lastSeen: Date;
  location?: {
    country: string;
    region: string;
    city: string;
    ip: string;
  };
  originalId?: number; // 保存API返回的原始ID
}

export class AgentClient {
  public readonly baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // 移除末尾的斜杠
    this.apiKey = apiKey || "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 添加时间戳参数来破坏 CDN 缓存
    const timestamp = Date.now();
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.baseUrl}${endpoint}${separator}_t=${timestamp}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // 移除可能导致CORS问题的缓存控制头
      // "Cache-Control": "no-cache, no-store, must-revalidate",
      // Pragma: "no-cache",
      // Expires: "0",
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Agent API请求失败: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * 检查agent接收器健康状态
   */
  async checkHealth(): Promise<AgentHealthResponse> {
    return this.request<AgentHealthResponse>("/api/v1/health");
  }

  /**
   * 获取所有代理信息
   */
  async getAgents(limit = 10, offset = 0): Promise<AgentServerInfo[]> {
    return this.request<AgentServerInfo[]>(
      `/api/v1/agents?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 获取所有主机信息
   */
  async getHosts(limit = 10, offset = 0): Promise<AgentHostInfo[]> {
    return this.request<AgentHostInfo[]>(
      `/api/v1/hosts?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 获取特定主机信息
   */
  async getHost(id: number): Promise<AgentHostInfo> {
    return this.request<AgentHostInfo>(`/api/v1/hosts/${id}`);
  }

  /**
   * 获取所有系统状态信息
   */
  async getStates(limit = 10, offset = 0): Promise<AgentStateInfo[]> {
    return this.request<AgentStateInfo[]>(
      `/api/v1/states?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 获取特定系统状态信息
   */
  async getState(id: number): Promise<AgentStateInfo> {
    return this.request<AgentStateInfo>(`/api/v1/states/${id}`);
  }

  /**
   * 获取最新的系统状态信息（服务端已按时间排序）
   */
  async getLatestStates(limit = 5): Promise<AgentStateInfo[]> {
    return this.getStates(limit, 0);
  }

  /**
   * 获取所有GeoIP信息
   */
  async getGeoIPs(limit = 10, offset = 0): Promise<AgentGeoIPInfo[]> {
    return this.request<AgentGeoIPInfo[]>(
      `/api/v1/geoips?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * 获取特定GeoIP信息
   */
  async getGeoIP(id: number): Promise<AgentGeoIPInfo> {
    return this.request<AgentGeoIPInfo>(`/api/v1/geoips/${id}`);
  }

  /**
   * 获取实时系统监控数据（整合主机和状态信息）
   */
  async getRealtimeSystemData(): Promise<{
    hosts: AgentHostInfo[];
    latestStates: AgentStateInfo[];
    health: AgentHealthResponse;
  }> {
    try {
      const [hosts, latestStates, health] = await Promise.all([
        this.getHosts(5, 0),
        this.getLatestStates(5),
        this.checkHealth(),
      ]);

      return {
        hosts,
        latestStates,
        health,
      };
    } catch (error) {
      console.error("获取实时系统数据失败:", error);
      throw error;
    }
  }
}

// 创建默认的agent客户端实例
export const createAgentClient = (baseUrl?: string, apiKey?: string) => {
  // 优先使用CF Worker代理，然后是直接连接
  const defaultUrl =
    process.env.NEXT_PUBLIC_AGENT_PROXY_URL ||
    process.env.NEXT_PUBLIC_AGENT_API_URL ||
    "http://localhost:8080";
  const defaultApiKey = process.env.NEXT_PUBLIC_AGENT_API_KEY || "";

  return new AgentClient(baseUrl || defaultUrl, apiKey || defaultApiKey);
};

// 默认导出
export default AgentClient;
