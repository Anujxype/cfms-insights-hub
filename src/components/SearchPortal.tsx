import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ENDPOINTS, ApiEndpoint, fetchApiData, ApiResponse } from "@/lib/api";
import { addSearchLog, LoginKey } from "@/lib/supabaseDatabase";
import { getActiveBroadcastsForKey, dismissBroadcast, Broadcast } from "@/lib/broadcasts";
import { supabase } from "@/integrations/supabase/client";
import { getStoredDeviceId } from "@/lib/deviceFingerprint";
import JsonDisplay from "./JsonDisplay";
import EndpointIcon from "./EndpointIcon";
import {
  Search,
  LogOut,
  Loader2,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Monitor,
  Shield,
  AlertTriangle,
  CalendarClock,
  Zap,
  Bell,
  Info,
  X,
} from "lucide-react";
import { getDeviceInfo } from "@/lib/deviceFingerprint";
import { toast } from "sonner";

interface SearchPortalProps {
  userKey: LoginKey;
  onLogout: () => void;
}

const SearchPortal = ({ userKey, onLogout }: SearchPortalProps) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const broadcastsLoaded = useRef(false);

  const deviceInfo = getDeviceInfo();

  // Load broadcasts ONCE on mount
  useEffect(() => {
    if (broadcastsLoaded.current) return;
    broadcastsLoaded.current = true;
    
    const loadBroadcasts = async () => {
      const active = await getActiveBroadcastsForKey(userKey.id);
      setBroadcasts(active);
    };
    loadBroadcasts();
  }, [userKey.id]);

  // Real-time key status monitoring — auto-logout if key is disabled
  useEffect(() => {
    const channel = supabase
      .channel('key_status_monitor')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'login_keys',
        filter: `id=eq.${userKey.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.is_active === false) {
          toast.error("Your access key has been disabled by admin.", { duration: 5000 });
          setTimeout(() => onLogout(), 1500);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userKey.id, onLogout]);

  // Listen for admin session kill signal via Realtime Broadcast
  useEffect(() => {
    const deviceId = getStoredDeviceId();
    const channel = supabase
      .channel(`session_kill_${userKey.id}`)
      .on('broadcast', { event: 'kill_session' }, (payload) => {
        const msg = payload.payload as any;
        // Kill if target is 'all' or matches this device
        if (msg.target === 'all' || msg.target_device === deviceId) {
          toast.error(msg.reason || "Your session has been terminated by admin.", { duration: 5000 });
          setTimeout(() => onLogout(), 1500);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userKey.id, onLogout]);

  // Also poll key status every 30s as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('login_keys')
        .select('is_active')
        .eq('id', userKey.id)
        .single();
      
      if (data && !data.is_active) {
        toast.error("Your access key has been disabled.", { duration: 5000 });
        setTimeout(() => onLogout(), 1500);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [userKey.id, onLogout]);

  const handleDismissBroadcast = (bcId: string) => {
    dismissBroadcast(bcId);
    setBroadcasts(prev => prev.filter(b => b.id !== bcId));
  };

  const getExpirationWarning = () => {
    if (!userKey.expires_at) return null;
    const expiresAt = new Date(userKey.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return { message: "Your access key has expired!", urgent: true, days: 0 };
    if (daysLeft <= 3) return { message: `Your access key expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!`, urgent: true, days: daysLeft };
    if (daysLeft <= 7) return { message: `Your access key expires in ${daysLeft} days.`, urgent: false, days: daysLeft };
    return null;
  };

  const expirationWarning = getExpirationWarning();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setResponse(null);

    const startTime = Date.now();
    const result = await fetchApiData(selectedEndpoint, searchValue.trim());
    const responseTime = Date.now() - startTime;
    
    setResponse(result);

    await addSearchLog(
      userKey.id,
      userKey.name,
      selectedEndpoint.endpoint,
      selectedEndpoint.parameter,
      searchValue.trim(),
      result.success,
      responseTime
    );

    setLoading(false);
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: 'bg-destructive/10', border: 'border-destructive/30', icon: 'text-destructive', iconBg: 'bg-destructive/15' };
      case 'warning': return { bg: 'bg-warning/10', border: 'border-warning/30', icon: 'text-warning', iconBg: 'bg-warning/15' };
      default: return { bg: 'bg-primary/10', border: 'border-primary/30', icon: 'text-primary', iconBg: 'bg-primary/15' };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <Bell className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern noise-bg relative">
      {/* Animated ambient orbs */}
      <motion.div
        className="fixed top-0 left-1/3 w-[600px] h-[400px] bg-primary/3 rounded-full blur-[150px] pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/3 rounded-full blur-[150px] pointer-events-none"
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Broadcast Modal Overlay */}
      <AnimatePresence>
        {broadcasts.length > 0 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`max-w-lg w-full rounded-2xl border p-5 sm:p-6 shadow-2xl ${getPriorityStyles(broadcasts[0].priority).bg} ${getPriorityStyles(broadcasts[0].priority).border}`}
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityStyles(broadcasts[0].priority).iconBg}`}
                  initial={{ rotate: -20 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span className={getPriorityStyles(broadcasts[0].priority).icon}>
                    {getPriorityIcon(broadcasts[0].priority)}
                  </span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-base sm:text-lg mb-1">{broadcasts[0].title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{broadcasts[0].message}</p>
                  <p className="text-xs text-muted-foreground/50 mt-3">
                    {new Date(broadcasts[0].created_at).toLocaleString()}
                    {broadcasts.length > 1 && ` • ${broadcasts.length - 1} more alert${broadcasts.length > 2 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDismissBroadcast(broadcasts[0].id)}
                  className={
                    broadcasts[0].priority === 'urgent' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
                    broadcasts[0].priority === 'warning' ? 'bg-warning text-warning-foreground hover:bg-warning/90' :
                    ''
                  }
                >
                  {broadcasts.length > 1 ? 'Next' : 'Got it'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        className="border-b border-border/50 glass-strong sticky top-0 z-10"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 sm:gap-3" whileHover={{ scale: 1.02 }}>
            <motion.div
              className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Database className="w-4 h-4 text-primary" />
            </motion.div>
            <h1 className="text-base sm:text-lg font-bold gradient-text">CFMS Portal</h1>
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/40">
                <User className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-mono text-xs">{userKey.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-xs">{deviceInfo.browser}</span>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" onClick={onLogout} className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <motion.main
        className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-[2]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Expiration Warning Banner */}
        <AnimatePresence>
          {expirationWarning && (
            <motion.div
              className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border flex items-center gap-3 ${
                expirationWarning.urgent
                  ? 'bg-destructive/8 border-destructive/25'
                  : 'bg-warning/8 border-warning/25'
              }`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                expirationWarning.urgent ? 'bg-destructive/15' : 'bg-warning/15'
              }`}>
                <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${expirationWarning.urgent ? 'text-destructive' : 'text-warning'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-xs sm:text-sm ${expirationWarning.urgent ? 'text-destructive' : 'text-warning'}`}>
                  {expirationWarning.message}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  {userKey.expires_at && `Expires: ${new Date(userKey.expires_at).toLocaleDateString()}`}
                  {expirationWarning.days <= 0 ? ' — Contact admin.' : ' — Contact admin to extend.'}
                </p>
              </div>
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground/30 hidden sm:block" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Info */}
        <motion.div
          className="mb-4 sm:mb-6 p-3 sm:p-4 glass rounded-xl flex items-center justify-between"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-success" />
              <div className="absolute inset-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-success animate-ping opacity-40" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Secure Session Active</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                {deviceInfo.device} • {deviceInfo.os}
                <span className="hidden sm:inline"> • {deviceInfo.timezone}</span>
                {userKey.expires_at && <span className="hidden md:inline"> • Valid until {new Date(userKey.expires_at).toLocaleDateString()}</span>}
              </p>
            </div>
          </div>
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success/40" />
        </motion.div>

        {/* Endpoint Selection */}
        <motion.div className="mb-6 sm:mb-8" variants={itemVariants}>
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary/60" />
            Select Endpoint
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {API_ENDPOINTS.map((endpoint, index) => (
              <motion.button
                key={endpoint.id}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setResponse(null);
                }}
                className={`group p-3 sm:p-3.5 rounded-xl border text-left transition-colors duration-300 ${
                  selectedEndpoint.id === endpoint.id
                    ? "border-primary/40 bg-primary/8 text-primary glow-primary"
                    : "border-border/40 glass hover:border-primary/20 text-foreground"
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <EndpointIcon icon={endpoint.icon} isActive={selectedEndpoint.id === endpoint.id} />
                <div className="font-medium text-xs sm:text-sm truncate mt-2">{endpoint.name}</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {endpoint.endpoint}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Search Form */}
        <motion.div
          className="glass-strong rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border-gradient relative overflow-hidden"
          variants={itemVariants}
        >
          {/* Animated top line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </motion.div>

          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <EndpointIcon icon={selectedEndpoint.icon} isActive={true} />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {selectedEndpoint.name}
            </h2>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-5">
            {selectedEndpoint.description}
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder={selectedEndpoint.placeholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="font-mono h-11 sm:h-12 bg-background/40 border-border/50 focus:border-primary/50 transition-all duration-300 text-sm"
                disabled={loading}
              />
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" variant="glow" size="lg" disabled={loading || !searchValue.trim()} className="h-11 sm:h-12 w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                Search
              </Button>
            </motion.div>
          </form>

          <div className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground font-mono px-2 sm:px-3 py-1.5 sm:py-2 bg-background/30 rounded-lg inline-block overflow-x-auto max-w-full">
            GET {selectedEndpoint.endpoint}?{selectedEndpoint.parameter}=
            <span className="text-primary">{searchValue || "{value}"}</span>
          </div>
        </motion.div>

        {/* Response */}
        <AnimatePresence mode="wait">
          {(response || loading) && (
            <motion.div
              className="glass-strong rounded-2xl p-4 sm:p-6 border-gradient relative overflow-hidden"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Response</h2>
                  <AnimatePresence mode="wait">
                    {response && (
                      response.success ? (
                        <motion.span
                          key="success"
                          className="flex items-center gap-1.5 text-success text-xs sm:text-sm bg-success/8 px-2 sm:px-3 py-1 rounded-full border border-success/20"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          Success
                        </motion.span>
                      ) : (
                        <motion.span
                          key="error"
                          className="flex items-center gap-1.5 text-destructive text-xs sm:text-sm bg-destructive/8 px-2 sm:px-3 py-1 rounded-full border border-destructive/20"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          Error
                        </motion.span>
                      )
                    )}
                  </AnimatePresence>
                </div>
                {response && (
                  <motion.div
                    className="flex items-center gap-1.5 text-muted-foreground text-xs"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Clock className="w-3 h-3" />
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </motion.div>
                )}
              </div>

              {loading ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  </motion.div>
                  <motion.p
                    className="text-xs sm:text-sm text-muted-foreground"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Fetching data...
                  </motion.p>
                </motion.div>
              ) : response ? (
                <JsonDisplay
                  data={response.success ? response.data : { error: response.error }}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default SearchPortal;
