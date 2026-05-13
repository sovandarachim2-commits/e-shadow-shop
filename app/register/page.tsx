"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole, MousePointerClick, Phone, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { TelegramAuthButton } from "@/components/telegram-auth-button";
import { useAuthStore } from "@/lib/auth-store";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/site-brand";
import { useToastStore } from "@/lib/toast-store";

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToastStore((state) => state.push);
  const [form, setForm] = useState({ name: "", username: "", phone: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationExpiresAt, setVerificationExpiresAt] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [botConnected, setBotConnected] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [reusedChat, setReusedChat] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [queryString, setQueryString] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [countdownLabel, setCountdownLabel] = useState("");
  const [verificationExpired, setVerificationExpired] = useState(false);

  useEffect(() => {
    setQueryString(window.location.search);

    let cancelled = false;
    fetch("/api/settings/footer")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data.footer?.brandName) setBrandName(data.footer.brandName);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!verificationToken || otpSent) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/auth/register/verification-status?token=${encodeURIComponent(verificationToken)}`);
      const data = await response.json().catch(() => null);
      if (response.ok) {
        const isBotConnected = Boolean(data?.botConnected);
        const isOtpSent = Boolean(data?.otpSent);

        if (isBotConnected) setBotConnected(true);
        if (isOtpSent) {
          setOtpSent(true);
          toast("Telegram bot connected. Check Telegram for your OTP.");
        }
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [otpSent, toast, verificationToken]);

  useEffect(() => {
    if (!verificationExpiresAt) {
      setCountdownLabel("");
      setVerificationExpired(false);
      return;
    }

    function updateCountdown() {
      const remainingMs = new Date(verificationExpiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setCountdownLabel("0:00");
        setVerificationExpired(true);
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setVerificationExpired(false);
      setCountdownLabel(`${minutes}:${String(seconds).padStart(2, "0")}`);
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [verificationExpiresAt]);

  function hasActiveVerification() {
    return Boolean(verificationToken && verificationExpiresAt && !verificationExpired);
  }

  const canResendOtp = !hasActiveVerification();

  async function requestOtp(options?: { openModal?: boolean; silent?: boolean }) {
    if (form.password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }

    if (hasActiveVerification()) {
      if (!options?.silent) {
        if (otpSent) {
          toast("OTP is already sent to Telegram. Please enter it below.");
        } else {
          toast("This verification is already prepared. Open Telegram and press Start for the current OTP request.");
        }
      }
      if (options?.openModal) setShowVerificationModal(true);
      return;
    }

    if (options?.openModal) setShowVerificationModal(true);
    setRequestingOtp(true);
    const response = await fetch("/api/auth/register/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => ({}));
    setRequestingOtp(false);
    if (!response.ok) {
      if (options?.openModal) setShowVerificationModal(false);
      return toast(data.message || "Could not start Telegram verification", "error");
    }

    setVerificationToken(data.verificationToken || "");
    setVerificationExpiresAt(data.expiresAt || "");
    setVerificationExpired(false);
    setTelegramUrl(data.telegramUrl || "");
    setReusedChat(Boolean(data.reusedChat));
    setBotConnected(Boolean(data.reusedChat));
    setOtpSent(Boolean(data.reusedChat));
    setVerificationCode("");
    if (!options?.silent) {
      toast(data.reusedChat ? "OTP sent to your Telegram chat." : "Open Telegram and press Start on the bot to receive your OTP.");
    }
  }

  async function openVerificationModal() {
    if (!formRef.current?.reportValidity()) return;
    if (form.password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    await requestOtp({ openModal: true, silent: true });
  }

  async function submit() {
    if (form.password !== confirmPassword) {
      toast("Passwords do not match", "error");
      return;
    }
    if (!verificationToken) {
      toast("Send OTP to Telegram first", "error");
      return;
    }
    if (!verificationCode.trim()) {
      toast("Enter the OTP from Telegram", "error");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, verificationToken, verificationCode: verificationCode.trim() })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return toast(data.message || "Registration failed", "error");
    setAuth(data.token, data.user);
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    setShowVerificationModal(false);
    router.push(redirect || "/");
  }

  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[linear-gradient(225deg,#2160ff_0%,#1a4cd6_30%,#f6f7fb_30%,#f6f7fb_100%)] py-6 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.42),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_30%)]" />
      <div className="container-page relative grid min-h-[72vh] place-items-center">
        <form ref={formRef} className="w-full max-w-[560px] rounded-[34px] border border-white/70 bg-white px-6 py-10 shadow-[0_30px_90px_rgba(10,37,112,0.18)] md:px-12 md:py-12">
          <div className="text-center">
            <p className="text-4xl font-black leading-[0.9] tracking-[0.04em] text-[#19398a] md:text-6xl">
              {brandName.split(" ").map((part, index) => (
                <span key={`${part}-${index}`} className="block">
                  {part}
                </span>
              ))}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.4em] text-[#4c76ef]">{DEFAULT_BRAND_TAGLINE}</p>
            <p className="mt-8 text-3xl font-black text-[#1a1a1a] md:text-5xl">Create Account</p>
            <p className="mt-3 text-base font-medium text-neutral-500">Create an account to start shopping faster</p>
          </div>

          <div className="mt-12 grid gap-5">
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-[#2e57d0] bg-white px-5 text-[#697b91] shadow-[0_10px_24px_rgba(46,87,208,0.08)]">
              <UserRound size={21} />
              <input required placeholder="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-transparent bg-[#eef2ff] px-5 text-[#697b91]">
              <UserRound size={21} />
              <input required placeholder="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-transparent bg-[#eef2ff] px-5 text-[#697b91]">
              <Phone size={21} />
              <input required placeholder="Phone Number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-transparent bg-[#eef2ff] px-5 text-[#697b91]">
              <LockKeyhole size={21} />
              <input type="password" required placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-transparent bg-[#eef2ff] px-5 text-[#697b91]">
              <LockKeyhole size={21} />
              <input type="password" required placeholder="Confirm Password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
          </div>

          <div className="mt-10 flex justify-center">
            <Button type="button" onClick={openVerificationModal} className="h-14 min-w-[280px] rounded-2xl bg-[#2e4fc3] px-10 text-lg font-black text-white shadow-[0_20px_30px_rgba(46,79,195,0.28)] hover:bg-[#2643a7]">
              SIGN UP
            </Button>
          </div>

          <div className="mt-12">
            <p className="mb-4 flex items-center justify-center gap-2 text-center text-sm font-bold text-[#2e57d0]">
              <MousePointerClick size={18} className="text-[#e9897e]" />
              <span>Or continue with</span>
            </p>
            <div className="grid gap-3">
              <TelegramAuthButton mode="signup" variant="compact" defaultRedirect="/profile" />
              <GoogleAuthButton mode="signup" variant="compact" />
            </div>
          </div>

          <p className="mt-10 border-t border-[#e8ebf8] pt-8 text-center text-base text-neutral-600">
            Already have an account?{" "}
            <Link className="font-black text-[#2e57d0]" href={`/login${queryString}`}>
              Log in
            </Link>
          </p>
        </form>
      </div>

      {showVerificationModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#082b4c]/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[720px] rounded-[30px] border border-[#f3c7b8] bg-white/95 p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-black text-[#082b4c]">Telegram Verification</p>
                <p className="mt-2 text-sm text-[#697b91]">Your phone number is already filled on the register form. Telegram still needs one-time linking before OTP can be sent to the correct chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f3c7b8] text-lg font-black text-[#082b4c] transition hover:bg-[#fff8f3]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#f3c7b8]/70 bg-[#fff8f3] p-5 text-sm text-[#697b91]">
              <p className="font-black text-[#082b4c]">Telegram verification</p>
              <p className="mt-2">1. Click send OTP.</p>
              <p>2. If this phone is not linked to Telegram yet, open the bot and press Start one time.</p>
              <p>3. After Telegram is linked, OTP will be sent to that Telegram chat.</p>
              <p>4. Enter the OTP from Telegram before creating your account.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => requestOtp()}
                  disabled={requestingOtp || (otpSent && !canResendOtp)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#082b4c] px-5 font-black text-white transition hover:bg-[#0d3a64] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={18} />
                  {requestingOtp
                    ? "SENDING..."
                    : otpSent
                      ? canResendOtp
                        ? "RESEND OTP"
                        : `RESEND IN ${countdownLabel || "..."}`
                      : "SEND OTP"}
                </button>
                {telegramUrl ? (
                  <a href={telegramUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-md border border-[#082b4c] px-5 font-black text-[#082b4c] transition hover:bg-white">
                    OPEN TELEGRAM BOT
                  </a>
                ) : null}
              </div>
              <p className={`mt-4 font-bold ${otpSent ? "text-emerald-600" : botConnected ? "text-[#082b4c]" : "text-[#e9897e]"}`}>
                {otpSent
                  ? reusedChat
                    ? "OTP sent automatically to your Telegram chat. Please enter it below."
                    : "OTP sent to Telegram. Please enter it below."
                  : botConnected
                    ? "Bot connected. Waiting for OTP delivery confirmation."
                    : verificationToken
                      ? "Your phone number is filled, but Telegram is not linked yet. Press Start in Telegram one time to link this phone."
                      : "Telegram verification has not started yet."}
              </p>
              {otpSent && countdownLabel ? (
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-center shadow-sm">
                  <p className="text-lg font-black text-emerald-600">OTP has been sent to your Telegram</p>
                  <p className="mt-3 text-sm font-bold text-[#082b4c]">Time Remaining:</p>
                  <p className="mt-2 text-3xl font-black text-[#082b4c]">{countdownLabel}</p>
                </div>
              ) : null}
            </div>

            <label className="mt-5 flex h-16 items-center gap-4 rounded-md bg-[#fff8f3] px-5 text-[#697b91]">
              <LockKeyhole size={21} />
              <input placeholder="Enter OTP" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setShowVerificationModal(false)} className="h-12 rounded-md border-[#082b4c] px-5 font-black text-[#082b4c] hover:bg-[#fff8f3]">
                CLOSE
              </Button>
              <Button type="button" onClick={submit} disabled={loading} className="h-12 rounded-md bg-[#082b4c] px-6 font-black text-white hover:bg-[#0d3a64]">
                {loading ? "SUBMITTING..." : "SUBMIT OTP"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
