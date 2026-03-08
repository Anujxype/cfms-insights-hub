import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateKeyWithDevice, LoginKey } from "@/lib/supabaseDatabase";
import { Shield, Key, AlertCircle, Loader2, Monitor, Smartphone, Lock } from "lucide-react";
import { getDeviceInfo } from "@/lib/deviceFingerprint";

interface LoginFormProps {
  onLogin: (key: LoginKey) => void;
  onAdminClick: () => void;
}

const LoginForm = ({ onLogin, onAdminClick }: LoginFormProps) => {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ count?: number; max?: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDeviceInfo(null);
    setLoading(true);

    const result = await validateKeyWithDevice(key.trim());
    
    if (result.success && result.key) {
      setDeviceInfo({ count: result.deviceCount, max: result.maxDevices });
      onLogin(result.key);
    } else {
      setError(result.error || "Invalid access key. Please try again.");
      if (result.deviceCount && result.maxDevices) {
        setDeviceInfo({ count: result.deviceCount, max: result.maxDevices });
      }
    }
    setLoading(false);
  };

  const currentDevice = getDeviceInfo();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern noise-bg relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-gradient glass animate-pulse-glow mb-5 animate-float">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            CFMS Portal
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Secure Access Gateway
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/20 animate-scale-in border-gradient">
          {/* Animated top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden rounded-t-2xl">
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-glow-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Access Key
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Enter your access key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="font-mono h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:glow-primary transition-all duration-300 pl-4 pr-10"
                  disabled={loading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-xl p-4 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                  {deviceInfo && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Devices registered: {deviceInfo.count}/{deviceInfo.max}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full text-base font-semibold"
              disabled={loading || !key.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Access Portal
                </>
              )}
            </Button>
          </form>

          {/* Device Info */}
          <div className="mt-5 p-3 bg-background/30 rounded-xl border border-border/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {currentDevice.device === 'Mobile' ? (
                <Smartphone className="w-3.5 h-3.5 text-primary/50" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-primary/50" />
              )}
              <span>
                {currentDevice.browser} on {currentDevice.os}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border/30">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-primary transition-colors duration-300"
              onClick={onAdminClick}
            >
              Admin Access
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground/50 text-xs mt-8 tracking-wider uppercase animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Protected by CFMS Security Protocol
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
