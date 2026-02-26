import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Package, BarChart3, ShoppingCart, ArrowRight, Check, Star,
  Warehouse, RefreshCw, ClipboardList, Users, Shield, Zap,
  ChevronRight, Menu, X,
} from 'lucide-react';

/* ───────── NAVBAR ───────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Stockly</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
          <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Entrar</Button>
          <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={() => navigate('/auth')}>
            Começar grátis <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-3 animate-fade-in">
          <a href="#funcionalidades" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Funcionalidades</a>
          <a href="#planos" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Planos</a>
          <a href="#depoimentos" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Depoimentos</a>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/auth')}>Entrar</Button>
            <Button size="sm" className="w-full gradient-primary text-primary-foreground" onClick={() => navigate('/auth')}>Começar grátis</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ───────── HERO ───────── */
function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" /> Novo: Relatórios com Curva ABC automática
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-4xl mx-auto">
          O ERP que{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            simplifica
          </span>{' '}
          seu varejo
        </h1>

        <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Controle estoque, PDV, caixa, transferências e relatórios em um só lugar.
          Feito para o varejista brasileiro que quer crescer sem complicação.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="gradient-primary text-primary-foreground text-base px-8 h-12 gap-2 shadow-lg" onClick={() => navigate('/auth')}>
            Teste grátis por 14 dias <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 h-12 gap-2" asChild>
            <a href="#funcionalidades">Ver funcionalidades <ChevronRight className="w-4 h-4" /></a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Sem cartão de crédito • Cancele quando quiser</p>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '<2s', label: 'Tempo de resposta' },
            { value: '24/7', label: 'Suporte' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── FEATURES ───────── */
const features = [
  {
    icon: ShoppingCart, title: 'PDV Completo',
    desc: 'Ponto de venda com atalhos de teclado, múltiplas formas de pagamento e recibo automático.',
  },
  {
    icon: Package, title: 'Estoque Multi-filial',
    desc: 'Controle de saldo por local, transferências entre filiais com conferência e inventários rotativos.',
  },
  {
    icon: BarChart3, title: 'Relatórios & Curva ABC',
    desc: 'Vendas, estoque e classificação ABC automática. Exporte CSV com um clique.',
  },
  {
    icon: Warehouse, title: 'Multi-depósito',
    desc: 'Gerencie múltiplos depósitos e filiais com visibilidade total de saldo em cada local.',
  },
  {
    icon: RefreshCw, title: 'Transferências',
    desc: 'Envie produtos entre locais com fluxo de conferência e controle de divergências.',
  },
  {
    icon: ClipboardList, title: 'Inventário Inteligente',
    desc: 'Contagem por código de barras, recontagem automática de divergentes e ajuste em lote.',
  },
  {
    icon: Users, title: 'Multi-usuário & Permissões',
    desc: 'Admin, Gerente, Operador e Visualizador. Cada um com acesso controlado.',
  },
  {
    icon: Shield, title: 'Segurança Total',
    desc: 'Isolamento por empresa, RLS no banco, criptografia e backups automáticos.',
  },
];

function Features() {
  return (
    <section id="funcionalidades" className="py-20 lg:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Funcionalidades</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Tudo que seu varejo precisa
          </h2>
          <p className="mt-4 text-muted-foreground">
            Módulos integrados que funcionam juntos para eliminar planilhas e retrabalho.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── PRICING ───────── */
const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: '/mês',
    desc: 'Para quem está começando',
    cta: 'Começar grátis',
    popular: false,
    features: [
      '1 usuário',
      '1 local / depósito',
      '50 produtos',
      'PDV básico',
      'Relatório de vendas',
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Para lojas em crescimento',
    cta: 'Teste grátis 14 dias',
    popular: true,
    features: [
      'Até 5 usuários',
      '3 locais / filiais',
      'Produtos ilimitados',
      'PDV completo + atalhos',
      'Transferências entre locais',
      'Inventário com recontagem',
      'Relatórios + Curva ABC',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Business',
    price: 'R$ 197',
    period: '/mês',
    desc: 'Para operações multi-filial',
    cta: 'Falar com vendas',
    popular: false,
    features: [
      'Usuários ilimitados',
      'Locais ilimitados',
      'Produtos ilimitados',
      'Tudo do Pro +',
      'API de integrações',
      'Relatórios avançados',
      'Suporte dedicado',
      'Onboarding assistido',
    ],
  },
];

function Pricing() {
  const navigate = useNavigate();

  return (
    <section id="planos" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Planos</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Preço justo, sem surpresas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e escale conforme sua operação cresce.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? 'border-primary bg-card shadow-lg scale-[1.02]'
                  : 'border-border bg-card shadow-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold">
                  Mais popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => navigate('/auth')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── TESTIMONIALS ───────── */
const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Dono de loja de materiais',
    text: 'Saí de planilhas do Excel para o Stockly em uma tarde. Agora tenho controle real do estoque em 3 filiais.',
    stars: 5,
  },
  {
    name: 'Ana Paula',
    role: 'Gerente de farmácia',
    text: 'O PDV é muito rápido e os atalhos de teclado fazem toda a diferença. Minhas vendedoras adoraram.',
    stars: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'Rede de pet shops',
    text: 'As transferências entre lojas resolveram nosso maior problema. Antes era tudo por WhatsApp.',
    stars: 5,
  },
];

function Testimonials() {
  return (
    <section id="depoimentos" className="py-20 lg:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Depoimentos</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Quem usa, recomenda
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="font-semibold text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── CTA FINAL ───────── */
function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
          Pronto para controlar seu estoque de verdade?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Crie sua conta em 30 segundos. Sem cartão, sem contrato, sem pegadinha.
        </p>
        <div className="mt-8">
          <Button size="lg" className="gradient-primary text-primary-foreground text-base px-10 h-12 gap-2 shadow-lg" onClick={() => navigate('/auth')}>
            Começar agora <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ───────── FOOTER ───────── */
function Footer() {
  return (
    <footer className="border-t border-border py-12 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">Stockly</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Stockly. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ───────── PAGE ───────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
