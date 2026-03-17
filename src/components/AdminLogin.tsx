import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { validateAdminPassword, initializeAdminSettings } from "@/lib/adminAuth";

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const AdminLogin = ({ onLogin, onBack }: AdminLoginProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeAdminSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await initializeAdminSettings();
      const isValid = await validateAdminPassword(password.trim());
      
      if (isValid) {
        onLogin();
      } else {
        setError("Invalid admin password.");
      }
    } catch (err) {
      setError("Failed to verify password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern noise-bg relative overflow-hidden">
      {/* Ambient orbs — purple tones for admin */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/4 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground animate-fade-in"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portal
        </Button>

        {/* Logo/Brand */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass border-gradient mb-5 animate-float">
            <ShieldCheck className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Restricted Access
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-strong rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20 animate-scale-in relative overflow-hidden">
          {/* Animated top line */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden rounded-t-2xl">
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-accent/60 to-transparent animate-glow-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" />
                Admin Password
              </label>
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background/50 border-border/60 focus:border-accent/50 transition-all duration-300"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-xl p-4 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="xl"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/85 font-semibold shadow-[0_0_20px_hsl(var(--accent)/0.25)] hover:shadow-[0_0_30px_hsl(var(--accent)/0.4)] transition-all duration-300"
              disabled={loading || !password.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Access Admin Panel
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-8 tracking-wider uppercase animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Administrative access is logged and monitored
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;