"use client";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "motion/react";
import React, { createContext, useContext, useMemo, useState } from "react";
import { ThemeToggle } from "../theme/theme-toggle";
// import { useQuery } from "@tanstack/react-query"; // Commented out until needed
// import { userService } from "@/lib/api/services/user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Removed AvatarImage since it's not being used
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
// import { ROUTES } from "@/router/routes"; // Commented out until needed

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined,
);

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (
  props: Omit<React.ComponentProps<typeof motion.div>, "children"> & {
    children?: React.ReactNode;
  },
) => {
  return (
    <>
      <DesktopSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof motion.div>, "children"> & {
  children?: React.ReactNode;
}) => {
  const { open, animate } = useSidebar();
  const targetWidth = animate ? (open ? "250px" : "60px") : "250px";

  // Get initial width from data attribute for first render
  const initialWidth = useMemo(() => {
    if (typeof document === "undefined") return targetWidth;
    const dataAttr = document.documentElement.getAttribute("data-sidebar-open");
    const isOpen = dataAttr === null ? true : dataAttr === "true";
    return isOpen ? "250px" : "60px";
  }, []);

  return (
    <>
      <motion.div
        data-sidebar
        className={cn(
          "h-full px-4 py-4 hidden  md:flex md:flex-col bg-sidebar shrink-0",
          className,
        )}
        initial={{
          width: initialWidth,
        }}
        animate={{
          width: targetWidth,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        {...props}
      >
        {children}
        <div className="flex flex-col gap-2">
          <ThemeToggle />
          <ProfileLink />
          <SidebarToggle />
        </div>
      </motion.div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      to={link.href}
      className={cn(
        "flex items-center justify-start gap-2  group/sidebar py-2",
        className,
      )}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          width: animate ? (open ? "auto" : 0) : "auto",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="text-sidebar-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre overflow-hidden inline-block p-0! m-0!"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const SidebarToggle = () => {
  const { open, animate, setOpen } = useSidebar();

  return (
    <Button
      variant="ghost"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 pl-0 hover:bg-transparent text-foreground hover:text-foreground font-normal",
      )}
    >
      <div className="w-5 h-5 shrink-0 flex items-center justify-center scale-125">
        {open ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </div>

      <motion.span
        animate={{
          width: animate ? (open ? "auto" : 0) : "auto",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="text-sidebar-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre overflow-hidden inline-block p-0! m-0!"
      >
        Close Sidebar
      </motion.span>
    </Button>
  );
};

export const ProfileLink = () => {
  const { open, animate } = useSidebar();
  const { user } = useAuth();

  if (!user) return null;

  // properties from supabase user metadata or fallback
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatarUrl = user.user_metadata?.avatar_url;
  const initials = fullName.charAt(0).toUpperCase();

  return (
    <Link
      to="/profile"
      className={cn("flex items-center justify-start gap-2 group/sidebar py-2")}
    >
      <Avatar className="h-5 w-5 shrink-0">
        {avatarUrl ? (
          <img
            key={avatarUrl}
            src={avatarUrl}
            alt={fullName}
            className="h-full w-full object-cover"
          />
        ) : (
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        )}
      </Avatar>

      <motion.span
        animate={{
          width: animate ? (open ? "auto" : 0) : "auto",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="text-sidebar-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre overflow-hidden inline-block p-0! m-0!"
      >
        {fullName}
      </motion.span>
    </Link>
  );
};
