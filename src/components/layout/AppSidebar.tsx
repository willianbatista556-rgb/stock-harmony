import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowRightLeft,
  Truck,
  ShoppingCart,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  FolderTree,
  Monitor,
  Landmark,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Monitor, label: 'PDV', path: '/pdv' },
  { icon: Landmark, label: 'Caixa', path: '/caixa' },
  { icon: Package, label: 'Produtos', path: '/produtos' },
  { icon: FolderTree, label: 'Categorias', path: '/categorias' },
  { icon: Warehouse, label: 'Depósitos', path: '/depositos' },
  { icon: ArrowRightLeft, label: 'Movimentações', path: '/movimentacoes' },
  { icon: Truck, label: 'Fornecedores', path: '/fornecedores' },
  { icon: ShoppingCart, label: 'Compras', path: '/compras' },
  { icon: ClipboardList, label: 'Inventário', path: '/inventario' },
];

const bottomItems = [
  { icon: Users, label: 'Usuários', path: '/usuarios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, userRole, signOut } = useAuth();

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Estoque</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const NavItem = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "animate-scale-in")} />
              {!collapsed && (
                <span className="font-medium animate-fade-in">{item.label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  {NavItem}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return NavItem;
        })}
      </nav>

      {/* Bottom Items */}
      <div className="py-4 px-2 space-y-1 border-t border-sidebar-border">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          const NavItem = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  {NavItem}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return NavItem;
        })}
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium truncate">{profile?.nome || 'Usuário'}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {userRole?.role || 'Operador'}
              </p>
            </div>
          )}
          {!collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sair</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
}
