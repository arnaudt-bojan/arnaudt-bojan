import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, PlusCircle, ShoppingCart, Users, Eye } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface WholesaleLayoutProps {
  children: ReactNode;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "/wholesale/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/wholesale/products",
    icon: Package,
  },
  {
    title: "Create Product",
    url: "/wholesale/products/create",
    icon: PlusCircle,
  },
  {
    title: "Orders",
    url: "/wholesale/orders",
    icon: ShoppingCart,
  },
  {
    title: "Buyers",
    url: "/wholesale/buyers",
    icon: Users,
  },
  {
    title: "Preview Store",
    url: "/wholesale/preview",
    icon: Eye,
  },
];

function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Wholesale B2B</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function WholesaleLayout({ children }: WholesaleLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
