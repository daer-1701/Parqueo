import { getSupportWhatsAppUrl, SUPPORT_WHATSAPP_DISPLAY } from '@/lib/support';
import { MessageCircle } from 'lucide-react';

type SupportButtonVariant = 'navbar' | 'inline';

interface SupportButtonProps {
  variant?: SupportButtonVariant;
  className?: string;
}

export function SupportButton({ variant = 'navbar', className = '' }: SupportButtonProps) {
  const href = getSupportWhatsAppUrl();

  if (variant === 'inline') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium ${className}`}
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp {SUPPORT_WHATSAPP_DISPLAY}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors touch-manipulation ${className}`}
      title="Soporte por WhatsApp"
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline">Soporte</span>
    </a>
  );
}
