import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database-aws";

export async function POST(request: NextRequest) {
  try {
    const { agentUuid, name, ip, location } = await request.json();

    if (!agentUuid || !name) {
      return NextResponse.json(
        { error: "Agent UUID and name are required" },
        { status: 400 }
      );
    }

    // 保存到数据库
    const result = await database.saveAgentCustomName(
      agentUuid,
      name,
      ip,
      location
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to save agent name to database" },
        { status: 500 }
      );
    }

    console.log(`Agent name saved to database: ${name} (UUID: ${agentUuid})`);

    return NextResponse.json({
      success: true,
      message: "Agent name updated successfully",
      uuid: agentUuid,
      name: name,
    });
  } catch (error) {
    console.error("Error updating agent name:", error);
    return NextResponse.json(
      { error: "Failed to update agent name" },
      { status: 500 }
    );
  }
}
