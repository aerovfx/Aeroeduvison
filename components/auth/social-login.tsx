"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function SocialLoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const onClick = (provider: "google" | "github") => {
    signIn(provider, {
      callbackUrl: callbackUrl,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => onClick("google")}
        disabled={!process.env.GOOGLE_CLIENT_ID}
      >
        <FcGoogle className="h-5 w-5" />
      </Button>
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => onClick("github")}
        disabled={!process.env.GITHUB_CLIENT_ID}
      >
        <FaGithub className="h-5 w-5" />
      </Button>
    </div>
  );
}

export const SocialLogin = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SocialLoginContent />
    </Suspense>
  );
};
