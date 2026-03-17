import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";
import { changeAdminPassword } from "@/lib/adminAuth";
import { toast } from "sonner";

interface AdminPasswordChangeProps {
  onClose: () => void;
}

const AdminPasswordChange = ({ onClose }: AdminPasswordChangeProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
      setError("All fields are required");
      return;
    }

    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }

    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (current === next) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      const result = await changeAdminPassword(current, next);
      
      if (result.success) {
        toast.success("Password changed successfully!");
        onClose();
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch (err) {
      setError("Failed to change password. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Lock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Change Admin Password</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Update your admin panel access credentials</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Password</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={newPassword.length >= 6 ? "text-success" : ""}>
              {newPassword.length >= 6 ? <Check className="w-3 h-3 inline mr-1" /> : "• "}
              At least 6 characters
            </p>
            <p className={newPassword === confirmPassword && confirmPassword ? "text-success" : ""}>
              {newPassword === confirmPassword && confirmPassword ? <Check className="w-3 h-3 inline mr-1" /> : "• "}
              Passwords match
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPasswordChange;