"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart3, CreditCard, Home, MessageSquare, Settings, Users } from "lucide-react"

const items = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Groups",
    href: "/groups",
    icon: Users,
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: CreditCard,
  },
  {
    title: "Budget",
    href: "/budget",
    icon: BarChart3,
  },
  {
    title: "Community",
    href: "/community",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <span className="hidden font-bold sm:inline-block text-primary">TabX</span>
      </Link>
      <nav className="hidden gap-6 md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              pathname === item.href ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  )
}

