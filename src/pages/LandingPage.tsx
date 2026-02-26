import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Package, BarChart3, ShoppingCart, ArrowRight, Check, Star,
  Warehouse, RefreshCw, ClipboardList, Users, Shield, Zap,
  ChevronRight, Menu, X, Minus, Barcode, Printer, Calculator,
  MapPin, TrendingUp, Receipt, Clock, Lock,
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

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#pra-quem" className="hover:text-foreground transition-colors">Pra quem</a>
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

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-3 animate-fade-in">
          <a href="#pra-quem" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Pra quem</a>
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
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
          <Barcode className="w-3.5 h-3.5" /> Feito para loja física, não para contador
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-4xl mx-auto">
          O sistema que o{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            dono de loja
          </span>{' '}
          queria ter desde o dia 1
        </h1>

        <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Estoque, PDV, caixa, transferências entre filiais e financeiro.
          Tudo que sua loja física precisa — sem a complexidade de um ERP industrial.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="gradient-primary text-primary-foreground text-base px-8 h-12 gap-2 shadow-lg" onClick={() => navigate('/auth')}>
            Criar conta grátis <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 h-12 gap-2" asChild>
            <a href="#funcionalidades">Ver como funciona <ChevronRight className="w-4 h-4" /></a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Sem cartão • Sem contrato • Começa em 2 minutos</p>

        {/* Social proof stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: '99.9%', label: 'Uptime garantido' },
            { value: '<2s', label: 'PDV rápido' },
            { value: '100%', label: 'Na nuvem' },
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

/* ───────── PRA QUEM ───────── */
const segments = [
  { icon: ShoppingCart, label: 'Lojas de roupas', desc: 'Controle por tamanho, cor e filial' },
  { icon: Package, label: 'Material de construção', desc: 'SKUs pesados, estoque mínimo e reposição' },
  { icon: Barcode, label: 'Pet shops', desc: 'Leitor de código de barras + PDV rápido' },
  { icon: Receipt, label: 'Farmácias', desc: 'Alto giro, estoque crítico e multi-filial' },
  { icon: MapPin, label: 'Papelarias', desc: 'Muitos SKUs, preço variado e inventário' },
  { icon: Calculator, label: 'Autopeças', desc: 'Busca por código, margem e transferências' },
];

function PraQuem() {
  return (
    <section id="pra-quem" className="py-20 lg:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pra quem é o Stockly</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Feito para quem vende no balcão, não no Excel
          </h2>
          <p className="mt-4 text-muted-foreground">
            Se você tem loja física com estoque real, funcionários no caixa e quer parar de perder dinheiro com furo de estoque — o Stockly é pra você.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {segments.map((s) => (
            <div key={s.label} className="flex items-start gap-4 bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">{s.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── PAIN POINTS ───────── */
function PainPoints() {
  const pains = [
    { before: 'Controlar estoque no caderno ou planilha', after: 'Estoque atualizado em tempo real, por filial' },
    { before: 'Não saber quanto tem em cada loja', after: 'Saldo por local com transferências rastreadas' },
    { before: 'Perder venda por falta de produto', after: 'Alertas de estoque baixo + previsão de ruptura' },
    { before: 'Fechar o caixa e dar diferença', after: 'Caixa com conferência, suprimento e sangria' },
    { before: 'Inventário que demora dias', after: 'Contagem por código de barras em minutos' },
    { before: 'Não saber qual produto dá mais lucro', after: 'Margem, giro e curva ABC automáticos' },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Antes vs Depois</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Chega de improviso
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {pains.map((p, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-card flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground line-through">{p.before}</p>
                <div className="flex items-start gap-2 mt-2">
                  <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-foreground">{p.after}</p>
                </div>
              </div>
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
    icon: ShoppingCart, title: 'PDV Rápido',
    desc: 'Caixa operado por teclado, leitor de código de barras, múltiplos pagamentos e impressão térmica automática.',
  },
  {
    icon: Package, title: 'Estoque por Filial',
    desc: 'Saldo separado por local. Saiba exatamente quanto tem em cada loja ou depósito.',
  },
  {
    icon: RefreshCw, title: 'Transferências',
    desc: 'Envie produtos entre lojas com conferência no destino. Sem WhatsApp, sem erro.',
  },
  {
    icon: ClipboardList, title: 'Inventário por Código de Barras',
    desc: 'Contagem com bipagem, recontagem automática dos divergentes e ajuste em lote.',
  },
  {
    icon: BarChart3, title: 'Curva ABC + Giro + Margem',
    desc: 'Saiba quais produtos vendem mais, quais estão parados e onde está o lucro.',
  },
  {
    icon: Calculator, title: 'Financeiro Integrado',
    desc: 'Contas a pagar, contas a receber, fluxo de caixa e DRE — sem precisar de outro sistema.',
  },
  {
    icon: Warehouse, title: 'Multi-depósito',
    desc: 'Loja, estoque reserva, CD — cada local com seu saldo e suas movimentações.',
  },
  {
    icon: Printer, title: 'Impressão Térmica',
    desc: 'Recibo direto na impressora do caixa via ESC/POS. Sem driver, sem complicação.',
  },
  {
    icon: Users, title: 'Usuários & Permissões',
    desc: 'Admin, Gerente, Operador e Visualizador. Cada funcionário vê só o que deve.',
  },
  {
    icon: Lock, title: 'Auditoria Completa',
    desc: 'Tudo que acontece fica registrado: quem fez, quando, o que mudou. Histórico imutável.',
  },
  {
    icon: TrendingUp, title: 'Previsão de Ruptura',
    desc: 'O sistema avisa antes de faltar. Consumo médio diário + dias pra acabar.',
  },
  {
    icon: Shield, title: 'Segurança SaaS',
    desc: 'Dados isolados por empresa, backup automático, criptografia e na nuvem 24/7.',
  },
];

function Features() {
  return (
    <section id="funcionalidades" className="py-20 lg:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Funcionalidades</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            Tudo que uma loja física precisa. Nada que ela não precisa.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada recurso foi pensado para a rotina do lojista — não do contador.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1.5">{f.title}</h3>
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
    name: 'Básico',
    price: 'R$ 79',
    period: '/mês',
    desc: '1 filial, até 1.000 produtos, PDV + Estoque',
    cta: 'Começar agora',
    popular: false,
    features: [
      '2 usuários',
      '1 filial',
      '1.000 produtos',
      'PDV completo com atalhos',
      'Controle de estoque',
      'Relatório de vendas',
    ],
    excluded: [
      'Financeiro',
      'Inventários',
      'Transferências',
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 149',
    priceDecimal: ',90',
    period: '/mês',
    annualPrice: 'R$ 119,90/mês no anual',
    desc: 'Multi-filial, transferências, inventário, crediário',
    cta: 'Teste grátis 14 dias',
    popular: true,
    features: [
      'Até 10 usuários',
      '5 filiais',
      '5.000 produtos',
      'Tudo do Básico +',
      'Financeiro completo',
      'DRE automático',
      'Inventário com recontagem',
      'Transferências entre locais',
      'Curva ABC + Giro + Margem',
      'Crediário com carnê',
      'Suporte prioritário',
    ],
    excluded: [],
  },
  {
    name: 'Premium',
    price: 'R$ 299',
    priceDecimal: ',90',
    period: '/mês',
    annualPrice: 'R$ 239,90/mês no anual',
    desc: 'BI, relatórios avançados, API e integrações',
    cta: 'Falar com vendas',
    popular: false,
    features: [
      'Usuários ilimitados',
      'Filiais ilimitadas',
      'Produtos ilimitados',
      'Tudo do Pro +',
      'BI & Analytics avançado',
      'API de integrações',
      'Integrações externas',
      'Suporte dedicado',
      'Onboarding assistido',
    ],
    excluded: [],
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
            Preço justo pra loja brasileira
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece de graça. Pague só quando sua operação crescer.
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
                  Mais escolhido
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                  {'priceDecimal' in plan && plan.priceDecimal && (
                    <span className="font-display text-2xl font-bold text-foreground">{plan.priceDecimal}</span>
                  )}
                  <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                </div>
                {'annualPrice' in plan && plan.annualPrice && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.annualPrice}</p>
                )}
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/60">
                    <Minus className="w-4 h-4 mt-0.5 shrink-0" />
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
    role: 'Dono de loja de materiais — 3 filiais',
    text: 'Saí de planilhas pro Stockly em uma tarde. Agora sei o estoque de cada loja em tempo real. Acabou o "liga pro depósito pra ver se tem".',
    stars: 5,
  },
  {
    name: 'Ana Paula',
    role: 'Gerente de farmácia',
    text: 'O PDV é muito rápido. Meus funcionários aprenderam em 10 minutos. Os atalhos de teclado fazem toda a diferença no movimento.',
    stars: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'Rede de pet shops — 2 unidades',
    text: 'As transferências entre lojas resolveram nosso maior problema. Antes era tudo por WhatsApp e dava furo toda semana.',
    stars: 5,
  },
  {
    name: 'Luciana Costa',
    role: 'Papelaria — centro da cidade',
    text: 'O inventário por código de barras é incrível. Antes demorava 2 dias. Agora em 3 horas está tudo contado e ajustado.',
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
            Lojistas que pararam de improvisar
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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

/* ───────── HOW IT WORKS ───────── */
function HowItWorks() {
  const steps = [
    { num: '1', title: 'Crie sua conta', desc: 'Em 30 segundos, sem cartão. Já vem com a filial principal configurada.', icon: Clock },
    { num: '2', title: 'Cadastre seus produtos', desc: 'Nome, código de barras, preço e estoque mínimo. Importação em lote em breve.', icon: Barcode },
    { num: '3', title: 'Comece a vender', desc: 'Abra o caixa, bipe os produtos e venda. Estoque atualiza automaticamente.', icon: ShoppingCart },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Como funciona</p>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
            3 passos pra sair do improviso
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold mb-3">
                {s.num}
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
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
          Sua loja merece um sistema de verdade
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Pare de perder dinheiro com furo de estoque, caixa que não fecha e transferências por WhatsApp.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="gradient-primary text-primary-foreground text-base px-10 h-12 gap-2 shadow-lg" onClick={() => navigate('/auth')}>
            Criar conta grátis <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Sem cartão • Sem contrato • Funciona no navegador</p>
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
            <span className="text-xs text-muted-foreground ml-2">Sistema para varejo físico brasileiro</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#pra-quem" className="hover:text-foreground transition-colors">Pra quem</a>
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
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
        <PraQuem />
        <PainPoints />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
