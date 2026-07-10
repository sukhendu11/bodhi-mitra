import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuth";
import { getSiteName } from "@/lib/siteSettings";
import { useLang } from "@/lib/i18n";
import { ErrorPage } from "@/components/error-page";
import { User, Mail, Calendar, BookMarked, MessageSquare, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/profile")({
  loader: () => getSiteName(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Profile — ${loaderData}` },
      { name: "description", content: "Your profile." },
    ],
  }),
  component: ProfilePage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
});

function ProfilePage() {
  const { user } = useAuthSession();
  const { lang } = useLang();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { data: profile, refetch } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const db = supabase as any;
      const { data } = await db
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { display_name: string | null; avatar_url: string | null; created_at: string } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: commentCount } = useQuery({
    queryKey: ["user-comment-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const db = supabase as any;
      const { count } = await db
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    const db = supabase as any;
    await db
      .from("profiles")
      .upsert({ user_id: user.id, display_name: displayName.trim(), updated_at: new Date().toISOString() });
    setEditing(false);
    refetch();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-3">Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to view and edit your profile.</p>
        <Link
          to="/login"
          search={{ message: "Sign in to view your profile", redirect: "/profile" }}
          className="px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-white transition-all duration-200"
          style={{ backgroundColor: "var(--color-saffron)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const initials = (profile?.display_name || user.email || "U").charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long" })
    : "N/A";

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:py-28">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Home
      </Link>

      <div className="mt-8 border border-border/60 p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center text-xl font-medium text-foreground shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={!displayName.trim()}
                    className="px-4 py-1.5 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40">
                    Save
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">{profile?.display_name || "Anonymous"}</h1>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </div>
              </div>
            )}
          </div>
        </div>

        {!editing && (
          <button onClick={() => { setDisplayName(profile?.display_name || ""); setEditing(true); }}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground underline">
            Edit display name
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-border/40 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground/60" />
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-medium">Member since</p>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground font-medium">Comments</p>
              <p className="text-sm">{commentCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
