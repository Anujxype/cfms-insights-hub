import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllKeys,
  getAllLogs,
  getAllDevices,
  createKey,
  deleteKey,
  generateRandomKey,
  clearAllLogs,
  updateKeyStatus,
  updateKeyMaxDevices,
  updateKeyExpiration,
  updateKeyAllowedIps,
  blockDevice,
  unblockDevice,
  removeDevice,
  getDashboardStats,
  subscribeToKeys,
  subscribeToDevices,
  subscribeToLogs,
  killSessionsForKey,
  killDeviceSession,
  LoginKey,
  SearchLog,
  DeviceLogin,
} from "@/lib/supabaseDatabase";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  LogOut,
  Key,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Search,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Ban,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  TrendingUp,
  BarChart3,
  Eye,
  EyeOff,
  Settings,
  Lock,
  CalendarClock,
  Shield,
  Bell,
  Wifi,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminPasswordChange from "./AdminPasswordChange";
import { Textarea } from "@/components/ui/textarea";
import {
  getAllBroadcasts,
  createBroadcast,
  deleteBroadcast,
  toggleBroadcastStatus,
  Broadcast,
} from "@/lib/broadcasts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminPanelProps {
  onLogout: () => void;
}

const AdminPanel = ({ onLogout }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "keys" | "devices" | "logs" | "broadcast">("dashboard");
  const [keys, setKeys] = useState<LoginKey[]>([]);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [devices, setDevices] = useState<DeviceLogin[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyMaxDevices, setNewKeyMaxDevices] = useState("10");
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState("");
  const [newKeyAllowedIps, setNewKeyAllowedIps] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalKeys: 0,
    activeKeys: 0,
    totalDevices: 0,
    totalSearches: 0,
    recentActivity: [] as SearchLog[],
  });
  const [selectedKeyDevices, setSelectedKeyDevices] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcPriority, setBcPriority] = useState<"info" | "warning" | "urgent">("info");
  const [bcTargetType, setBcTargetType] = useState<"all" | "specific">("all");
  const [bcSelectedKeys, setBcSelectedKeys] = useState<string[]>([]);
  const [loginNotifications, setLoginNotifications] = useState<Array<{
    id: string;
    keyName: string;
    device: string;
    location: string;
    time: Date;
  }>>([]);
  const previousDeviceCountRef = useRef<number>(0);

  useEffect(() => {
    refreshData();
    
    const keysSubscription = subscribeToKeys(setKeys);
    const devicesSubscription = subscribeToDevices(setDevices);
    const logsSubscription = subscribeToLogs(setLogs);

    const loginChannel = supabase
      .channel('admin_login_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'device_logins' }, (payload) => {
        const newDevice = payload.new as any;
        const device = `${newDevice.browser || 'Unknown'} on ${newDevice.os || 'Unknown'}`;
        const location = newDevice.location || 'Unknown';

        supabase.from('login_keys').select('name').eq('id', newDevice.key_id).single().then(({ data }) => {
          const notification = {
            id: newDevice.id,
            keyName: data?.name || 'Unknown Key',
            device,
            location,
            time: new Date(),
          };
          setLoginNotifications(prev => [notification, ...prev].slice(0, 20));
          toast.info(`🔔 New Login: ${notification.keyName}`, {
            description: `${device} from ${location}`,
            duration: 8000,
          });
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'device_logins' }, (payload) => {
        const updated = payload.new as any;
        const old = payload.old as any;
        if (updated.login_count > (old.login_count || 0)) {
          supabase.from('login_keys').select('name').eq('id', updated.key_id).single().then(({ data }) => {
            if (data) {
              toast.info(`🔑 Return Login: ${data.name}`, {
                description: `${updated.browser || 'Unknown'} on ${updated.os || 'Unknown'} from ${updated.location || 'Unknown'}`,
                duration: 5000,
              });
            }
          });
        }
      })
      .subscribe();

    return () => {
      keysSubscription.unsubscribe();
      devicesSubscription.unsubscribe();
      logsSubscription.unsubscribe();
      loginChannel.unsubscribe();
    };
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const [keysData, logsData, devicesData, statsData, broadcastsData] = await Promise.all([
      getAllKeys(),
      getAllLogs(),
      getAllDevices(),
      getDashboardStats(),
      getAllBroadcasts(),
    ]);
    setKeys(keysData);
    setLogs(logsData);
    setDevices(devicesData);
    setStats(statsData);
    setBroadcasts(broadcastsData);
    previousDeviceCountRef.current = devicesData.length;
    setLoading(false);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    const keyValue = newKeyValue.trim() || generateRandomKey();
    const maxDevices = parseInt(newKeyMaxDevices) || 10;
    const expiresAt = newKeyExpiresAt ? new Date(newKeyExpiresAt).toISOString() : null;
    const allowedIps = newKeyAllowedIps.trim()
      ? newKeyAllowedIps.split(',').map(ip => ip.trim()).filter(Boolean)
      : null;
    
    const result = await createKey(newKeyName.trim(), keyValue, maxDevices, expiresAt, allowedIps);
    if (result) {
      toast.success("Key created successfully");
      setNewKeyName("");
      setNewKeyValue("");
      setNewKeyMaxDevices("10");
      setNewKeyExpiresAt("");
      setNewKeyAllowedIps("");
      refreshData();
    } else {
      toast.error("Failed to create key");
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (confirm(`Delete key "${name}"? This will remove all associated devices and logs.`)) {
      const success = await deleteKey(id);
      if (success) {
        toast.success("Key deleted");
        refreshData();
      } else {
        toast.error("Failed to delete key");
      }
    }
  };

  const handleToggleKeyStatus = async (id: string, currentStatus: boolean) => {
    const success = await updateKeyStatus(id, !currentStatus);
    if (success) {
      toast.success(currentStatus ? "Key deactivated" : "Key activated");
      // If deactivating, also kill all active sessions for this key
      if (currentStatus) {
        await killSessionsForKey(id, "Your access key has been disabled by admin.");
        toast.success("All active sessions terminated");
      }
      refreshData();
    }
  };

  const handleKillSessions = async (keyId: string, keyName: string) => {
    if (confirm(`Kill all active sessions for "${keyName}"? Users will be logged out immediately.`)) {
      await killSessionsForKey(keyId, "Your session has been terminated by admin.");
      toast.success(`All sessions killed for ${keyName}`);
    }
  };

  const handleKillDeviceSession = async (keyId: string, deviceId: string) => {
    await killDeviceSession(keyId, deviceId, "Your session has been terminated by admin.");
    toast.success("Device session killed");
  };

  const handleBlockDevice = async (deviceId: string) => {
    const success = await blockDevice(deviceId);
    if (success) {
      toast.success("Device blocked");
      refreshData();
    }
  };

  const handleUnblockDevice = async (deviceId: string) => {
    const success = await unblockDevice(deviceId);
    if (success) {
      toast.success("Device unblocked");
      refreshData();
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (confirm("Remove this device? The user will need to re-authenticate.")) {
      const success = await removeDevice(deviceId);
      if (success) {
        toast.success("Device removed");
        refreshData();
      }
    }
  };

  const handleClearLogs = async () => {
    if (confirm("Clear all logs? This action cannot be undone.")) {
      const success = await clearAllLogs();
      if (success) {
        toast.success("Logs cleared");
        refreshData();
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const generateNewKey = () => {
    setNewKeyValue(generateRandomKey());
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile': return <Smartphone className="w-4 h-4" />;
      case 'Tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getDevicesForKey = (keyId: string) => {
    return devices.filter(d => d.key_id === keyId);
  };

  const getExpirationBadge = (key: LoginKey) => {
    if (!key.expires_at) return null;
    const expiresAt = new Date(key.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    if (daysLeft <= 3) return <Badge variant="destructive" className="text-xs">{daysLeft}d left</Badge>;
    if (daysLeft <= 7) return <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">{daysLeft}d left</Badge>;
    return <Badge variant="outline" className="text-xs">{expiresAt.toLocaleDateString()}</Badge>;
  };

  const getExpiringKeys = () => {
    return keys.filter(k => {
      if (!k.expires_at || !k.is_active) return false;
      const daysLeft = Math.ceil((new Date(k.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && daysLeft > 0;
    });
  };

  const expiringKeys = getExpiringKeys();

  return (
    <div className="min-h-screen bg-background grid-pattern noise-bg relative">
      {/* Ambient orbs */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[400px] bg-accent/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[400px] bg-primary/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header — fully responsive */}
      <header className="border-b border-border/40 glass-strong sticky top-0 z-10">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Admin Control Center</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Notification bell */}
            {loginNotifications.length > 0 && (
              <div className="relative mr-1">
                <Bell className="w-5 h-5 text-accent animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center">
                  {loginNotifications.length}
                </span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={refreshData} disabled={loading} className="text-xs sm:text-sm px-2 sm:px-3">
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPasswordChange(true)} className="text-xs sm:text-sm px-2 sm:px-3">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Change Password</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs sm:text-sm px-2 sm:px-3">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-[2]">
        {/* Tabs — scrollable on mobile */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-thin">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'keys', icon: Key, label: 'Keys' },
            { id: 'devices', icon: Monitor, label: 'Devices' },
            { id: 'logs', icon: FileText, label: 'Logs' },
            { id: 'broadcast', icon: Bell, label: 'Broadcast' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-shrink-0 text-xs sm:text-sm ${activeTab === tab.id 
                ? "bg-accent text-accent-foreground hover:bg-accent/85 shadow-[0_0_15px_hsl(var(--accent)/0.25)]" 
                : "glass border-border/40 hover:border-accent/30"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Expiring Keys Warning */}
            {expiringKeys.length > 0 && (
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  <h2 className="text-sm font-semibold text-accent">Keys Expiring Soon</h2>
                </div>
                <div className="space-y-2">
                  {expiringKeys.map(k => {
                    const daysLeft = Math.ceil((new Date(k.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={k.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{k.name}</span>
                        <span className={`${daysLeft <= 3 ? 'text-destructive' : 'text-accent'} font-mono text-xs`}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Login Notifications */}
            {loginNotifications.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Recent Login Alerts</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLoginNotifications([])}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {loginNotifications.slice(0, 5).map(n => (
                    <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-card/50 border border-border text-sm gap-1">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{n.keyName}</span>
                        <span className="text-muted-foreground ml-2 text-xs sm:text-sm">• {n.device}</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{n.time.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="glass rounded-xl p-4 sm:p-6 card-hover">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm">Total Keys</p>
                    <p className="text-2xl sm:text-3xl font-bold gradient-text">{stats.totalKeys}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <Key className="w-5 h-5 sm:w-6 sm:h-6 text-primary/50" />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 truncate">
                  {stats.activeKeys} active
                  {expiringKeys.length > 0 && ` • ${expiringKeys.length} expiring`}
                </p>
              </div>
              <div className="glass rounded-xl p-4 sm:p-6 card-hover">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm">Devices</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalDevices}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-success/8 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-success/50" />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">Connected users</p>
              </div>
              <div className="glass rounded-xl p-4 sm:p-6 card-hover">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm">Searches</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalSearches}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/8 flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 text-accent/50" />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">API requests</p>
              </div>
              <div className="glass rounded-xl p-4 sm:p-6 card-hover">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm">Success Rate</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      {stats.totalSearches > 0 
                        ? Math.round((logs.filter(l => l.success).length / logs.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary/50" />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">Successful queries</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-accent" />
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Recent Activity</h2>
              </div>
              {stats.recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2 ${
                        log.success
                          ? "bg-success/5 border-success/20"
                          : "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {log.success ? (
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-mono text-xs sm:text-sm text-foreground">
                            {log.endpoint}
                          </span>
                          <span className="text-muted-foreground text-xs sm:text-sm ml-2">
                            by {log.key_name}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 pl-7 sm:pl-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keys Tab */}
        {activeTab === "keys" && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Create Key */}
            <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                Create New Key
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Key Name</label>
                  <Input
                    placeholder="e.g., User Alpha"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Key Value (auto if empty)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Auto-generated"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className="font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={generateNewKey} className="flex-shrink-0">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Max Devices</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={newKeyMaxDevices}
                    onChange={(e) => setNewKeyMaxDevices(e.target.value)}
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    Expiration (optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={newKeyExpiresAt}
                    onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Allowed IPs (comma-separated, optional)
                  </label>
                  <Input
                    placeholder="e.g., 192.168.1.1, 10.0.0.1"
                    value={newKeyAllowedIps}
                    onChange={(e) => setNewKeyAllowedIps(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <Button onClick={handleCreateKey} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_15px_hsl(var(--accent)/0.2)]">
                <Plus className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            </div>

            {/* Keys Table */}
            <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent" />
                  Access Keys ({keys.length})
                </h2>
              </div>

              {keys.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No keys created yet</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[800px] sm:min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>IPs</TableHead>
                          <TableHead>Devices</TableHead>
                          <TableHead>Uses</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Used</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keys.map((key) => {
                          const keyDevices = getDevicesForKey(key.id);
                          const activeDevices = keyDevices.filter(d => !d.is_blocked).length;
                          return (
                            <TableRow key={key.id}>
                              <TableCell className="font-medium">{key.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-secondary px-2 py-1 rounded">
                                    {key.key}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(key.key, key.id)}
                                  >
                                    {copiedId === key.id ? (
                                      <Check className="w-3 h-3 text-success" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={key.is_active ? "default" : "secondary"}>
                                  {key.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {key.expires_at ? (
                                  <div className="flex flex-col gap-1">
                                    {getExpirationBadge(key)}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Never</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {key.allowed_ips && key.allowed_ips.length > 0 ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-auto p-1">
                                        <Badge variant="outline" className="text-xs">
                                          <Wifi className="w-3 h-3 mr-1" />
                                          {key.allowed_ips.length} IP{key.allowed_ips.length !== 1 ? 's' : ''}
                                        </Badge>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Allowed IPs for {key.name}</DialogTitle>
                                        <DialogDescription>Only these IPs can use this key</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-2">
                                        {key.allowed_ips.map((ip, i) => (
                                          <div key={i} className="flex items-center gap-2 p-2 bg-secondary/30 rounded font-mono text-sm">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            {ip}
                                          </div>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                ) : (
                                  <span className="text-xs text-muted-foreground">All</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-auto p-1">
                                      <span className={`${activeDevices >= key.max_devices ? 'text-destructive' : 'text-foreground'}`}>
                                        {activeDevices}/{key.max_devices}
                                      </span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Devices for {key.name}</DialogTitle>
                                      <DialogDescription>
                                        {activeDevices} of {key.max_devices} device slots used
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[400px] overflow-y-auto">
                                      {keyDevices.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">No devices registered</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {keyDevices.map((device) => (
                                            <div
                                              key={device.id}
                                              className={`p-3 rounded-lg border ${device.is_blocked ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/30'}`}
                                            >
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                  {getDeviceIcon(device.device_type)}
                                                  <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                      {device.browser} on {device.os}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                      <Globe className="w-3 h-3 flex-shrink-0" />
                                                      <span className="truncate">{device.location || 'Unknown location'}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                  {device.is_blocked ? (
                                                    <Button size="sm" variant="outline" onClick={() => handleUnblockDevice(device.id)}>
                                                      Unblock
                                                    </Button>
                                                  ) : (
                                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleBlockDevice(device.id)}>
                                                      <Ban className="w-4 h-4" />
                                                    </Button>
                                                  )}
                                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveDevice(device.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                              <div className="mt-2 text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                                                <span>First login: {new Date(device.first_login).toLocaleString()}</span>
                                                <span>Last login: {new Date(device.last_login).toLocaleString()}</span>
                                                <span>Login count: {device.login_count}</span>
                                                <span>IP: {device.ip_address || 'Unknown'}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                              <TableCell>{key.usage_count}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(key.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleKillSessions(key.id, key.name)}
                                    title="Kill all sessions"
                                    className="text-accent hover:text-accent"
                                  >
                                    <Zap className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleKeyStatus(key.id, key.is_active)}
                                    title={key.is_active ? "Deactivate" : "Activate"}
                                  >
                                    {key.is_active ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteKey(key.id, key.name)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Monitor className="w-5 h-5 text-accent" />
                All Devices ({devices.length})
              </h2>
            </div>

            {devices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No devices registered yet</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[700px] sm:min-w-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Logins</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => {
                        const key = keys.find(k => k.id === device.key_id);
                        return (
                          <TableRow key={device.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(device.device_type)}
                                <div>
                                  <div className="font-medium text-sm">{device.browser}</div>
                                  <div className="text-xs text-muted-foreground">{device.os} • {device.screen_resolution}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{key?.name || 'Unknown'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Globe className="w-3 h-3" />
                                {device.location || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {device.ip_address || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={device.is_blocked ? "destructive" : "default"}>
                                {device.is_blocked ? "Blocked" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell>{device.login_count}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(device.last_login).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="text-accent" onClick={() => handleKillDeviceSession(device.key_id, device.device_id)} title="Kill session">
                                  <Zap className="w-4 h-4" />
                                </Button>
                                {device.is_blocked ? (
                                  <Button size="sm" variant="outline" onClick={() => handleUnblockDevice(device.id)}>
                                    Unblock
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-accent" onClick={() => handleBlockDevice(device.id)}>
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveDevice(device.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient animate-fade-in">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Search Logs ({logs.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No search logs yet</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[600px] sm:min-w-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Query</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const device = devices.find(d => d.device_id === log.device_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              {log.success ? (
                                <Badge variant="default" className="bg-success/20 text-success border-success/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                            <TableCell>
                              <code className="text-xs bg-secondary px-2 py-1 rounded">
                                {log.parameter}={log.value}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.key_name}</Badge>
                            </TableCell>
                            <TableCell>
                              {device ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {getDeviceIcon(device.device_type)}
                                  {device.browser}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === "broadcast" && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Create Broadcast */}
            <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-accent" />
                Send Broadcast / Alert
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Title</label>
                  <Input
                    placeholder="e.g., Scheduled Maintenance"
                    value={bcTitle}
                    onChange={(e) => setBcTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Priority</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['info', 'warning', 'urgent'] as const).map(p => (
                      <Button
                        key={p}
                        variant={bcPriority === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBcPriority(p)}
                        className={bcPriority === p ? (
                          p === 'urgent' ? 'bg-destructive text-destructive-foreground' :
                          p === 'warning' ? 'bg-accent text-accent-foreground' :
                          'bg-primary text-primary-foreground'
                        ) : ''}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Message</label>
                  <Textarea
                    placeholder="Enter broadcast message..."
                    value={bcMessage}
                    onChange={(e) => setBcMessage(e.target.value)}
                    rows={3}
                    className="w-full box-border"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">Target</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={bcTargetType === 'all' ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setBcTargetType('all'); setBcSelectedKeys([]); }}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      All Users
                    </Button>
                    <Button
                      variant={bcTargetType === 'specific' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBcTargetType('specific')}
                    >
                      <Key className="w-4 h-4 mr-1" />
                      Specific Keys
                    </Button>
                  </div>
                </div>
                {bcTargetType === 'specific' && (
                  <div>
                    <label className="text-xs sm:text-sm text-muted-foreground mb-2 block">
                      Select Keys ({bcSelectedKeys.length} selected)
                    </label>
                    <div className="max-h-[150px] overflow-y-auto space-y-1 border border-border/40 rounded-lg p-2 bg-background/30">
                      {keys.filter(k => k.is_active).map(key => (
                        <label key={key.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/30 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={bcSelectedKeys.includes(key.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBcSelectedKeys(prev => [...prev, key.id]);
                              } else {
                                setBcSelectedKeys(prev => prev.filter(id => id !== key.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-foreground truncate">{key.name}</span>
                          <span className="text-muted-foreground font-mono text-xs ml-auto hidden sm:inline">{key.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={async () => {
                  if (!bcTitle.trim() || !bcMessage.trim()) {
                    toast.error("Title and message are required");
                    return;
                  }
                  if (bcTargetType === 'specific' && bcSelectedKeys.length === 0) {
                    toast.error("Select at least one key");
                    return;
                  }
                  const result = await createBroadcast(
                    bcTitle.trim(),
                    bcMessage.trim(),
                    bcTargetType,
                    bcTargetType === 'specific' ? bcSelectedKeys : null,
                    bcPriority
                  );
                  if (result) {
                    toast.success("Broadcast sent successfully!");
                    setBcTitle(""); setBcMessage(""); setBcSelectedKeys([]); setBcTargetType("all"); setBcPriority("info");
                    refreshData();
                  } else {
                    toast.error("Failed to send broadcast");
                  }
                }}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_15px_hsl(var(--accent)/0.2)]"
              >
                <Bell className="w-4 h-4 mr-2" />
                Send Broadcast
              </Button>
            </div>

            {/* Existing Broadcasts */}
            <div className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Broadcast History ({broadcasts.length})
              </h2>
              {broadcasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No broadcasts sent yet</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map(bc => (
                    <div key={bc.id} className={`p-3 sm:p-4 rounded-xl border ${
                      !bc.is_active ? 'opacity-50 border-border/30' :
                      bc.priority === 'urgent' ? 'border-destructive/30 bg-destructive/5' :
                      bc.priority === 'warning' ? 'border-accent/30 bg-accent/5' :
                      'border-primary/30 bg-primary/5'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm">{bc.title}</h3>
                            <Badge variant="outline" className={`text-[10px] ${
                              bc.priority === 'urgent' ? 'border-destructive/40 text-destructive' :
                              bc.priority === 'warning' ? 'border-accent/40 text-accent' :
                              'border-primary/40 text-primary'
                            }`}>
                              {bc.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {bc.target_type === 'all' ? 'All Users' : `${bc.target_key_ids?.length || 0} Keys`}
                            </Badge>
                            {!bc.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground break-words">{bc.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {new Date(bc.created_at).toLocaleString()}
                            {bc.target_type === 'specific' && bc.target_key_ids && (
                              <span className="ml-2">
                                → {bc.target_key_ids.map(id => keys.find(k => k.id === id)?.name || 'Unknown').join(', ')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={async () => {
                              await toggleBroadcastStatus(bc.id, !bc.is_active);
                              refreshData();
                              toast.success(bc.is_active ? "Broadcast deactivated" : "Broadcast reactivated");
                            }}
                            title={bc.is_active ? "Deactivate" : "Activate"}
                          >
                            {bc.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={async () => {
                              if (confirm("Delete this broadcast?")) {
                                await deleteBroadcast(bc.id);
                                refreshData();
                                toast.success("Broadcast deleted");
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <AdminPasswordChange onClose={() => setShowPasswordChange(false)} />
      )}
    </div>
  );
};

export default AdminPanel;
