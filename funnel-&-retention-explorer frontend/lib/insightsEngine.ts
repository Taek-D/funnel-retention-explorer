import type {
  ProcessedEvent, Insight, DatasetType,
  SubscriptionKPIs, TrialAnalysis, ChurnAnalysis, RetentionCohort
} from '../types';
import { calculateFullDataFunnel } from './funnelEngine';
import { calculateFullDataRetention } from './retentionEngine';
import { calculateFullDataSegments } from './segmentEngine';
import { INSIGHTS_RETENTION_MAX_DAYS } from './constants';
import { createEngineCache, getCached, setCached } from './engineCache';
import i18n from './i18n';

const insightsCache = createEngineCache<Insight[]>();

export function generateInsights(
  processedData: ProcessedEvent[],
  detectedType: DatasetType,
  subscriptionKPIs: SubscriptionKPIs | null,
  trialAnalysis: TrialAnalysis | null,
  churnAnalysis: ChurnAnalysis | null,
  paidRetention: RetentionCohort[] | null
): Insight[] {
  const cacheKey = `${detectedType || 'none'}|${subscriptionKPIs?.paid_user_count ?? ''}|${trialAnalysis?.overall?.conversion_rate ?? ''}|${churnAnalysis?.churn_rate_paid ?? ''}|${paidRetention?.length ?? 0}`;
  const cached = getCached(insightsCache, processedData, cacheKey);
  if (cached) return cached;

  const insights: Insight[] = [];
  const t = i18n.t.bind(i18n);

  const fullFunnelResults = detectedType ? calculateFullDataFunnel(processedData, detectedType) : null;
  const fullSegmentResults = detectedType ? calculateFullDataSegments(processedData, detectedType) : null;
  const fullRetentionResults = calculateFullDataRetention(processedData);

  // Insight 1: Maximum leakage step
  if (fullFunnelResults && fullFunnelResults.length > 1) {
    const lowestConversion = fullFunnelResults.slice(1).reduce((min, step) =>
      step.conversionRate < min.conversionRate ? step : min
    );

    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: t('insights:funnel.maxDropoff.title'),
      body: t('insights:funnel.maxDropoff.body', { step: lowestConversion.step, rate: lowestConversion.conversionRate.toFixed(1), dropOff: lowestConversion.dropOff }),
      metric: lowestConversion.conversionRate.toFixed(1) + '%',
      recommendations: [
        t('insights:funnel.maxDropoff.rec1'),
        t('insights:funnel.maxDropoff.rec2'),
        t('insights:funnel.maxDropoff.rec3')
      ]
    });
  }

  // Insight 2: Platform performance gap
  if (fullSegmentResults && fullSegmentResults.length >= 2) {
    const platformSegments = fullSegmentResults.filter(s => s.type === 'platform');
    if (platformSegments.length >= 2) {
      platformSegments.sort((a, b) => b.conversion - a.conversion);
      const gap = platformSegments[0].conversion - platformSegments[platformSegments.length - 1].conversion;

      if (gap > 10) {
        insights.push({
          type: 'danger',
          icon: '🚨',
          title: t('insights:segment.platformGap.title'),
          body: t('insights:segment.platformGap.body', { worst: platformSegments[platformSegments.length - 1].name, best: platformSegments[0].name, gap: gap.toFixed(1) }),
          metric: t('insights:segment.platformGap.metric', { gap: gap.toFixed(1) }),
          recommendations: [
            t('insights:segment.platformGap.rec1'),
            t('insights:segment.platformGap.rec2'),
            t('insights:segment.platformGap.rec3')
          ]
        });
      }
    }
  }

  // Insight 3: Channel gap
  if (fullSegmentResults && fullSegmentResults.length >= 2) {
    const channelSegments = fullSegmentResults.filter(s => s.type === 'channel');
    if (channelSegments.length >= 2) {
      channelSegments.sort((a, b) => b.conversion - a.conversion);
      const gap = channelSegments[0].conversion - channelSegments[channelSegments.length - 1].conversion;

      if (gap > 15) {
        insights.push({
          type: 'warning',
          icon: '📢',
          title: t('insights:segment.channelGap.title'),
          body: t('insights:segment.channelGap.body', { best: channelSegments[0].name, worst: channelSegments[channelSegments.length - 1].name, gap: gap.toFixed(1) }),
          metric: t('insights:segment.channelGap.metric', { gap: gap.toFixed(1) }),
          recommendations: [
            t('insights:segment.channelGap.rec1'),
            t('insights:segment.channelGap.rec2'),
            t('insights:segment.channelGap.rec3')
          ]
        });
      }
    }
  }

  // Insight 4: Low D1 retention
  if (fullRetentionResults && fullRetentionResults.length > 0) {
    const avgD1 = fullRetentionResults.reduce((sum, r) => sum + (r.days.D1 || 0), 0) / fullRetentionResults.length;
    if (avgD1 < 25) {
      insights.push({
        type: 'danger',
        icon: '📉',
        title: t('insights:retention.lowD1.title'),
        body: t('insights:retention.lowD1.body', { rate: avgD1.toFixed(1) }),
        metric: avgD1.toFixed(1) + '%',
        recommendations: [
          t('insights:retention.lowD1.rec1'),
          t('insights:retention.lowD1.rec2'),
          t('insights:retention.lowD1.rec3')
        ]
      });
    }
  }

  // Insight 5: Steepest retention drop
  if (fullRetentionResults && fullRetentionResults.length > 0) {
    const avgByDay: Record<number, number> = {};
    for (let day = 0; day <= INSIGHTS_RETENTION_MAX_DAYS; day++) {
      avgByDay[day] = fullRetentionResults.reduce((sum, r) => sum + (r.days[`D${day}`] || 0), 0) / fullRetentionResults.length;
    }

    let maxDrop = 0;
    let maxDropDay = 0;
    for (let day = 1; day <= INSIGHTS_RETENTION_MAX_DAYS; day++) {
      const drop = avgByDay[day - 1] - avgByDay[day];
      if (drop > maxDrop) {
        maxDrop = drop;
        maxDropDay = day;
      }
    }

    if (maxDrop > 5) {
      insights.push({
        type: 'warning',
        icon: '📊',
        title: t('insights:retention.steepestDrop.title'),
        body: t('insights:retention.steepestDrop.body', { drop: maxDrop.toFixed(1), dayFrom: maxDropDay - 1, dayTo: maxDropDay }),
        metric: `D${maxDropDay - 1} → D${maxDropDay}`,
        recommendations: [
          t('insights:retention.steepestDrop.rec1', { dayFrom: maxDropDay - 1 }),
          t('insights:retention.steepestDrop.rec2'),
          t('insights:retention.steepestDrop.rec3')
        ]
      });
    }
  }

  // Insight 6: Best performing segment
  if (fullSegmentResults && fullSegmentResults.length > 0) {
    const bestSegment = fullSegmentResults.reduce((best, seg) =>
      seg.conversion > best.conversion ? seg : best
    );

    if (bestSegment.conversion > 10) {
      insights.push({
        type: 'success',
        icon: '✨',
        title: t('insights:segment.bestSegment.title'),
        body: t('insights:segment.bestSegment.body', { name: bestSegment.name, rate: bestSegment.conversion.toFixed(1) }),
        metric: bestSegment.conversion.toFixed(1) + '%',
        recommendations: [
          t('insights:segment.bestSegment.rec1'),
          t('insights:segment.bestSegment.rec2'),
          t('insights:segment.bestSegment.rec3')
        ]
      });
    }
  }

  // ===== SUBSCRIPTION-SPECIFIC INSIGHTS =====
  if (detectedType === 'subscription') {
    // S1: Trial → Subscribe conversion
    if (trialAnalysis && trialAnalysis.overall) {
      const convRate = trialAnalysis.overall.conversion_rate;
      if (convRate < 35 && trialAnalysis.overall.trial_users >= 30) {
        insights.push({
          type: 'warning',
          icon: '🎯',
          title: t('insights:subscription.trialConversion.title'),
          body: t('insights:subscription.trialConversion.body', { rate: convRate.toFixed(1), count: trialAnalysis.overall.trial_users }),
          metric: convRate.toFixed(1) + '%',
          recommendations: [
            t('insights:subscription.trialConversion.rec1'),
            t('insights:subscription.trialConversion.rec2'),
            t('insights:subscription.trialConversion.rec3')
          ]
        });
      }
    }

    // S2: Slow conversion time
    if (trialAnalysis?.overall?.median_hours) {
      const medianDays = trialAnalysis.overall.median_hours / 24;
      if (medianDays > 10) {
        insights.push({
          type: 'warning',
          icon: '⏱️',
          title: t('insights:subscription.slowConversion.title'),
          body: t('insights:subscription.slowConversion.body', { days: medianDays.toFixed(1) }),
          metric: t('insights:subscription.slowConversion.metric', { days: medianDays.toFixed(1) }),
          recommendations: [
            t('insights:subscription.slowConversion.rec1'),
            t('insights:subscription.slowConversion.rec2'),
            t('insights:subscription.slowConversion.rec3')
          ]
        });
      }
    }

    // S3: Payment failure
    if (subscriptionKPIs && subscriptionKPIs.payment_failed_events > 0) {
      const totalPaymentAttempts = subscriptionKPIs.subscribe_events + subscriptionKPIs.renew_events + subscriptionKPIs.payment_failed_events;
      const failureRate = totalPaymentAttempts > 0 ? (subscriptionKPIs.payment_failed_events / totalPaymentAttempts) * 100 : 0;
      if (failureRate >= 10) {
        insights.push({
          type: 'danger',
          icon: '💳',
          title: t('insights:subscription.paymentFailure.title'),
          body: t('insights:subscription.paymentFailure.body', { rate: failureRate.toFixed(1), count: subscriptionKPIs.payment_failed_events }),
          metric: failureRate.toFixed(1) + '%',
          recommendations: [
            t('insights:subscription.paymentFailure.rec1'),
            t('insights:subscription.paymentFailure.rec2'),
            t('insights:subscription.paymentFailure.rec3')
          ]
        });
      }
    }

    // S4: High churn rate
    if (churnAnalysis && churnAnalysis.churn_rate_paid > 20) {
      insights.push({
        type: 'danger',
        icon: '📉',
        title: t('insights:subscription.highChurn.title'),
        body: t('insights:subscription.highChurn.body', { rate: churnAnalysis.churn_rate_paid.toFixed(1), count: churnAnalysis.churn_users }),
        metric: churnAnalysis.churn_rate_paid.toFixed(1) + '%',
        recommendations: [
          t('insights:subscription.highChurn.rec1'),
          t('insights:subscription.highChurn.rec2'),
          t('insights:subscription.highChurn.rec3')
        ]
      });
    }

    // S5: Cancel reason analysis
    if (churnAnalysis?.cancel_reason_top && churnAnalysis.cancel_reason_top.length > 0) {
      const topReason = churnAnalysis.cancel_reason_top[0];
      if (topReason.reason !== 'Unknown' && topReason.share > 20) {
        insights.push({
          type: 'warning',
          icon: '🔍',
          title: t('insights:subscription.cancelReason.title', { reason: topReason.reason }),
          body: t('insights:subscription.cancelReason.body', { share: topReason.share.toFixed(0), reason: topReason.reason }),
          metric: `${topReason.share.toFixed(0)}%`,
          recommendations: [
            t('insights:subscription.cancelReason.rec1'),
            t('insights:subscription.cancelReason.rec2'),
            t('insights:subscription.cancelReason.rec3')
          ]
        });
      }
    }

    // S6: Paid Retention warning
    if (paidRetention && paidRetention.length > 0) {
      const avgD7 = paidRetention.reduce((sum, r) => sum + (r.days.D7 || 0), 0) / paidRetention.length;
      const avgD30 = paidRetention.reduce((sum, r) => sum + (r.days.D30 || 0), 0) / paidRetention.length;

      if (avgD7 < 70) {
        insights.push({
          type: 'danger',
          icon: '🔒',
          title: t('insights:subscription.lowD7Paid.title'),
          body: t('insights:subscription.lowD7Paid.body', { rate: avgD7.toFixed(1) }),
          metric: avgD7.toFixed(1) + '%',
          recommendations: [
            t('insights:subscription.lowD7Paid.rec1'),
            t('insights:subscription.lowD7Paid.rec2'),
            t('insights:subscription.lowD7Paid.rec3')
          ]
        });
      } else if (avgD30 < 50) {
        insights.push({
          type: 'warning',
          icon: '🔒',
          title: t('insights:subscription.lowD30Paid.title'),
          body: t('insights:subscription.lowD30Paid.body', { rate: avgD30.toFixed(1) }),
          metric: avgD30.toFixed(1) + '%',
          recommendations: [
            t('insights:subscription.lowD30Paid.rec1'),
            t('insights:subscription.lowD30Paid.rec2'),
            t('insights:subscription.lowD30Paid.rec3')
          ]
        });
      }
    }
  }

  setCached(insightsCache, processedData, cacheKey, insights);
  return insights;
}
