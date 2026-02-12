"use client";

import React, { useEffect, useState } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertMessageProps {
  type: AlertType;
  message: string;
  description?: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  duration?: number;
}

const ALERT_STYLES: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "bg-green-50",
    border: "border-l-4 border-green-500",
    text: "text-green-800",
    icon: "text-green-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-l-4 border-red-500",
    text: "text-red-800",
    icon: "text-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-l-4 border-amber-500",
    text: "text-amber-800",
    icon: "text-amber-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-l-4 border-blue-500",
    text: "text-blue-800",
    icon: "text-blue-500",
  },
};

const ALERT_ICONS: Record<AlertType, React.ReactNode> = {
  success: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

export default function AlertMessage({
  type,
  message,
  description,
  onDismiss,
  autoDismiss = false,
  duration = 5000,
}: AlertMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, duration, onDismiss]);

  if (!visible) return null;

  const style = ALERT_STYLES[type];

  return (
    <div className={`${style.bg} ${style.border} rounded-r-lg p-4 mb-4`} role="alert">
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${style.icon}`}>
          {ALERT_ICONS[type]}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-semibold ${style.text}`}>{message}</p>
          {description && (
            <p className={`text-sm mt-1 ${style.text} opacity-90`}>{description}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className={`flex-shrink-0 ml-3 ${style.text} opacity-60 hover:opacity-100 transition-opacity`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
