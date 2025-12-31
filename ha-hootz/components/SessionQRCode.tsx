"use client";

import { useState, useEffect } from "react";

interface SessionQRCodeProps {
  sessionCode: string;
  joinUrl: string;
  variant?: "default" | "minimal";
}

export default function SessionQRCode({
  sessionCode,
  joinUrl,
  variant = "default",
}: SessionQRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch QR code from API
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/qr/${sessionCode}`);
        const data = await response.json();
        if (data.qrCode) {
          setQrCodeDataUrl(data.qrCode);
        }
      } catch (error) {
        console.error("Error fetching QR code:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [sessionCode]);

  // Minimal variant - just the QR code image
  if (variant === "minimal") {
    return (
      <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center border-4 border-[#0B1020]">
        {loading ? (
          <div className="text-[#0B1020]/40">Loading QR code...</div>
        ) : qrCodeDataUrl ? (
          <img
            src={qrCodeDataUrl}
            alt="QR Code"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="text-red-500 text-sm text-center px-4">
            Failed to load QR code
          </div>
        )}
      </div>
    );
  }

  // Default variant - full component with all features
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${joinUrl}`
      : joinUrl;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Join Code: <span className="font-mono text-2xl">{sessionCode}</span>
      </h3>

      <div className="space-y-6">
        {/* Method 1: QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📱</span>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Scan QR Code to Join
            </h4>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            {loading ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div className="text-gray-400">Loading QR code...</div>
              </div>
            ) : qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-[200px] h-[200px]"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-red-500">
                Failed to load QR code
              </div>
            )}
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center">
            Scan with your phone camera
          </p>
          <div className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1 text-center">
              Or copy this link:
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 font-mono break-all text-center">
              {fullUrl}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
