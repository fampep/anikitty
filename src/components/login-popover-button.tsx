"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import DiscordIcon from "@/icons/discord";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, LogIn } from "lucide-react";

type FormData = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

function LoginPopoverButton() {
  const auth = useAuthStore();
  const [form, setForm] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const field = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const syncAuth = () => {
    const r = pb.authStore.record!;
    auth.setAuth({
      id: r.id,
      email: r.email,
      username: r.username,
      avatar: r.avatar,
      collectionId: r.collectionId,
      collectionName: r.collectionName,
      autoSkip: r.autoSkip ?? false,
    });
  };

  const loginWithDiscord = async () => {
    setDiscordLoading(true);
    try {
      const res = await pb.collection("users").authWithOAuth2({ provider: "discord" });
      if (pb.authStore.isValid && pb.authStore.record) {
        const discordUsername = res.meta?.username ?? res.meta?.name;
        if (discordUsername) {
          await pb.collection("users").update(pb.authStore.record.id, {
            username: discordUsername,
          });
          // re-fetch so username is fresh
          await pb.collection("users").authRefresh();
        }
        syncAuth();
        toast.success("Logged in with Discord!");
        setOpen(false);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Discord login failed. Make sure Discord OAuth is enabled in PocketBase.");
    } finally {
      setDiscordLoading(false);
    }
  };

  const loginWithEmail = async () => {
    if (!form.username || !form.password) {
      toast.error("Fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await pb.collection("users").authWithPassword(form.username, form.password);
      if (pb.authStore.isValid) {
        syncAuth();
        toast.success("Welcome back!");
        setOpen(false);
      }
    } catch {
      toast.error("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async () => {
    if (!form.username || !form.email || !form.password || !form.confirm_password) {
      toast.error("Fill in all fields");
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await pb.collection("users").create({
        username: form.username,
        email: form.email,
        password: form.password,
        passwordConfirm: form.confirm_password,
      });
      toast.success("Account created! Please log in.");
      setForm({ username: "", email: "", password: "", confirm_password: "" });
      setTab("login");
    } catch (e: any) {
      if (e?.response?.data) {
        Object.entries(e.response.data).forEach(([k, v]: any) =>
          toast.error(`${k}: ${v.message}`),
        );
      } else {
        toast.error("Signup failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-green-700 text-green-300 text-sm font-semibold hover:bg-green-900/40 hover:border-green-500 transition-all">
          <LogIn className="w-4 h-4" />
          Login
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 mt-2 p-0 bg-[#020f04] border border-green-900/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Discord — primary CTA */}
        <div className="p-5 pb-3">
          <p className="text-center text-xs text-green-700 font-mono mb-3 tracking-wider">
            sign in to KittyAnime
          </p>
          <button
            onClick={loginWithDiscord}
            disabled={discordLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {discordLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DiscordIcon className="w-5 h-5" />
            )}
            Continue with Discord
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-1">
          <div className="h-px flex-1 bg-green-900/40" />
          <span className="text-[10px] text-green-800 font-mono">or</span>
          <div className="h-px flex-1 bg-green-900/40" />
        </div>

        {/* Email / password */}
        <div className="p-5 pt-2">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setForm({ username:"", email:"", password:"", confirm_password:"" }); }}>
            <TabsList className="w-full bg-green-950/40 border border-green-900/40 h-8 rounded-lg">
              <TabsTrigger value="login" className="flex-1 text-xs data-[state=active]:bg-green-800 data-[state=active]:text-white rounded-md">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 text-xs data-[state=active]:bg-green-800 data-[state=active]:text-white rounded-md">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="flex flex-col gap-2.5 mt-3">
              <Input
                placeholder="Username or email"
                value={form.username}
                onChange={field("username")}
                onKeyDown={(e) => e.key === "Enter" && loginWithEmail()}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={field("password")}
                onKeyDown={(e) => e.key === "Enter" && loginWithEmail()}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <button
                onClick={loginWithEmail}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Login
              </button>
            </TabsContent>

            <TabsContent value="signup" className="flex flex-col gap-2.5 mt-3">
              <Input
                placeholder="Username"
                value={form.username}
                onChange={field("username")}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={field("email")}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={field("password")}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={form.confirm_password}
                onChange={field("confirm_password")}
                onKeyDown={(e) => e.key === "Enter" && signupWithEmail()}
                className="bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-9 focus:border-green-600 focus:ring-0"
              />
              <button
                onClick={signupWithEmail}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LoginPopoverButton;
