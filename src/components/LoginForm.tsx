import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      {/* Animated ambient background orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-[120px]"
        animate={{ y: [0, 15, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-gradient glass animate-pulse-glow mb-5"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Shield className="w-10 h-10 text-primary" />
          </motion.div>
          <motion.h1
            className="text-4xl font-bold gradient-text mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            CFMS Portal
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-sm tracking-wide uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Secure Access Gateway
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/20 border-gradient relative overflow-hidden"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Animated top glow line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px overflow-hidden rounded-t-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-glow-line" />
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
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
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-start gap-3 text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-xl p-4"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <div>
                    <p className="font-medium">{error}</p>
                    {deviceInfo && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        Devices registered: {deviceInfo.count}/{deviceInfo.max}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
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
            </motion.div>
          </form>

          {/* Device Info */}
          <motion.div
            className="mt-5 p-3 bg-background/30 rounded-xl border border-border/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
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
          </motion.div>

          <motion.div
            className="mt-6 pt-5 border-t border-border/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-primary transition-colors duration-300"
              onClick={onAdminClick}
            >
              Admin Access
            </Button>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-muted-foreground/50 text-xs mt-8 tracking-wider uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          Protected by CFMS Security Protocol
        </motion.p>
      </div>
    </div>
  );
};

export default LoginForm;
