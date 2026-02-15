"use client";

import { User } from "./hooks/useAuth";

interface HeaderProps {
  user: User;
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-30 h-[72px]">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger menu — visible only on mobile */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-sm text-gray-600 truncate hidden sm:inline">
              {user.centre.name}
            </span>
            <button className="text-gray-500 hover:text-gray-700 flex-shrink-0" aria-label="Notifications">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
