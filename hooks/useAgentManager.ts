import { useState, useEffect, useCallback } from "react";
import { AgentInfo, createAgentClient, AgentClient } from "@/lib/agent-client";

const STORAGE_KEY = "pico_agents";
const DEFAULT_AGENT_ID = "default";

// 生成随机名称
const generateRandomName = () => {
  const adjectives = [
    "Swift",
    "Reliable",
    "Powerful",
    "Efficient",
    "Stable",
    "Fast",
    "Secure",
    "Smart",
  ];
  const nouns = [
    "Server",
    "Node",
    "Agent",
    "Host",
    "Machine",
    "System",
    "Core",
    "Hub",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj} ${noun} ${num}`;
};

export const useAgentManager = () => {
  const [agents, setAgents] = useState<AgentInfo[]>(() => {
    // 立即初始化默认 agent（服务端和客户端都提供默认值）
    return [
      {
        id: DEFAULT_AGENT_ID,
        name: "Main Server",
        url:
          process.env.NEXT_PUBLIC_AGENT_API_URL || "https://ag1nt.lambdax.me",
        apiKey:
          process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here",
        status: "unknown",
        lastSeen: new Date(),
      },
    ];
  });
  const [selectedAgentId, setSelectedAgentId] =
    useState<string>(DEFAULT_AGENT_ID);
  const [isLoading, setIsLoading] = useState(false);

  // 从 localStorage 加载 agents
  useEffect(() => {
    // 检查是否在浏览器环境中
    if (typeof window === "undefined") return;

    const savedAgents = localStorage.getItem(STORAGE_KEY);
    if (savedAgents) {
      try {
        const parsedAgents = JSON.parse(savedAgents).map((agent: any) => ({
          ...agent,
          lastSeen: new Date(agent.lastSeen),
        }));
        setAgents(parsedAgents);
      } catch (error) {
        console.error("Failed to parse saved agents:", error);
        // 如果解析失败，使用默认 agent
        initializeDefaultAgent();
      }
    } else {
      // 初始化默认 agent
      initializeDefaultAgent();
    }
  }, []);

  // 组件加载时从API获取最新数据
  useEffect(() => {
    // 延迟调用以避免在fetchAgentsFromAPI定义之前调用
    const timer = setTimeout(() => {
      console.log("🔄 组件加载，开始获取agents数据");
      fetchAgentsFromAPI();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 初始化默认 agent 的函数
  const initializeDefaultAgent = () => {
    const defaultAgent: AgentInfo = {
      id: DEFAULT_AGENT_ID,
      name: "Main Server",
      url: process.env.NEXT_PUBLIC_AGENT_API_URL || "https://ag1nt.lambdax.me",
      apiKey:
        process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here",
      status: "unknown",
      lastSeen: new Date(),
    };
    setAgents([defaultAgent]);
    if (typeof window !== "undefined") {
      saveAgents([defaultAgent]);
    }
  };

  // 保存 agents 到 localStorage
  const saveAgents = useCallback((agentsToSave: AgentInfo[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agentsToSave));
    }
  }, []);

  // 添加新 agent
  const addAgent = useCallback(
    (url: string, apiKey: string) => {
      const newAgent: AgentInfo = {
        id: `agent_${Date.now()}`,
        name: generateRandomName(),
        url: url.endsWith("/") ? url.slice(0, -1) : url,
        apiKey,
        status: "unknown",
        lastSeen: new Date(),
      };

      const updatedAgents = [...agents, newAgent];
      setAgents(updatedAgents);
      saveAgents(updatedAgents);
      return newAgent.id;
    },
    [agents, saveAgents]
  );

  // 更新 agent 信息
  const updateAgent = useCallback(
    (id: string, updates: Partial<AgentInfo>) => {
      const updatedAgents = agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      );
      setAgents(updatedAgents);
      saveAgents(updatedAgents);
    },
    [agents, saveAgents]
  );

  // 更新 agent 名称
  const updateAgentName = useCallback(
    async (id: string, name: string) => {
      try {
        console.log("🔄 开始更新agent名称:", {
          id,
          name,
          idType: typeof id,
          idLength: id.length,
        });

        // 先更新本地状态
        updateAgent(id, { name });
        console.log("✅ 本地状态已更新");

        // 使用agent的id作为UUID（id本身就是UUID）
        const agentUuid = id;

        // 从当前agents列表中获取agent的完整信息
        const currentAgent = agents.find((agent) => agent.id === id);
        if (!currentAgent) {
          console.error("❌ 未找到要更新的agent:", id);
          return;
        }

        // 使用当前agent的IP和location信息
        const ip = currentAgent.location?.ip || "";
        const location = currentAgent.location?.country || "";

        console.log("📡 使用当前agent信息:", {
          uuid: agentUuid,
          name,
          ip,
          location,
          originalId: currentAgent.originalId,
        });

        // 同步到Cloudflare Worker，使用UUID
        const workerUrl =
          process.env.NEXT_PUBLIC_AGENT_DATABASE_WORKER_URL ||
          "https://your-agent-database.workers.dev";

        const response = await fetch(`${workerUrl}/api/agents/update-name`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentUuid,
            name,
            ip,
            location,
            originalId: currentAgent.originalId,
            status: currentAgent.status,
            lastSeen: currentAgent.lastSeen.toISOString(),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ 服务器同步失败:", response.status, errorText);
          throw new Error(`服务器同步失败: ${response.status} ${errorText}`);
        } else {
          const result = await response.json();
          console.log("✅ 服务器同步成功:", result);

          // 保存成功后，重新从API获取agents数据以更新显示
          console.log("🔄 重新获取agents数据以更新显示");
          setTimeout(async () => {
            try {
              await fetchAgentsFromAPI();
            } catch (error) {
              console.error("重新获取agents数据失败:", error);
            }
          }, 100);
        }
      } catch (error) {
        console.error("❌ 更新agent名称时出错:", error);
        // 如果更新失败，恢复本地状态
        const originalAgent = agents.find((agent) => agent.id === id);
        if (originalAgent) {
          updateAgent(id, { name: originalAgent.name });
        }
      }
    },
    [updateAgent, agents]
  );

  // 删除 agent
  const removeAgent = useCallback(
    (id: string) => {
      if (id === DEFAULT_AGENT_ID) return; // 不能删除默认 agent

      const updatedAgents = agents.filter((agent) => agent.id !== id);
      setAgents(updatedAgents);
      saveAgents(updatedAgents);

      // 如果删除的是当前选中的 agent，切换到默认 agent
      if (selectedAgentId === id) {
        setSelectedAgentId(DEFAULT_AGENT_ID);
      }
    },
    [agents, selectedAgentId, saveAgents]
  );

  // 获取当前选中的 agent
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ||
    agents[0] || {
      id: DEFAULT_AGENT_ID,
      name: "Main Server",
      url: process.env.NEXT_PUBLIC_AGENT_API_URL || "https://ag1nt.lambdax.me",
      apiKey:
        process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here",
      status: "unknown" as const,
      lastSeen: new Date(),
    };

  // 检查 agent 状态
  const checkAgentStatus = useCallback(
    async (agent: AgentInfo) => {
      try {
        const response = await fetch(`${agent.url}/api/v1/health`, {
          headers: {
            "X-API-Key": agent.apiKey,
          },
        });

        if (response.ok) {
          updateAgent(agent.id, {
            status: "online",
            lastSeen: new Date(),
          });
          return true;
        } else {
          updateAgent(agent.id, { status: "offline" });
          return false;
        }
      } catch (error) {
        updateAgent(agent.id, { status: "offline" });
        return false;
      }
    },
    [updateAgent]
  );

  // 检查所有 agents 状态
  const checkAllAgentsStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all(agents.map((agent) => checkAgentStatus(agent)));
    } finally {
      setIsLoading(false);
    }
  }, [agents, checkAgentStatus]);

  // 从API获取真实的agents列表，并从D1获取自定义名称进行映射
  const fetchAgentsFromAPI = useCallback(async () => {
    try {
      // 1. 从API获取agents数据
      const agentClient = new AgentClient(
        process.env.NEXT_PUBLIC_AGENT_API_URL || "https://your-agent-api.com",
        process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here"
      );
      const apiAgents = await agentClient.getAgents(50, 0);
      console.log("📡 从API获取到agents数据:", { count: apiAgents.length });

      // 2. 从D1获取自定义名称映射
      let customNames: Record<string, string> = {};
      try {
        const workerUrl =
          process.env.NEXT_PUBLIC_AGENT_DATABASE_WORKER_URL ||
          "https://your-agent-database.workers.dev";
        const customNamesResponse = await fetch(
          `${workerUrl}/api/agents/custom-names`
        );
        if (customNamesResponse.ok) {
          const customNamesData = await customNamesResponse.json();
          customNames = customNamesData.customNames || {};
          console.log("📝 从D1获取到自定义名称:", {
            count: Object.keys(customNames).length,
            customNames: customNames,
          });
        }
      } catch (error) {
        console.error("Failed to fetch custom names from D1:", error);
      }

      // 3. 过滤有效agents并合并数据
      const validAgents = apiAgents.filter((apiAgent: any) => {
        // 过滤掉测试数据和其他无效数据
        const isValid =
          apiAgent.uuid &&
          apiAgent.uuid !== "test" &&
          apiAgent.uuid !== "TEST" &&
          apiAgent.uuid.length > 5 && // UUID应该有一定长度
          (apiAgent.real_ip || apiAgent.remote_addr); // 必须有IP地址

        if (!isValid) {
          console.log("🚫 过滤掉无效agent:", {
            uuid: apiAgent.uuid,
            name: apiAgent.name,
            ip: apiAgent.real_ip || apiAgent.remote_addr,
          });
        }
        return isValid;
      });

      console.log("✅ 有效agents数量:", {
        total: apiAgents.length,
        valid: validAgents.length,
        filtered: apiAgents.length - validAgents.length,
      });

      // 4. 将API数据与D1自定义名称合并，并自动存储新agent到D1
      const uniqueAgents = new Map();
      const newAgentsToStore: any[] = []; // 存储需要保存到D1的新agent

      validAgents.forEach((apiAgent: any) => {
        const uuid = apiAgent.uuid;
        const customName = customNames[uuid]; // 通过UUID映射自定义名称

        console.log("🔍 处理agent:", {
          uuid,
          originalName: apiAgent.name,
          customName,
          ip: apiAgent.real_ip || apiAgent.remote_addr,
          country: apiAgent.country,
          hasCustomName: !!customName,
        });

        const agentData = {
          id: uuid,
          name:
            customName ||
            apiAgent.name ||
            `Agent-${apiAgent.real_ip || apiAgent.remote_addr}`,
          url:
            process.env.NEXT_PUBLIC_AGENT_API_URL ||
            "https://your-agent-api.com",
          apiKey:
            process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here",
          status: apiAgent.status || "unknown",
          lastSeen: new Date(apiAgent.last_seen || Date.now()),
          location: {
            country: apiAgent.country || "",
            region: "",
            city: "",
            ip: apiAgent.real_ip || apiAgent.remote_addr || "",
          },
          originalId: apiAgent.id,
        };

        // 如果D1中没有这个agent的记录，则准备存储到D1
        // 这样可以防止同一个UUID的agent被重复写入D1
        if (!customName) {
          console.log("🆕 发现新agent，准备存储到D1:", {
            uuid,
            name: agentData.name,
            originalId: apiAgent.id,
          });

          const agentToStore = {
            agentUuid: uuid,
            name: agentData.name,
            ip: agentData.location.ip,
            location: agentData.location.country,
            originalId: apiAgent.id,
            status: agentData.status,
            lastSeen: agentData.lastSeen.toISOString(),
          };

          console.log("📝 准备存储到D1的agent数据:", {
            uuid,
            name: agentToStore.name,
            ip: agentToStore.ip,
            location: agentToStore.location,
            originalId: agentToStore.originalId,
            apiCountry: apiAgent.country,
            apiRealIp: apiAgent.real_ip,
            apiRemoteAddr: apiAgent.remote_addr,
          });

          newAgentsToStore.push(agentToStore);
        } else {
          console.log("✅ Agent已存在于D1中，跳过存储:", {
            uuid,
            customName,
          });
        }

        // 使用UUID去重
        if (!uniqueAgents.has(uuid)) {
          uniqueAgents.set(uuid, agentData);
        } else {
          // 如果已存在，比较时间戳，保留最新的
          const existing = uniqueAgents.get(uuid);
          const existingTime = new Date(existing.lastSeen).getTime();
          const currentTime = new Date(agentData.lastSeen).getTime();

          if (currentTime > existingTime) {
            uniqueAgents.set(uuid, agentData);
          }
        }
      });

      // 5. 将新agent存储到D1
      if (newAgentsToStore.length > 0) {
        console.log("📝 发现新agent，准备存储到D1:", newAgentsToStore.length);

        try {
          const workerUrl =
            process.env.NEXT_PUBLIC_AGENT_DATABASE_WORKER_URL ||
            "https://your-agent-database.workers.dev";

          // 批量存储新agent到D1
          const storePromises = newAgentsToStore.map(async (agent) => {
            try {
              const response = await fetch(
                `${workerUrl}/api/agents/update-name`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(agent),
                }
              );

              if (response.ok) {
                console.log("✅ 新agent已存储到D1:", agent.agentUuid);
              } else {
                console.error(
                  "❌ 存储新agent失败:",
                  agent.agentUuid,
                  await response.text()
                );
              }
            } catch (error) {
              console.error("❌ 存储新agent时出错:", agent.agentUuid, error);
            }
          });

          await Promise.all(storePromises);
        } catch (error) {
          console.error("❌ 批量存储新agent到D1失败:", error);
        }
      }

      // 6. 更新agents列表
      const newAgents = Array.from(uniqueAgents.values());
      console.log("🔄 更新agents列表:", {
        count: newAgents.length,
        agents: newAgents.map((a) => ({
          id: a.id,
          name: a.name,
          ip: a.location.ip,
          hasCustomName: customNames[a.id] ? true : false,
        })),
      });

      setAgents(newAgents);
      saveAgents(newAgents);

      return newAgents;
    } catch (error) {
      console.error("Failed to fetch agents from API:", error);
      return [];
    }
  }, [saveAgents]);

  // 自动发现新 agents（扫描常见端口和路径）
  const discoverAgents = useCallback(async () => {
    const commonPorts = [8081, 8080, 3000, 5000];
    const commonPaths = ["/api/v1/health", "/health", "/status"];

    // 这里可以实现自动发现逻辑
    // 例如扫描本地网络或预定义的地址范围
    console.log("Agent discovery not implemented yet");
  }, []);

  return {
    agents,
    selectedAgentId,
    selectedAgent,
    isLoading,
    setSelectedAgentId,
    addAgent,
    updateAgent,
    updateAgentName,
    removeAgent,
    checkAgentStatus,
    checkAllAgentsStatus,
    discoverAgents,
    fetchAgentsFromAPI,
  };
};
