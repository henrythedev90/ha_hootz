"use client";

import { useState, useEffect } from "react";

interface SessionQRCodeProps {
  sessionCode: string;
  joinUrl: string;
}

export default function SessionQRCode({
  sessionCode,
  joinUrl,
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

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${joinUrl}`
      : joinUrl;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Join Code: <span className="font-mono text-2xl">{sessionCode}</span>
      </h3>
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg">
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
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Scan to join
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono break-all">
            {fullUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
