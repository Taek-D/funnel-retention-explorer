import { supabase } from './supabase';
import type { Team, TeamMember, TeamRole, ScheduledReport, ReportFrequency, CustomEventDefinition, SavedFunnel, ConnectorInstance, SyncLog, ConnectorConfigData } from '../types';

function getSupabase() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다. 환경 변수를 확인하세요.');
  return supabase;
}

// ===== User Profiles =====

export interface UserProfile {
  id: string;
  role: 'user' | 'admin';
  plan: string;
  created_at: string;
  updated_at: string;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('fre_user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

export async function upsertUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('fre_user_profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

// ===== Projects =====

export interface FREProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function listProjects(): Promise<FREProject[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createProject(name: string, description?: string, teamId?: string): Promise<FREProject> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { data, error } = await client
    .from('fre_projects')
    .insert({ name, description: description || null, user_id: user.id, team_id: teamId || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

// ===== Datasets =====

export interface FREDataset {
  id: string;
  project_id: string;
  file_name: string;
  row_count: number | null;
  column_mapping: Record<string, string> | null;
  detected_type: string | null;
  quality_report: Record<string, unknown> | null;
  created_at: string;
}

export async function listDatasets(projectId: string): Promise<FREDataset[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_datasets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createDataset(params: {
  projectId: string;
  fileName: string;
  rowCount: number;
  columnMapping: Record<string, string>;
  detectedType: string | null;
  qualityReport: Record<string, unknown> | null;
}): Promise<FREDataset> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_datasets')
    .insert({
      project_id: params.projectId,
      file_name: params.fileName,
      row_count: params.rowCount,
      column_mapping: params.columnMapping,
      detected_type: params.detectedType,
      quality_report: params.qualityReport,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ===== Analysis Snapshots =====

export interface FRESnapshot {
  id: string;
  dataset_id: string;
  snapshot_type: string;
  config: Record<string, unknown> | null;
  results: Record<string, unknown> | null;
  created_at: string;
  share_token?: string | null;
  is_shared?: boolean;
  dataset_name?: string;
}

export async function listSnapshots(datasetId: string): Promise<FRESnapshot[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_analysis_snapshots')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function listAllSnapshots(): Promise<(FRESnapshot & { dataset_name?: string })[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_analysis_snapshots')
    .select('*, fre_datasets!inner(file_name)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data || []).map((row: Record<string, unknown>) => {
    const datasets = row.fre_datasets as { file_name: string } | null;
    return {
      id: row.id as string,
      dataset_id: row.dataset_id as string,
      snapshot_type: row.snapshot_type as string,
      config: row.config as Record<string, unknown> | null,
      results: row.results as Record<string, unknown> | null,
      created_at: row.created_at as string,
      share_token: row.share_token as string | null | undefined,
      is_shared: row.is_shared as boolean | undefined,
      dataset_name: datasets?.file_name || undefined,
    };
  });
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  // Snapshot ownership is enforced via RLS + joined dataset ownership
  const { error } = await client
    .from('fre_analysis_snapshots')
    .delete()
    .eq('id', snapshotId);

  if (error) throw new Error(error.message);
}

export async function saveSnapshot(params: {
  datasetId: string;
  snapshotType: string;
  config: Record<string, unknown>;
  results: Record<string, unknown>;
}): Promise<FRESnapshot> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_analysis_snapshots')
    .insert({
      dataset_id: params.datasetId,
      snapshot_type: params.snapshotType,
      config: params.config,
      results: params.results,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function shareSnapshot(snapshotId: string): Promise<string> {
  const client = getSupabase();
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const shareToken = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const { error } = await client
    .from('fre_analysis_snapshots')
    .update({ share_token: shareToken, is_shared: true })
    .eq('id', snapshotId);

  if (error) throw new Error(error.message);
  return shareToken;
}

export async function getSharedSnapshot(shareToken: string): Promise<FRESnapshot | null> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_analysis_snapshots')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_shared', true)
    .single();

  if (error) return null;
  return data;
}

// ===== Notifications =====

export type NotificationDbType = 'analysis' | 'import' | 'ai' | 'export';

export interface FRENotification {
  id: string;
  user_id: string;
  type: NotificationDbType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export async function listNotifications(limit = 50): Promise<FRENotification[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertNotification(params: {
  type: NotificationDbType;
  title: string;
  message: string;
}): Promise<FRENotification> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { data, error } = await client
    .from('fre_notifications')
    .insert({
      user_id: user.id,
      type: params.type,
      title: params.title,
      message: params.message,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  const client = getSupabase();
  const { error } = await client
    .from('fre_notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client
    .from('fre_notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw new Error(error.message);
}

export async function deleteNotificationDb(id: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

export async function clearAllNotifications(): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client
    .from('fre_notifications')
    .delete()
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

// ===== Notification Preferences =====

export async function getNotificationPreferences(): Promise<Record<string, boolean> | null> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client
    .from('fre_user_profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();
  return data?.notification_preferences ?? null;
}

export async function updateNotificationPreferences(prefs: Record<string, boolean>): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  await client
    .from('fre_user_profiles')
    .update({ notification_preferences: prefs })
    .eq('id', user.id);
}

// ===== Custom Events =====

export async function listCustomEvents(userId: string): Promise<CustomEventDefinition[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('fre_custom_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    name: row.name,
    description: row.description || '',
    type: row.type,
    sourceEvent: row.definition?.sourceEvent,
    sourceEvents: row.definition?.sourceEvents,
    conditions: row.definition?.conditions,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createCustomEvent(
  event: { user_id: string; project_id?: string | null; name: string; description?: string; type: string; sourceEvent?: string; sourceEvents?: string[]; conditions?: { field: string; operator: string; value: string }[] }
): Promise<CustomEventDefinition | null> {
  const db = getSupabase();
  const definition: Record<string, unknown> = {};
  if (event.sourceEvent) definition.sourceEvent = event.sourceEvent;
  if (event.sourceEvents) definition.sourceEvents = event.sourceEvents;
  if (event.conditions) definition.conditions = event.conditions;

  const { data, error } = await db
    .from('fre_custom_events')
    .insert({ user_id: event.user_id, project_id: event.project_id || null, name: event.name, description: event.description || '', type: event.type, definition })
    .select()
    .single();
  if (error) return null;
  return { ...data, sourceEvent: data.definition?.sourceEvent, sourceEvents: data.definition?.sourceEvents, conditions: data.definition?.conditions };
}

export async function updateCustomEvent(
  id: string,
  updates: { name?: string; description?: string; type?: string; sourceEvent?: string; sourceEvents?: string[]; conditions?: { field: string; operator: string; value: string }[] }
): Promise<void> {
  const db = getSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.type !== undefined) row.type = updates.type;
  const definition: Record<string, unknown> = {};
  if (updates.sourceEvent !== undefined) definition.sourceEvent = updates.sourceEvent;
  if (updates.sourceEvents !== undefined) definition.sourceEvents = updates.sourceEvents;
  if (updates.conditions !== undefined) definition.conditions = updates.conditions;
  if (Object.keys(definition).length > 0) row.definition = definition;

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await db.from('fre_custom_events').update(row).eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const db = getSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await db.from('fre_custom_events').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

// ===== Saved Funnels =====

export async function listSavedFunnels(userId: string): Promise<SavedFunnel[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_saved_funnels')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createSavedFunnel(params: {
  userId: string; name: string; steps: string[];
}): Promise<SavedFunnel> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_saved_funnels')
    .insert({ user_id: params.userId, name: params.name, steps: params.steps })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSavedFunnel(id: string, params: {
  name?: string; steps?: string[];
}): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_saved_funnels')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteSavedFunnel(id: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_saved_funnels')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

// ===== Webhooks =====

import type { WebhookConfig, WebhookLog, WebhookEventType, WebhookFormat } from '../types';

export async function listWebhooks(): Promise<WebhookConfig[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_webhooks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createWebhook(params: {
  name: string; url: string; events: WebhookEventType[]; format: WebhookFormat;
}): Promise<WebhookConfig> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const secret = crypto.randomUUID();
  const { data, error } = await client
    .from('fre_webhooks')
    .insert({ user_id: user.id, ...params, secret })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateWebhook(id: string, params: Partial<{
  name: string; url: string; events: WebhookEventType[]; format: WebhookFormat; active: boolean;
}>): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_webhooks')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteWebhook(id: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function listWebhookLogs(webhookId: string, limit = 20): Promise<WebhookLog[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

// ===== Scheduled Reports =====

export async function listScheduledReports(): Promise<ScheduledReport[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_scheduled_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createScheduledReport(params: {
  name: string;
  frequency: ReportFrequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  hour_utc: number;
  webhook_ids: string[];
  project_id?: string | null;
}): Promise<ScheduledReport> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');
  const { data, error } = await client
    .from('fre_scheduled_reports')
    .insert({ ...params, user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateScheduledReport(
  id: string,
  params: Partial<Pick<ScheduledReport, 'name' | 'frequency' | 'day_of_week' | 'day_of_month' | 'hour_utc' | 'webhook_ids' | 'active'>>
): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_scheduled_reports')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteScheduledReport(id: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_scheduled_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

// ===== Teams =====

export async function createTeam(name: string): Promise<Team> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { data: team, error: teamErr } = await client
    .from('fre_teams')
    .insert({ name, owner_id: user.id })
    .select()
    .single();
  if (teamErr) throw new Error(teamErr.message);

  const { error: memberErr } = await client
    .from('fre_team_members')
    .insert({
      team_id: team.id,
      user_id: user.id,
      email: user.email!,
      role: 'admin',
      status: 'active',
      joined_at: new Date().toISOString(),
    });
  if (memberErr) throw new Error(memberErr.message);

  return team;
}

export async function getMyTeam(): Promise<{ team: Team; members: TeamMember[] } | null> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  // Check as owner first
  const { data: ownedTeam } = await client
    .from('fre_teams')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  let team = ownedTeam;
  if (!team) {
    // Check as member
    const { data: membership } = await client
      .from('fre_team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) return null;

    const { data: memberTeam } = await client
      .from('fre_teams')
      .select('*')
      .eq('id', membership.team_id)
      .single();

    team = memberTeam;
  }

  if (!team) return null;

  const { data: members, error: membersErr } = await client
    .from('fre_team_members')
    .select('*')
    .eq('team_id', team.id)
    .in('status', ['pending', 'active'])
    .order('invited_at', { ascending: true });

  if (membersErr) throw new Error(membersErr.message);

  return { team, members: members || [] };
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  const client = getSupabase();
  const { error } = await client
    .from('fre_teams')
    .update({ name })
    .eq('id', teamId);
  if (error) throw new Error(error.message);
}

export async function inviteTeamMember(
  teamId: string,
  email: string,
  role: TeamRole = 'member'
): Promise<TeamMember> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_team_members')
    .insert({ team_id: teamId, email, role, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  const client = getSupabase();
  const { error } = await client
    .from('fre_team_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('team_id', teamId);
  if (error) throw new Error(error.message);
}

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  role: TeamRole
): Promise<void> {
  const client = getSupabase();
  const { error } = await client
    .from('fre_team_members')
    .update({ role })
    .eq('id', memberId)
    .eq('team_id', teamId);
  if (error) throw new Error(error.message);
}

// ===== Connectors =====

// Sensitive config fields that should be masked on the client
const SENSITIVE_CONFIG_KEYS = ['password', 'accessToken', 'refreshToken', 'apiSecret'];

function maskSensitiveConfig<T extends object>(config: T): T {
  const masked = { ...config } as Record<string, unknown>;
  for (const key of SENSITIVE_CONFIG_KEYS) {
    if (typeof masked[key] === 'string' && (masked[key] as string).length > 0) {
      masked[key] = '••••••••';
    }
  }
  return masked as T;
}

export async function listConnectors(): Promise<ConnectorInstance[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_connectors')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as ConnectorInstance[]).map(c => ({
    ...c,
    config: maskSensitiveConfig(c.config),
  }));
}

export async function saveConnector(params: {
  type: string;
  name: string;
  config: ConnectorConfigData;
  projectId?: string;
  syncSchedule?: string | null;
}): Promise<ConnectorInstance> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_connectors')
    .insert({
      type: params.type,
      name: params.name,
      config: params.config,
      project_id: params.projectId || null,
      sync_schedule: params.syncSchedule || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ConnectorInstance;
}

export async function updateConnector(
  id: string,
  params: Partial<{
    name: string;
    config: ConnectorConfigData;
    syncSchedule: string | null;
    isActive: boolean;
  }>
): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const update: Record<string, unknown> = {};
  if (params.name !== undefined) update.name = params.name;
  if (params.config !== undefined) update.config = params.config;
  if (params.syncSchedule !== undefined) update.sync_schedule = params.syncSchedule;
  if (params.isActive !== undefined) update.is_active = params.isActive;

  const { error } = await client
    .from('fre_connectors')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function deleteConnector(id: string): Promise<void> {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증되지 않았습니다');

  const { error } = await client
    .from('fre_connectors')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

export async function listSyncLogs(connectorId: string, limit = 20): Promise<SyncLog[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('fre_sync_logs')
    .select('*')
    .eq('connector_id', connectorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as SyncLog[];
}

export async function triggerSync(connectorId: string): Promise<{ data: Record<string, string>[]; headers: string[]; totalRows: number }> {
  const client = getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connector-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'fetch', connectorId }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Sync failed (${response.status})`);
  }

  return response.json();
}

export async function testConnectorConnection(
  type: string,
  config: ConnectorConfigData
): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connector-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'test', type, config }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    return { success: false, message: text || `Connection failed (${response.status})` };
  }

  return response.json();
}
