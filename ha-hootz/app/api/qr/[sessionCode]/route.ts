import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;

    // Validate session code format
    if (!/^\d{6}$/.test(sessionCode)) {
      return NextResponse.json(
        { error: "Invalid session code format" },
        { status: 400 }
      );
    }

    // Get the full join URL
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const joinUrl = `${origin}/join/${sessionCode}`;

    // Generate QR code as data URL (PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 300,
      margin: 2,
    });

    // Return as JSON with data URL
    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      joinUrl,
    });
  } catch (error: any) {
    console.error("Error generating QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
