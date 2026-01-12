import { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function Placeholder({ title, description, icon }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        {icon || <Construction className="w-8 h-8 text-primary" />}
      </div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
