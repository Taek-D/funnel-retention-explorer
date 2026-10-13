import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronUp, Filter, Users } from './Icons';
import { CHART_COLORS } from '../lib/constants';
import { calculateFunnelBreakdown, type BreakdownProperty, type FunnelBreakdownResult } from '../lib/funnelBreakdown';
import type { ProcessedEvent } from '../types';

const BREAKDOWN_COLORS = [
  CHART_COLORS.accent,
  '#38bdf8',
  '#f59e0b',
  '#a78bfa',
  '#fb7185',
  '#34d399',
];

interface FunnelBreakdownPanelProps {
  data: ProcessedEvent[];
  steps: string[];
}

export const FunnelBreakdownPanel: React.FC<FunnelBreakdownPanelProps> = ({ data, steps }) => {
  const { t } = useTranslation('pages');
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState<BreakdownProperty>('platform');

  const result: FunnelBreakdownResult | null = useMemo(() => {
    if (!open || steps.filter(Boolean).length < 2) return null;
    return calculateFunnelBreakdown(data, steps.filter(Boolean), property);
  }, [open, data, steps, property]);

  const chartData = useMemo(() => {
    if (!result || result.groups.length === 0) return [];
    const validSteps = steps.filter(Boolean);
    return validSteps.map(step => {
      const entry: Record<string, string | number> = { step };
      for (const group of result.groups.slice(0, 6)) {
        const funnelStep = group.funnel.find(f => f.step === step);
        entry[group.name] = funnelStep?.users || 0;
      }
      return entry;
    });
  }, [result, steps]);

  return (
    <section aria-labelledby="breakdown-heading" className="bg-surface border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-accent" aria-hidden="true" />
          <span id="breakdown-heading" className="text-sm font-bold text-white">{t('breakdown.title')}</span>
          <span className="text-xs text-slate-500">{t('breakdown.subtitle')}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 pt-3">
            <span className="text-xs text-slate-400">{t('breakdown.property')}:</span>
            <div className="flex rounded-md overflow-hidden border border-white/[0.06]" role="group" aria-label={t('breakdown.property')}>
              {(['platform', 'channel'] as BreakdownProperty[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProperty(p)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    property === p
                      ? 'bg-accent/20 text-accent font-medium'
                      : 'bg-white/[0.02] text-slate-500 hover:text-white'
                  }`}
                >
                  {t(`breakdown.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {result && result.groups.length > 0 ? (
            <>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.axisText, fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.axisTextSecondary, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, borderColor: CHART_COLORS.tooltipBorder, color: '#fff', borderRadius: '6px' }}
                      formatter={(value?: number) => [(value ?? 0).toLocaleString(), t('breakdown.users')]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    {result.groups.slice(0, 6).map((group, i) => (
                      <Bar
                        key={group.name}
                        dataKey={group.name}
                        fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]}
                        radius={[2, 2, 0, 0]}
                        barSize={20}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1">
                {result.groups.slice(0, 6).map((group, i) => (
                  <div key={group.name} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }} />
                      <span className="text-xs text-white font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Users size={10} />
                        {group.funnel[0]?.users.toLocaleString() || 0}
                      </span>
                      <span className={`text-xs font-bold font-mono ${
                        group.overallConversion >= 30 ? 'text-accent' : group.overallConversion >= 15 ? 'text-amber-400' : 'text-coral'
                      }`}>
                        {group.overallConversion.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              {steps.filter(Boolean).length < 2 ? t('breakdown.needSteps') : t('breakdown.noGroups')}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
