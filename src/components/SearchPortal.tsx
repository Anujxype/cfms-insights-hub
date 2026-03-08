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

  // Check if key is expiring soon (within 7 days)
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

    // Log to Supabase
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
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">CFMS Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-mono">{userKey.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Expiration Warning Banner */}
        {expirationWarning && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
            expirationWarning.urgent
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-warning/10 border-warning/30 text-warning'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{expirationWarning.message}</p>
              <p className="text-xs opacity-80 mt-0.5">
                {userKey.expires_at && `Expires: ${new Date(userKey.expires_at).toLocaleDateString()} at ${new Date(userKey.expires_at).toLocaleTimeString()}`}
                {expirationWarning.days <= 0 ? ' — Please contact your administrator for renewal.' : ' — Contact admin to extend your subscription.'}
              </p>
            </div>
            <CalendarClock className="w-5 h-5 flex-shrink-0 opacity-60" />
          </div>
        )}

        {/* Session Info */}
        <div className="mb-6 p-4 bg-card/50 border border-border rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">Secure Session Active</p>
              <p className="text-xs text-muted-foreground">
                {deviceInfo.device} • {deviceInfo.os} • {deviceInfo.timezone}
                {userKey.expires_at && ` • Valid until ${new Date(userKey.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Endpoint Selection */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Select Endpoint</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {API_ENDPOINTS.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setResponse(null);
                }}
                className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                  selectedEndpoint.id === endpoint.id
                    ? "border-primary bg-primary/10 text-primary glow-primary"
                    : "border-border bg-card hover:border-primary/50 text-foreground"
                }`}
              >
                <div className="font-medium text-sm truncate">{endpoint.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {endpoint.endpoint}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 animate-slide-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {selectedEndpoint.name}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            {selectedEndpoint.description}
          </p>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder={selectedEndpoint.placeholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="font-mono"
                disabled={loading}
              />
            </div>
            <Button type="submit" variant="glow" disabled={loading || !searchValue.trim()}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground font-mono">
            GET {selectedEndpoint.endpoint}?{selectedEndpoint.parameter}=
            <span className="text-primary">{searchValue || "{value}"}</span>
          </div>
        </div>

        {/* Response */}
        {(response || loading) && (
          <div className="bg-card border border-border rounded-xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Response</h2>
                {response && (
                  response.success ? (
                    <span className="flex items-center gap-1 text-success text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive text-sm">
                      <XCircle className="w-4 h-4" />
                      Error
                    </span>
                  )
                )}
              </div>
              {response && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" />
                  {new Date(response.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
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