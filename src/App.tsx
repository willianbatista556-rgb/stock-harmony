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
import PDV from "./pages/PDV";
import PDVCaixa from "./pages/PDVCaixa";
import Caixa from "./pages/Caixa";
import Movimentacoes from "./pages/Movimentacoes";
import Depositos from "./pages/Depositos";
import Categorias from "./pages/Categorias";
import Fornecedores from "./pages/Fornecedores";
import Placeholder from "./pages/Placeholder";
import FecharCaixa from "./pages/FecharCaixa";
import PDVTerminal from "./pages/PDVTerminal";
import Configuracoes from "./pages/Configuracoes";
import Inventario from "./pages/Inventario";
import InventarioContagem from "./pages/InventarioContagem";
import InventarioCompleto from "./pages/InventarioCompleto";
import NotFound from "./pages/NotFound";
import TransferenciaReceber from "./pages/TransferenciaReceber";

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
                  <Categorias />
                </AppLayout>
              }
            />
            <Route
              path="/depositos"
              element={
                <AppLayout>
                  <Depositos />
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
                  <Fornecedores />
                </AppLayout>
              }
            />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/pdv/caixa" element={<PDVCaixa />} />
            <Route path="/pdv/caixa/fechar" element={<FecharCaixa />} />
            <Route path="/pdv/terminal" element={<PDVTerminal />} />
            <Route
              path="/caixa"
              element={
                <AppLayout>
                  <Caixa />
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
              path="/estoque/inventarios"
              element={
                <AppLayout>
                  <Inventario />
                </AppLayout>
              }
            />
            <Route
              path="/estoque/inventarios/:id"
              element={
                <AppLayout>
                  <InventarioContagem />
                </AppLayout>
              }
            />
            <Route
              path="/estoque/inventarios/:id/completo"
              element={
                <AppLayout>
                  <InventarioCompleto />
                </AppLayout>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <AppLayout>
                  <Configuracoes />
                </AppLayout>
              }
            />
            <Route
              path="/estoque/transferencias/receber/:id"
              element={
                <AppLayout>
                  <TransferenciaReceber />
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
