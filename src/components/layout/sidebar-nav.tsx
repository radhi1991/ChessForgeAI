
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Bot,
  Settings,
  Puzzle,
  BrainCircuit,
  BookOpen, // Added for Learn section
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";


export interface NavItem {
  title: string;
  href?: string; // Optional for parent items with sub-menus
  icon: React.ReactNode;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
  active?: boolean; // Explicitly set active state, overrides path checking
  items?: NavItem[]; // For sub-menus
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard size={18} />,
    description: "Overview of your chess progress.",
  },
  {
    title: "Game Analysis",
    href: "/analysis",
    icon: <FileText size={18} />,
    description: "Import and analyze your games.",
  },
  {
    title: "Train with Bot",
    href: "/train",
    icon: <Bot size={18} />,
    description: "Practice against an AI training partner.",
  },
  {
    title: "Learn",
    icon: <BookOpen size={18} />,
    description: "Improve your chess knowledge.",
    items: [
      {
        title: "Puzzles",
        href: "/learn/puzzles", 
        icon: <Puzzle size={16} />,
        description: "Solve tactical puzzles.",
      },
      {
        title: "Openings",
        href: "/learn/openings",
        icon: <BrainCircuit size={16} />,
        description: "Study chess openings.",
      }
    ]
  }
];


export function SidebarNav() {
  const pathname = usePathname();

  if (!navItems?.length) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarMenu>
        {navItems.map((item, index) => {
          const isParentActive = item.items?.some(subItem => subItem.href && (pathname === subItem.href || pathname.startsWith(subItem.href)));
          const isActive = item.active ?? (item.href ? pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) : isParentActive);
          
          return (
            <SidebarMenuItem key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={item.disabled || !item.href && !item.items ? "#" : item.href || "#"}>
                    <SidebarMenuButton
                      variant="default"
                      size="default"
                      isActive={isActive}
                      aria-disabled={item.disabled}
                      className={cn(
                        item.disabled && "cursor-not-allowed opacity-50",
                        "w-full justify-start"
                      )}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate flex-grow">{item.title}</span>
                      {item.label && (
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                          {item.label}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs">
                  <p className="font-medium">{item.title}</p>
                  {item.description && <p className="text-muted-foreground">{item.description}</p>}
                </TooltipContent>
              </Tooltip>
              {/* Render sub-menu if items exist */}
              {item.items && item.items.length > 0 && (
                <SidebarMenuSub>
                  {item.items.map((subItem, subIndex) => {
                    const isSubActive = subItem.active ?? (subItem.href ? pathname === subItem.href || pathname.startsWith(subItem.href) : false);
                    return (
                      <SidebarMenuSubItem key={subIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={subItem.disabled || !subItem.href ? "#" : subItem.href}>
                                <SidebarMenuSubButton
                                  size="md"
                                  isActive={isSubActive}
                                  aria-disabled={subItem.disabled}
                                  className={cn(
                                    subItem.disabled && "cursor-not-allowed opacity-50",
                                    "w-full justify-start"
                                  )}
                                >
                                  {subItem.icon && <span className="mr-2 shrink-0">{subItem.icon}</span>}
                                  <span className="truncate flex-grow">{subItem.title}</span>
                                </SidebarMenuSubButton>
                              </Link>
                            </TooltipTrigger>
                          <TooltipContent side="right" align="center" className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg text-xs">
                            <p className="font-medium">{subItem.title}</p>
                            {subItem.description && <p className="text-muted-foreground">{subItem.description}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </TooltipProvider>
  );
}
