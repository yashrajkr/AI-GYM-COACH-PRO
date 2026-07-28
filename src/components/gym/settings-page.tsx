"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Sun, Moon, Monitor, Volume2, VolumeX, Download, Trash2,
  User, Shield, LogOut, Zap, Loader2, AlertCircle,
} from "lucide-react";
import { TiltCard } from "@/components/ui-pro";
import { useTheme } from "next-themes";
import { useWorkoutStore } from "@/lib/stores/workout";
import { getActivePaymentProvider, isPaymentConfigured } from "@/lib/config/features";
import { toast } from "@/hooks/use-toast";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  // Subscribe to slices individually.
  const coachEnabled = useWorkoutStore((s) => s.coachEnabled);
  const coachPersonality = useWorkoutStore((s) => s.coachPersonality);
  const soundEnabled = useWorkoutStore((s) => s.soundEnabled);
  const history = useWorkoutStore((s) => s.history);
  const setCoachEnabled = useWorkoutStore((s) => s.setCoachEnabled);
  const setCoachPersonality = useWorkoutStore((s) => s.setCoachPersonality);
  const setSoundEnabled = useWorkoutStore((s) => s.setSoundEnabled);
  const clearAll = useWorkoutStore((s) => s.clearAll);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userTier = (session?.user as { tier?: string } | undefined)?.tier || "free";

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: session?.user?.email,
      history,
      settings: { coachEnabled, coachPersonality, soundEnabled, theme },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-coach-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteData = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    // Use the dedicated clearAll action — wipes history/XP/streak/settings atomically.
    clearAll();
    setConfirmDelete(false);
    toast({
      title: "Local data cleared",
      description: "Your browser-stored workouts and progress have been reset.",
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    if (!deletePassword) {
      toast({
        title: "Password required",
        description: "Re-enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/users/me/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirm: "DELETE" }),
      });
      if (res.ok) {
        // Clear local data too — otherwise stale workouts linger on this device.
        clearAll();
        toast({
          title: "Account deleted",
          description: "All your data has been permanently removed.",
        });
        signOut({ callbackUrl: "/" });
      } else if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Incorrect password",
          description: data.error || "Password verification failed.",
          variant: "destructive",
        });
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Cannot delete account",
          description: data.error || "Account is OAuth-linked; contact support.",
          variant: "destructive",
        });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Deletion failed",
          description: data.error || `Server error (${res.status}). Please try again.`,
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Delete failed:", e);
      toast({
        title: "Network error",
        description: "Couldn't reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const themeOptions = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 glass glass-hover rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <h2 className="text-xl font-bold tracking-tight">Settings</h2>
      </div>

      {/* Account */}
      <TiltCard maxTilt={2} glow="lime" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-sm font-mono">{session?.user?.email || "Not signed in"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Name</span>
            <span className="text-sm">{session?.user?.name || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Tier</span>
            <Badge variant="outline" className="text-[10px] h-5 border-lime/40 text-lime capitalize">
              {userTier}
            </Badge>
          </div>
          {session && (
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="outline"
              className="w-full mt-2 text-red-400 hover:text-red-300 hover:border-red-400/40"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          )}
        </div>
      </TiltCard>

      {/* Plan & Billing — graceful fallback when Stripe isn't configured */}
      <TiltCard maxTilt={2} glow="amber" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-amber" />
          <h3 className="text-sm font-semibold">Plan &amp; Billing</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Current plan</span>
            <Badge variant="outline" className="text-[10px] h-5 capitalize border-lime/40 text-lime">
              {userTier}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {userTier === "free" ? (
              <>
                You&apos;re on the <strong className="text-foreground">Free plan</strong> — all core features
                are unlocked. Premium programs and advanced analytics will be available once billing
                is configured.
              </>
            ) : (
              <>
                You&apos;re on the <strong className="text-foreground">{userTier} plan</strong>. Manage your
                subscription via the billing portal.
              </>
            )}
          </p>
          {/* Upgrade button — uses Razorpay if configured, else Stripe, else "Coming Soon".
              Razorpay takes precedence (India-first) when both are configured. */}
          {getActivePaymentProvider() === "razorpay" ? (
            <Button
              onClick={async () => {
                try {
                  // 1. Create Razorpay order
                  const orderRes = await fetch("/api/billing/razorpay/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "pro", annual: false }),
                  });
                  if (!orderRes.ok) throw new Error("Failed to create order");
                  const order = await orderRes.json();

                  // 2. Open Razorpay checkout modal
                  const rzp = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
                  if (!rzp) {
                    toast({ title: "Razorpay SDK not loaded", variant: "destructive" });
                    return;
                  }
                  const options = {
                    key: order.keyId,
                    amount: order.amount,
                    currency: order.currency,
                    order_id: order.orderId,
                    name: "AI Gym Coach Pro",
                    description: "Pro subscription — monthly",
                    handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
                      // 3. Verify payment signature
                      const verifyRes = await fetch("/api/billing/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          orderId: response.razorpay_order_id,
                          paymentId: response.razorpay_payment_id,
                          signature: response.razorpay_signature,
                          tier: "pro",
                          planId: order.planId,
                        }),
                      });
                      if (verifyRes.ok) {
                        toast({ title: "Upgraded to Pro! 🎉", description: "Your subscription is now active." });
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        toast({ title: "Verification failed", variant: "destructive" });
                      }
                    },
                    prefill: { email: session?.user?.email || "" },
                    theme: { color: "#a3e635" },
                  };
                  new rzp(options).open();
                } catch {
                  toast({ title: "Checkout failed", variant: "destructive" });
                }
              }}
              className="w-full bg-lime text-background hover:bg-lime/90"
            >
              Upgrade to Pro (₹999/mo)
            </Button>
          ) : getActivePaymentProvider() === "stripe" ? (
            <Button
              onClick={async () => {
                try {
                  const res = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "pro", annual: false }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch {
                  toast({ title: "Checkout failed", variant: "destructive" });
                }
              }}
              className="w-full bg-lime text-background hover:bg-lime/90"
            >
              Upgrade to Pro ($9.99/mo)
            </Button>
          ) : (
            <div className="w-full text-center py-2.5 px-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              Premium plans — <span className="text-amber font-medium">Coming soon</span>
            </div>
          )}
        </div>
      </TiltCard>

      {/* Appearance */}
      <TiltCard maxTilt={2} glow="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="h-4 w-4 text-cyan" />
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                aria-pressed={theme === opt.value}
                aria-label={`Set theme to ${opt.label}`}
                className={`flex flex-col items-center gap-2 py-3 rounded-lg border transition-all ${
                  theme === opt.value
                    ? "bg-cyan/20 border-cyan/40 text-cyan glow-cyan"
                    : "glass border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <opt.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* Coach Settings */}
      <TiltCard maxTilt={2} glow="lime" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold">Coach Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {coachEnabled ? <Volume2 className="h-4 w-4 text-lime" /> : <VolumeX className="h-4 w-4" />}
              <Label htmlFor="coach-toggle" className="text-sm">Voice Coach</Label>
            </div>
            <Switch id="coach-toggle" checked={coachEnabled} onCheckedChange={setCoachEnabled} />
          </div>

          {coachEnabled && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Personality</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["drill", "zen", "technical"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCoachPersonality(p)}
                    aria-pressed={coachPersonality === p}
                    className={`py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      coachPersonality === p
                        ? "bg-lime/20 text-lime border border-lime/40"
                        : "glass border border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4 text-lime" /> : <VolumeX className="h-4 w-4" />}
              <Label htmlFor="sound-toggle" className="text-sm">Sound Effects</Label>
            </div>
            <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
        </div>
      </TiltCard>

      {/* Data Management */}
      <TiltCard maxTilt={2} glow="magenta" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-magenta" />
          <h3 className="text-sm font-semibold">Data Management</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span>Workout history entries (local)</span>
            <span className="font-mono">{history.length}</span>
          </div>

          <Button
            onClick={handleExportData}
            className="w-full bg-lime text-background hover:bg-lime/90 font-semibold"
            aria-label="Export your workout history as JSON"
          >
            <Download className="mr-2 h-4 w-4" /> Export My Data (JSON)
          </Button>

          <Button
            onClick={handleDeleteData}
            variant="outline"
            className={`w-full transition-colors ${
              confirmDelete
                ? "bg-red-500/20 text-red-400 border-red-400/40 animate-pulse"
                : "text-red-400 hover:text-red-300 hover:border-red-400/40"
            }`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {confirmDelete ? "Click again to confirm — this deletes all local data" : "Delete All Local Data"}
          </Button>

          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            Local data (workouts created offline, settings) is stored in your browser via localStorage.
            Server-side data (your account, synced workouts) is stored in the database and can be
            permanently deleted below. Your video never leaves your device.
          </p>
        </div>
      </TiltCard>

      {/* Danger Zone — Account Deletion (requires password re-auth) */}
      <TiltCard maxTilt={2} glow="magenta" className="p-5 border-red-400/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Permanently delete your account and all associated data (workouts, XP, streaks, achievements).
          This action cannot be undone. Any active Stripe subscription will be cancelled.
          GDPR Article 17 (Right to Erasure) compliant.
        </p>

        {confirmDeleteAccount && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 space-y-3"
          >
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-400/30">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">
                Re-enter your password to confirm. This is the only recovery point —
                after deletion, your data cannot be restored.
              </p>
            </div>
            <Input
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              disabled={deleteLoading}
            />
          </motion.div>
        )}

        <Button
          onClick={handleDeleteAccount}
          disabled={deleteLoading || (confirmDeleteAccount && !deletePassword)}
          variant="outline"
          className={`w-full transition-colors ${
            confirmDeleteAccount
              ? "bg-red-500/20 text-red-400 border-red-400/40"
              : "text-red-400 hover:text-red-300 hover:border-red-400/40"
          }`}
        >
          {deleteLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              {confirmDeleteAccount ? "Permanently delete my account" : "Delete My Account"}
            </>
          )}
        </Button>
        {confirmDeleteAccount && !deleteLoading && (
          <button
            onClick={() => {
              setConfirmDeleteAccount(false);
              setDeletePassword("");
            }}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Cancel
          </button>
        )}
      </TiltCard>
    </div>
  );
}
