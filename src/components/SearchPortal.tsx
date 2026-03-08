import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ENDPOINTS, ApiEndpoint, fetchApiData, ApiResponse } from "@/lib/api";
import { addSearchLog, LoginKey } from "@/lib/supabaseDatabase";
import JsonDisplay from "./JsonDisplay";
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
} from "lucide-react";
import { getDeviceInfo } from "@/lib/deviceFingerprint";

interface SearchPortalProps {
  userKey: LoginKey;
  onLogout: () => void;
}

const SearchPortal = ({ userKey, onLogout }: SearchPortalProps) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const deviceInfo = getDeviceInfo();

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

  return (
    <div className="min-h-screen bg-background grid-pattern noise-bg relative">
      {/* Ambient orbs */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[400px] bg-primary/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border/50 glass-strong sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold gradient-text">CFMS Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border/40">
                <User className="w-3.5 h-3.5 text-primary/60" />
                <span className="font-mono text-xs">{userKey.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-xs">{deviceInfo.browser}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-[2]">
        {/* Expiration Warning Banner */}
        {expirationWarning && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-fade-in-down ${
            expirationWarning.urgent
              ? 'bg-destructive/8 border-destructive/25'
              : 'bg-warning/8 border-warning/25'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              expirationWarning.urgent ? 'bg-destructive/15' : 'bg-warning/15'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${expirationWarning.urgent ? 'text-destructive' : 'text-warning'}`} />
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${expirationWarning.urgent ? 'text-destructive' : 'text-warning'}`}>
                {expirationWarning.message}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userKey.expires_at && `Expires: ${new Date(userKey.expires_at).toLocaleDateString()} at ${new Date(userKey.expires_at).toLocaleTimeString()}`}
                {expirationWarning.days <= 0 ? ' — Please contact your administrator for renewal.' : ' — Contact admin to extend.'}
              </p>
            </div>
            <CalendarClock className="w-5 h-5 flex-shrink-0 text-muted-foreground/30" />
          </div>
        )}

        {/* Session Info */}
        <div className="mb-6 p-4 glass rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success animate-ping opacity-40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Secure Session Active</p>
              <p className="text-xs text-muted-foreground">
                {deviceInfo.device} • {deviceInfo.os} • {deviceInfo.timezone}
                {userKey.expires_at && ` • Valid until ${new Date(userKey.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <Shield className="w-5 h-5 text-success/40" />
        </div>

        {/* Endpoint Selection */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary/60" />
            Select Endpoint
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {API_ENDPOINTS.map((endpoint, i) => (
              <button
                key={endpoint.id}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setResponse(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all duration-300 card-hover ${
                  selectedEndpoint.id === endpoint.id
                    ? "border-primary/40 bg-primary/8 text-primary glow-primary"
                    : "border-border/40 glass hover:border-primary/20 text-foreground"
                }`}
              >
                <div className="font-medium text-sm truncate">{endpoint.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate mt-1">
                  {endpoint.endpoint}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Form */}
        <div className="glass-strong rounded-2xl p-6 mb-8 animate-slide-in border-gradient" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {selectedEndpoint.name}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            {selectedEndpoint.description}
          </p>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder={selectedEndpoint.placeholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="font-mono h-12 bg-background/40 border-border/50 focus:border-primary/50 transition-all duration-300"
                disabled={loading}
              />
            </div>
            <Button type="submit" variant="glow" size="lg" disabled={loading || !searchValue.trim()}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground font-mono px-3 py-2 bg-background/30 rounded-lg inline-block">
            GET {selectedEndpoint.endpoint}?{selectedEndpoint.parameter}=
            <span className="text-primary">{searchValue || "{value}"}</span>
          </div>
        </div>

        {/* Response */}
        {(response || loading) && (
          <div className="glass-strong rounded-2xl p-6 animate-scale-in border-gradient">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Response</h2>
                {response && (
                  response.success ? (
                    <span className="flex items-center gap-1.5 text-success text-sm bg-success/8 px-3 py-1 rounded-full border border-success/20">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-destructive text-sm bg-destructive/8 px-3 py-1 rounded-full border border-destructive/20">
                      <XCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  )
                )}
              </div>
              {response && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" />
                  {new Date(response.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Fetching data...</p>
              </div>
            ) : response ? (
              <JsonDisplay
                data={response.success ? response.data : { error: response.error }}
              />
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPortal;
