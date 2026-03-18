import { NextRequest, NextResponse } from "next/server";
import { sendContactEmailViaSendGrid } from "@/lib/email/sendgrid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      name,
      email,
      description,
      attachmentKeys = [],
      attachmentNames = [],
    } = body;

    if (!type || !name || !email || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Map contact types to friendly names
    const typeLabels: Record<string, string> = {
      issue: "Issue Report",
      idea: "Feature Idea",
      kudos: "Kudos",
      other: "General Inquiry",
    };

    const typeLabel = typeLabels[type] || "Contact Form";

    await sendContactEmailViaSendGrid({
      type: typeLabel,
      name,
      email,
      description,
      attachmentKeys,
      attachmentNames,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}