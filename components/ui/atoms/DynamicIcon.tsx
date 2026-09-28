import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = 'w-4 h-4', size }) => {
  // Safe lookup with fallback
  const IconComponent = (LucideIcons as Record<string, React.FC<any>>)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} size={size} />;
};
