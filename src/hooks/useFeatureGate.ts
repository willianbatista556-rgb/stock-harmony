import { useSubscription } from './useSubscription';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Feature gate hook — checks if the current plan allows a module or if a limit is reached.
 * Returns helpers to guard UI and actions.
 */
export function useFeatureGate() {
  const { limits, usage, subscription, isLoading, hasModule, isAtLimit } = useSubscription();
  const navigate = useNavigate();

  const planName = subscription?.plan?.nome || 'Base';

  const requireModule = (mod: string, label?: string): boolean => {
    if (isLoading) return true; // allow while loading
    if (hasModule(mod)) return true;
    toast.error(`Recurso "${label || mod}" não disponível no plano ${planName}`, {
      description: 'Faça upgrade para desbloquear.',
      action: {
        label: 'Ver planos',
        onClick: () => navigate('/configuracoes'),
      },
    });
    return false;
  };

  const requireLimit = (key: 'usuarios' | 'filiais' | 'produtos'): boolean => {
    if (isLoading) return true;
    if (!isAtLimit(key)) return true;
    const labels: Record<string, string> = {
      usuarios: 'usuários',
      filiais: 'filiais',
      produtos: 'produtos',
    };
    toast.error(`Limite de ${labels[key]} atingido no plano ${planName}`, {
      description: 'Faça upgrade para adicionar mais.',
      action: {
        label: 'Ver planos',
        onClick: () => navigate('/configuracoes'),
      },
    });
    return false;
  };

  return {
    limits,
    usage,
    planName,
    isLoading,
    hasModule,
    isAtLimit,
    requireModule,
    requireLimit,
  };
}
