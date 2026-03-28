"use client";

import { useState, Suspense, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Brain } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/auth-card";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { getRedirectUrl } from "@/lib/auth-redirect";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcherCompact } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const ERROR_PARAM_TO_KEY: Record<string, string> = {
  CredentialsSignin: "credentials",
  OAuthSignin: "oauthSignin",
  OAuthCallback: "oauthCallback",
  OAuthCreateAccount: "oauthCreate",
  EmailCreateAccount: "emailCreate",
  Callback: "callback",
  InvalidToken: "invalidToken",
  TokenExpired: "tokenExpired",
  UserNotFound: "userNotFound",
  VerificationFailed: "verificationFailed",
  OAuthAccountNotLinked: "oauthNotLinked",
  EmailSignin: "emailSignin",
  SessionRequired: "sessionRequired",
};

function LoginFormContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("auth.login.invalidEmail")),
        password: z.string().min(1, t("auth.login.passwordRequired")),
      }),
    [t]
  );

  type LoginFormData = z.infer<typeof loginSchema>;

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const registered = searchParams.get("registered");
    const verified = searchParams.get("verified");

    if (registered === "true") {
      toast.success(t("auth.login.accountCreated"), {
        description: t("auth.login.checkEmailVerify"),
        duration: 5000,
      });
    }

    if (verified === "true") {
      toast.success(t("auth.login.emailVerified"), {
        description: t("auth.login.canLoginNow"),
        duration: 5000,
      });
    }

    if (error) {
      const suffix = ERROR_PARAM_TO_KEY[error];
      toast.error(
        suffix ? t(`auth.login.err.${suffix}`) : t("auth.login.err.generic")
      );
    }
  }, [error, searchParams, t]);

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error(t("auth.login.invalidCredentials"));
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success(t("auth.login.signedIn"));

        try {
          const response = await fetch("/api/auth/session");
          const session = await response.json();

          if (session?.user?.role) {
            const redirectUrl = getRedirectUrl(session.user.role, callbackUrl);
            router.push(redirectUrl);
          } else {
            router.push(callbackUrl);
          }
        } catch (sessionError) {
          console.error("Error fetching session:", sessionError);
          router.push(callbackUrl);
        }
      } else {
        toast.error(t("auth.login.loginFailed"));
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error(t("auth.login.errorSignIn"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-foreground transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 dark:bg-background/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-foreground" />
            <span className="bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:200%_200%] bg-clip-text text-xl font-bold text-transparent">
              AeroEdu
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcherCompact />
          </div>
        </div>
      </header>

      <div className="flex min-h-screen items-center justify-center px-4 pb-12 pt-24">
        <AuthCard
          headerLabel={t("auth.login.welcomeBack")}
          backButtonLabel={t("auth.login.noAccount")}
          backButtonHref="/auth/signup"
          showSocial={true}
          showCloseButton={true}
          onClose={() => router.push("/")}
        >
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t("auth.login.email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.login.emailPlaceholder")}
                  className="border-border bg-background pl-10"
                  disabled={isLoading}
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t("auth.login.password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.login.passwordPlaceholder")}
                  className="border-border bg-background pl-10 pr-10"
                  disabled={isLoading}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground">
                  {t("auth.login.remember")}
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("auth.login.forgot")}
              </Link>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {t("auth.login.signingIn")}
                </span>
              ) : (
                t("auth.login.submit")
              )}
            </Button>
          </form>
        </AuthCard>
      </div>
    </div>
  );
}

export const LoginForm = () => {
  const { t, language } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="sr-only">{t("auth.login.loading")}</span>
        </div>
      }
    >
      <LoginFormContent key={language} />
    </Suspense>
  );
};
