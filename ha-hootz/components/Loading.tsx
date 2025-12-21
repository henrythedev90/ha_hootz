"use client";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({
  message = "Loading...",
  fullScreen = true,
}: LoadingProps) {
  const containerClasses = fullScreen
    ? "min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
