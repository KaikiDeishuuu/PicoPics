import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database-aws";

export async function GET(request: NextRequest) {
  try {
    const customNames = await database.getAllAgentCustomNames();
    
    return NextResponse.json({ 
      success: true, 
      customNames 
    });

  } catch (error) {
    console.error("Error getting agent custom names:", error);
    return NextResponse.json(
      { error: "Failed to get agent custom names" },
      { status: 500 }
    );
  }
}
