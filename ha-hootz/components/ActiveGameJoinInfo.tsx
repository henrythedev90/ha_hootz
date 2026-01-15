"use client";

import { useState, useEffect } from "react";
import { Copy, Check, QrCode } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ActiveGameJoinInfoProps {
  sessionCode: string;
}

export default function ActiveGameJoinInfo({
  sessionCode,
}: ActiveGameJoinInfoProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${sessionCode}`
      : `/join/${sessionCode}`;

  useEffect(() => {
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
        setQrLoading(false);
      }
    };

    fetchQRCode();
  }, [sessionCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-bg rounded-xl border-2 border-indigo/30 shadow-lg p-5"
    >
      <div
        className="flex items-center justify-center gap-2 mb-4 pb-3"
        style={{ borderBottom: "2px solid #6366f1" }}
      >
        <QrCode className="w-5 h-5 text-cyan" />
        <h3 className="text-lg font-bold text-text-light">
          Players Can Join Anytime!!!
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[35%_65%] gap-4">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 bg-white rounded-lg flex items-center justify-center border-2 border-indigo/30 mb-3">
            {qrLoading ? (
              <div className="text-text-light/40 text-xs">Loading...</div>
            ) : qrCodeDataUrl ? (
              <Image
                src={qrCodeDataUrl}
                alt="QR Code"
                fill
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <div className="text-error text-xs text-center px-2">
                Failed to load
              </div>
            )}
          </div>
          <p
            className="text-sm font-bold text-center"
            style={{ color: "#6366f1" }}
          >
            Scan to join
          </p>
        </div>

        {/* Join URL */}
        <div className="flex flex-col justify-start h-full">
          <div className="w-full">
            <p
              className="text-base font-bold mb-3"
              style={{ color: "#6366f1" }}
            >
              Join URL
            </p>
            <div className="flex items-center gap-3 bg-deep-navy/50 rounded-lg p-4 border border-indigo/20">
              <p className="text-xs md:text-base text-text-light/90 font-mono whitespace-nowrap overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-indigo/30 scrollbar-track-transparent text-center">
                {typeof window !== "undefined" ? (
                  <>
                    {window.location.origin}/join/
                    <span style={{ color: "#22d3ee" }} className="font-bold">
                      {sessionCode}
                    </span>
                  </>
                ) : (
                  <>
                    /join/
                    <span style={{ color: "#22d3ee" }} className="font-bold">
                      {sessionCode}
                    </span>
                  </>
                )}
              </p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-3 bg-indigo/20 hover:bg-indigo/30 border border-indigo/30 rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <Copy className="w-5 h-5 text-indigo" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
