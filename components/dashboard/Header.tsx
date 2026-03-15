"use client";

import React, { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { User } from "next-auth";

interface HeaderProps {
  title?: string;
  user?: User;
}

export const Header = ({ title = "Dashboard", user }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  // Get initials from name or email
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "CN";
  };

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-sidebar-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 ml-2 pl-4 border-l border-sidebar-border cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none text-foreground">
                {user?.name || user?.email || "Guest User"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">
                {user?.email || "No Email"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user?.image ? (
                <img
                  src={user.image}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
