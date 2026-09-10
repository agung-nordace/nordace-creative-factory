import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("sync_state")
      .select("*")
      .eq("source", "nordace_creatives")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connected successfully",
      data,
    });
  } catch (error) {
    console.error("Supabase test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}