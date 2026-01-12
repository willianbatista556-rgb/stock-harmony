import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Movimentacoes from "./pages/Movimentacoes";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/produtos"
              element={
                <AppLayout>
                  <Produtos />
                </AppLayout>
              }
            />
            <Route
              path="/categorias"
              element={
                <AppLayout>
                  <Placeholder
                    title="Categorias"
                    description="Gerencie as categorias e subcategorias dos seus produtos para uma organização eficiente."
                  />
                </AppLayout>
              }
            />
            <Route
              path="/depositos"
              element={
                <AppLayout>
                  <Placeholder
                    title="Depósitos"
                    description="Configure seus depósitos físicos e virtuais para controlar o estoque em múltiplas localizações."
                  />
                </AppLayout>
              }
            />
            <Route
              path="/movimentacoes"
              element={
                <AppLayout>
                  <Movimentacoes />
                </AppLayout>
              }
            />
            <Route
              path="/fornecedores"
              element={
                <AppLayout>
                  <Placeholder
                    title="Fornecedores"
                    description="Cadastre e gerencie seus fornecedores para facilitar as compras e reposição de estoque."
                  />
                </AppLayout>
              }
            />
            <Route
              path="/compras"
              element={
                <AppLayout>
                  <Placeholder
                    title="Compras"
                    description="Registre suas compras e controle as notas fiscais de entrada."
                  />
                </AppLayout>
              }
            />
            <Route
              path="/usuarios"
              element={
                <AppLayout>
                  <Placeholder
                    title="Usuários"
                    description="Gerencie os usuários do sistema e suas permissões de acesso."
                  />
                </AppLayout>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <AppLayout>
                  <Placeholder
                    title="Configurações"
                    description="Personalize as configurações da sua empresa e do sistema."
                  />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
