import { useNavigate } from 'react-router-dom';

interface Props {
  title: string; value: string | number; subtitle?: string;
  icon: string; color?: string; trend?: { value: number; label: string };
  href?: string;
}
export default function KpiCard({ title, value, subtitle, icon, color = 'blue', trend, href }: Props) {
  const navigate = useNavigate();
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  const clickable = !!href;
  return (
    <div
      className={`card transition-all ${clickable ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group' : 'hover:shadow-md'}`}
      onClick={href ? () => navigate(href) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={href ? (e) => e.key === 'Enter' && navigate(href) : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
          {clickable && (
            <p className="text-xs text-blue-500 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              Voir le détail →
            </p>
          )}
        </div>
        <span className={`p-2.5 rounded-xl text-xl ${colors[color]}`}>{icon}</span>
      </div>
    </div>
  );
}
