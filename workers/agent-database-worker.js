// Cloudflare Worker for Agent Database Operations
// 这个Worker将处理agent名称的读写操作

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 设置CORS头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // 路由处理
      if (
        url.pathname === "/api/agents/update-name" &&
        request.method === "POST"
      ) {
        return await handleUpdateAgentName(request, env, corsHeaders);
      } else if (
        url.pathname === "/api/agents/custom-names" &&
        request.method === "GET"
      ) {
        return await handleGetCustomNames(request, env, corsHeaders);
      } else if (
        url.pathname === "/api/agents/init-table" &&
        request.method === "POST"
      ) {
        return await handleInitTable(request, env, corsHeaders);
      } else {
        return new Response("Not Found", {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

// 处理更新agent名称
async function handleUpdateAgentName(request, env, corsHeaders) {
  try {
    const { agentUuid, name, ip, location, originalId, status, lastSeen } =
      await request.json();

    if (!agentUuid || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Agent UUID and name are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Updating agent:", {
      agentUuid,
      name,
      ip,
      location,
      originalId,
      status,
      lastSeen,
    });

    // 使用D1数据库 - 更新或插入agent信息
    const result = await env.DB.prepare(
      `
      INSERT OR REPLACE INTO agent_custom_names (
        uuid, custom_name, ip, location, original_id, status, last_seen, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    )
      .bind(
        agentUuid,
        name,
        ip || "",
        location || "",
        originalId || null,
        status || "unknown",
        lastSeen || new Date().toISOString()
      )
      .run();

    console.log(`Agent updated successfully: ${name} (UUID: ${agentUuid})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Agent updated successfully",
        uuid: agentUuid,
        name: name,
        ip: ip,
        location: location,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating agent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to update agent: " + error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// 处理获取自定义名称
async function handleGetCustomNames(request, env, corsHeaders) {
  try {
    const result = await env.DB.prepare(
      `
      SELECT uuid, custom_name FROM agent_custom_names
    `
    ).all();

    const customNames = {};
    result.results.forEach((row) => {
      customNames[row.uuid] = row.custom_name;
    });

    return new Response(
      JSON.stringify({
        success: true,
        customNames: customNames,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error getting custom names:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to get custom names",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// 处理初始化表
async function handleInitTable(request, env, corsHeaders) {
  try {
    // 首先创建表（如果不存在）
    await env.DB.prepare(
      `
      CREATE TABLE IF NOT EXISTS agent_custom_names (
        uuid TEXT PRIMARY KEY,
        custom_name TEXT NOT NULL,
        ip TEXT,
        location TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    ).run();

    // 添加新列（如果不存在）
    try {
      await env.DB.prepare(
        `ALTER TABLE agent_custom_names ADD COLUMN original_id INTEGER`
      ).run();
    } catch (error) {
      // 列可能已经存在，忽略错误
      console.log("original_id column may already exist:", error.message);
    }

    try {
      await env.DB.prepare(
        `ALTER TABLE agent_custom_names ADD COLUMN status TEXT DEFAULT 'unknown'`
      ).run();
    } catch (error) {
      // 列可能已经存在，忽略错误
      console.log("status column may already exist:", error.message);
    }

    try {
      await env.DB.prepare(
        `ALTER TABLE agent_custom_names ADD COLUMN last_seen DATETIME`
      ).run();
    } catch (error) {
      // 列可能已经存在，忽略错误
      console.log("last_seen column may already exist:", error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Table initialized and updated successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error initializing table:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to initialize table: " + error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
