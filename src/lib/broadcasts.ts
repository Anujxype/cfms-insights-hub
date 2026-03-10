import { supabase } from '@/integrations/supabase/client';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  target_type: 'all' | 'specific';
  target_key_ids: string[] | null;
  priority: 'info' | 'warning' | 'urgent';
  created_at: string;
  is_active: boolean;
}

const DISMISSED_KEY = 'cfms_dismissed_broadcasts';

// Get dismissed broadcast IDs from localStorage
export const getDismissedBroadcasts = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
};

// Mark a broadcast as dismissed
export const dismissBroadcast = (broadcastId: string) => {
  const dismissed = getDismissedBroadcasts();
  if (!dismissed.includes(broadcastId)) {
    dismissed.push(broadcastId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
};

// Fetch active broadcasts for a specific key (unseen only)
export const getActiveBroadcastsForKey = async (keyId: string): Promise<Broadcast[]> => {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const dismissed = getDismissedBroadcasts();

  return (data as Broadcast[]).filter(b => {
    if (dismissed.includes(b.id)) return false;
    if (b.target_type === 'all') return true;
    return b.target_key_ids?.includes(keyId) ?? false;
  });
};

// Admin: get all broadcasts
export const getAllBroadcasts = async (): Promise<Broadcast[]> => {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as Broadcast[];
};

// Admin: create broadcast
export const createBroadcast = async (
  title: string,
  message: string,
  targetType: 'all' | 'specific',
  targetKeyIds: string[] | null,
  priority: 'info' | 'warning' | 'urgent'
): Promise<Broadcast | null> => {
  const insertData: Record<string, unknown> = {
    title,
    message,
    target_type: targetType,
    priority,
    is_active: true,
  };
  if (targetType === 'specific' && targetKeyIds) {
    insertData.target_key_ids = targetKeyIds;
  }

  const { data, error } = await supabase
    .from('broadcasts')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create broadcast:', error);
    return null;
  }
  return data as Broadcast;
};

// Admin: delete broadcast
export const deleteBroadcast = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('broadcasts').delete().eq('id', id);
  return !error;
};

// Admin: toggle broadcast active status
export const toggleBroadcastStatus = async (id: string, isActive: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('broadcasts')
    .update({ is_active: isActive })
    .eq('id', id);
  return !error;
};
