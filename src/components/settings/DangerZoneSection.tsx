import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, AlertTriangle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { isMockMode } from "@/lib/data-source";
import { supabase } from "@/integrations/supabase/client";
import { mockDeleteProfile } from "@/lib/mock-session";
import { useAuthSession, signOut } from "@/hooks/useAuth";
import { deleteMyAccount } from "@/lib/delete-account";
import { toast } from "sonner";
import { SettingsSectionCard } from "./SettingsSectionCard";

/** Danger Zone — permanent account deletion with a type-to-confirm gate. */
export function DangerZoneSection() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const bn = lang === "bn";
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      if (isMockMode()) {
        mockDeleteProfile(user?.id ?? "");
        await signOut();
        toast.success(bn ? "অ্যাকাউন্ট মুছে ফেলা হয়েছে" : "Account deleted");
        navigate({ to: "/" });
        return;
      }
      const result = await deleteMyAccount();
      if (!result.ok) {
        toast.error(result.error);
        setDeletingAccount(false);
        return;
      }
      await signOut();
      toast.success(bn ? "অ্যাকাউন্ট মুছে ফেলা হয়েছে" : "Account deleted");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : bn ? "অ্যাকাউন্ট মুছে ফেলতে ব্যর্থ হয়েছে" : "Failed to delete account");
      setDeletingAccount(false);
    }
  };

  return (
    <SettingsSectionCard
      icon={Trash2}
      title={bn ? "বিপদ অঞ্চল" : "Danger Zone"}
      id="danger"
    >
      <div className="border border-destructive/25 bg-destructive/[0.04] rounded-xl p-5">
        {!showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {bn
                ? "আপনার অ্যাকাউন্ট এবং সম্পর্কিত সব তথ্য স্থায়ীভাবে মুছে ফেলুন। এই কাজটি ফিরিয়ে আনা যাবে না।"
                : "Permanently delete your account and all associated data. This action cannot be undone."}
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-1.5 text-xs font-medium text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors"
            >
              {bn ? "আমার অ্যাকাউন্ট মুছুন" : "Delete my account"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                {bn
                  ? "এটি আপনার প্রোফাইল, বুকমার্ক, ক্রয়, পড়ার অগ্রগতি এবং সম্পর্কিত সব তথ্য স্থায়ীভাবে মুছে ফেলবে। নিশ্চিত করতে"
                  : "This will permanently delete your profile, bookmarks, purchases, reading progress, and all associated data. Type"}{" "}
                <span className="font-mono font-bold text-destructive">DELETE</span>{" "}
                {bn ? "লিখুন।" : "to confirm."}
              </p>
            </div>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={bn ? 'নিশ্চিত করতে "DELETE" লিখুন' : 'Type "DELETE" to confirm'}
              className="w-full border border-destructive/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-destructive/60 focus-visible:ring-1 focus-visible:ring-destructive/40 transition-colors duration-200"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                className="px-4 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deletingAccount
                  ? bn ? "মুছে ফেলা হচ্ছে…" : "Deleting…"
                  : bn ? "স্থায়ীভাবে আমার অ্যাকাউন্ট মুছুন" : "Permanently delete my account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {bn ? "বাতিল" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSectionCard>
  );
}
