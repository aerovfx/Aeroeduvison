"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";

function SocialLoginContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onClick = async (provider: "google") => {
    try {
      setIsLoading(true);
      const result = await signIn(provider, {
        callbackUrl: callbackUrl,
        redirect: true,
      });

      if (result?.error) {
        toast.error(t("auth.login.googleError"));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error(t("auth.login.googleConfigError"));
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="w-full">
        <Button
          size="lg"
          className="w-full gap-2 border border-border bg-card text-foreground hover:bg-muted"
          variant="outline"
          disabled
        >
          <FcGoogle className="h-5 w-5" />
          <span>{t("auth.login.googleContinue")}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button
        size="lg"
        className="w-full gap-2 border border-border bg-card text-foreground hover:bg-muted"
        variant="outline"
        onClick={() => onClick("google")}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
            <span>{t("auth.login.googleConnecting")}</span>
          </>
        ) : (
          <>
            <FcGoogle className="h-5 w-5" />
            <span>{t("auth.login.googleContinue")}</span>
          </>
        )}
      </Button>
    </div>
  );
}

export const SocialLogin = () => {
  return (
    <Suspense
      fallback={
        <div className="w-full">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>
      }
    >
      <SocialLoginContent />
    </Suspense>
  );
};
