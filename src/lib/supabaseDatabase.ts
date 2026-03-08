// Supabase database operations for keys, logs, and device tracking
import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo, getStoredDeviceId, DeviceInfo } from './deviceFingerprint';

// Types
export interface LoginKey {
  id: string;
  key: string;
  name: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
  max_devices: number;
  is_active: boolean;
  expires_at?: string | null;
  allowed_ips?: string[] | null;
}

export interface DeviceLogin {
  id: string;
  key_id: string;
  device_id: string;
  browser: string;
  os: string;
  device_type: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  ip_address?: string;
  location?: string;
  first_login: string;
  last_login: string;
  login_count: number;
  is_blocked: boolean;
}

export interface SearchLog {
  id: string;
  key_id: string;
  key_name: string;
  device_id: string;
  endpoint: string;
  parameter: string;
  value: string;
  timestamp: string;
  success: boolean;
  response_time_ms?: number;
}

// Get approximate location from IP (using free API)
const getLocationFromIP = async (): Promise<{ ip: string; location: string }> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return {
        ip: data.ip || 'Unknown',
        location: `${data.city || 'Unknown'}, ${data.region || ''}, ${data.country_name || 'Unknown'}`,
      };
    }
  } catch (error) {
    console.error('Failed to get location:', error);
  }
  return { ip: 'Unknown', location: 'Unknown' };
};

// Key Management
export const validateKeyWithDevice = async (keyValue: string): Promise<{
  success: boolean;
  key?: LoginKey;
  error?: string;
  deviceCount?: number;
  maxDevices?: number;
  expiresAt?: string | null;
}> => {
  const deviceId = getStoredDeviceId();
  const deviceInfo = getDeviceInfo();

  // Get the key
  const { data: keys, error: keyError } = await supabase
    .from('login_keys')
    .select('*')
    .eq('key', keyValue)
    .eq('is_active', true);

  if (keyError || !keys || keys.length === 0) {
    return { success: false, error: 'Invalid access key' };
  }

  const key = keys[0] as LoginKey;

  // Check expiration
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    // Auto-disable expired key
    await supabase.from('login_keys').update({ is_active: false }).eq('id', key.id);
    return { success: false, error: 'This access key has expired. Contact admin for renewal.' };
  }

  // Check IP whitelist
  if (key.allowed_ips && key.allowed_ips.length > 0) {
    try {
      const ipResponse = await fetch('https://ipapi.co/json/');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        if (!key.allowed_ips.includes(ipData.ip)) {
          return { success: false, error: 'Access denied: Your IP address is not authorized for this key.' };
        }
      }
    } catch {
      // If IP check fails, allow access (fail open for usability)
    }
  }

  // Check existing devices for this key
  const { data: devices, error: deviceError } = await supabase
    .from('device_logins')
    .select('*')
    .eq('key_id', key.id)
    .eq('is_blocked', false);

  if (deviceError) {
    return { success: false, error: 'Failed to verify device' };
  }

  const existingDevice = devices?.find(d => d.device_id === deviceId);
  const activeDeviceCount = devices?.length || 0;

  // Check if this device is already registered
  if (existingDevice) {
    // Update last login
    await supabase
      .from('device_logins')
      .update({
        last_login: new Date().toISOString(),
        login_count: existingDevice.login_count + 1,
      })
      .eq('id', existingDevice.id);
  } else {
    // Check device limit
    if (activeDeviceCount >= key.max_devices) {
      return {
        success: false,
        error: `Device limit reached (${key.max_devices} devices). Contact admin.`,
        deviceCount: activeDeviceCount,
        maxDevices: key.max_devices,
      };
    }

    // Register new device
    const locationInfo = await getLocationFromIP();
    
    await supabase.from('device_logins').insert({
      key_id: key.id,
      device_id: deviceId,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device_type: deviceInfo.device,
      screen_resolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      ip_address: locationInfo.ip,
      location: locationInfo.location,
      first_login: new Date().toISOString(),
      last_login: new Date().toISOString(),
      login_count: 1,
      is_blocked: false,
    });
  }

  // Update key usage
  await supabase
    .from('login_keys')
    .update({
      last_used: new Date().toISOString(),
      usage_count: key.usage_count + 1,
    })
    .eq('id', key.id);

  return {
    success: true,
    key,
    deviceCount: existingDevice ? activeDeviceCount : activeDeviceCount + 1,
    maxDevices: key.max_devices,
    expiresAt: key.expires_at,
  };
};

export const getAllKeys = async (): Promise<LoginKey[]> => {
  const { data, error } = await supabase
    .from('login_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch keys:', error);
    return [];
  }

  return data as LoginKey[];
};

export const createKey = async (
  name: string,
  keyValue: string,
  maxDevices: number = 10,
  expiresAt?: string | null,
  allowedIps?: string[] | null
): Promise<LoginKey | null> => {
  const { data, error } = await supabase
    .from('login_keys')
    .insert({
      key: keyValue,
      name,
      max_devices: maxDevices,
      usage_count: 0,
      is_active: true,
      expires_at: expiresAt || null,
      allowed_ips: allowedIps && allowedIps.length > 0 ? allowedIps : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create key:', error);
    return null;
  }

  return data as LoginKey;
};

export const deleteKey = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('login_keys')
    .delete()
    .eq('id', id);

  return !error;
};

export const updateKeyStatus = async (id: string, isActive: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('login_keys')
    .update({ is_active: isActive })
    .eq('id', id);

  return !error;
};

export const updateKeyMaxDevices = async (id: string, maxDevices: number): Promise<boolean> => {
  const { error } = await supabase
    .from('login_keys')
    .update({ max_devices: maxDevices })
    .eq('id', id);

  return !error;
};

// Device Management
export const getDevicesForKey = async (keyId: string): Promise<DeviceLogin[]> => {
  const { data, error } = await supabase
    .from('device_logins')
    .select('*')
    .eq('key_id', keyId)
    .order('last_login', { ascending: false });

  if (error) {
    console.error('Failed to fetch devices:', error);
    return [];
  }

  return data as DeviceLogin[];
};

export const getAllDevices = async (): Promise<DeviceLogin[]> => {
  const { data, error } = await supabase
    .from('device_logins')
    .select('*')
    .order('last_login', { ascending: false });

  if (error) {
    console.error('Failed to fetch devices:', error);
    return [];
  }

  return data as DeviceLogin[];
};

export const blockDevice = async (deviceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('device_logins')
    .update({ is_blocked: true })
    .eq('id', deviceId);

  return !error;
};

export const unblockDevice = async (deviceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('device_logins')
    .update({ is_blocked: false })
    .eq('id', deviceId);

  return !error;
};

export const removeDevice = async (deviceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('device_logins')
    .delete()
    .eq('id', deviceId);

  return !error;
};

// Search Logs
export const addSearchLog = async (
  keyId: string,
  keyName: string,
  endpoint: string,
  parameter: string,
  value: string,
  success: boolean,
  responseTimeMs?: number
): Promise<void> => {
  const deviceId = getStoredDeviceId();

  await supabase.from('search_logs').insert({
    key_id: keyId,
    key_name: keyName,
    device_id: deviceId,
    endpoint,
    parameter,
    value,
    success,
    response_time_ms: responseTimeMs,
    timestamp: new Date().toISOString(),
  });
};

export const getAllLogs = async (limit: number = 500): Promise<SearchLog[]> => {
  const { data, error } = await supabase
    .from('search_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch logs:', error);
    return [];
  }

  return data as SearchLog[];
};

export const getLogsForKey = async (keyId: string): Promise<SearchLog[]> => {
  const { data, error } = await supabase
    .from('search_logs')
    .select('*')
    .eq('key_id', keyId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Failed to fetch logs:', error);
    return [];
  }

  return data as SearchLog[];
};

export const clearAllLogs = async (): Promise<boolean> => {
  const { error } = await supabase
    .from('search_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  return !error;
};

// Stats
export const getKeyStats = async (keyId: string): Promise<{
  totalSearches: number;
  successfulSearches: number;
  activeDevices: number;
  blockedDevices: number;
}> => {
  const [logsResult, devicesResult] = await Promise.all([
    supabase.from('search_logs').select('success').eq('key_id', keyId),
    supabase.from('device_logins').select('is_blocked').eq('key_id', keyId),
  ]);

  const logs = logsResult.data || [];
  const devices = devicesResult.data || [];

  return {
    totalSearches: logs.length,
    successfulSearches: logs.filter(l => l.success).length,
    activeDevices: devices.filter(d => !d.is_blocked).length,
    blockedDevices: devices.filter(d => d.is_blocked).length,
  };
};

export const getDashboardStats = async (): Promise<{
  totalKeys: number;
  activeKeys: number;
  totalDevices: number;
  totalSearches: number;
  recentActivity: SearchLog[];
}> => {
  const [keysResult, devicesResult, logsResult, recentResult] = await Promise.all([
    supabase.from('login_keys').select('is_active'),
    supabase.from('device_logins').select('id'),
    supabase.from('search_logs').select('id'),
    supabase.from('search_logs').select('*').order('timestamp', { ascending: false }).limit(10),
  ]);

  const keys = keysResult.data || [];
  
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.is_active).length,
    totalDevices: devicesResult.data?.length || 0,
    totalSearches: logsResult.data?.length || 0,
    recentActivity: (recentResult.data || []) as SearchLog[],
  };
};

// Generate random key
export const generateRandomKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [4, 4, 4];
  return 'CFMS-' + segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
};

// Subscribe to real-time updates
export const subscribeToKeys = (callback: (keys: LoginKey[]) => void) => {
  return supabase
    .channel('login_keys_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'login_keys' }, async () => {
      const keys = await getAllKeys();
      callback(keys);
    })
    .subscribe();
};

export const subscribeToDevices = (callback: (devices: DeviceLogin[]) => void) => {
  return supabase
    .channel('device_logins_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'device_logins' }, async () => {
      const devices = await getAllDevices();
      callback(devices);
    })
    .subscribe();
};

export const subscribeToLogs = (callback: (logs: SearchLog[]) => void) => {
  return supabase
    .channel('search_logs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'search_logs' }, async () => {
      const logs = await getAllLogs();
      callback(logs);
    })
    .subscribe();
};
