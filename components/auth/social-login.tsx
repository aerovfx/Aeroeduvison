"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";

function SocialLoginContent() {
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
      
      // The redirect happens before we get here in most cases
      if (result?.error) {
        toast.error("Lỗi khi đăng nhập với Google. Vui lòng thử lại.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("Không thể kết nối với Google. Vui lòng kiểm tra cấu hình.");
      setIsLoading(false);
    }
  }

  // Prevent hydration mismatch by only rendering after mount
  if (!isMounted) {
    return (
      <div className="w-full">
        <Button
          size="lg"
          className="w-full gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          variant="outline"
          disabled
        >
          <FcGoogle className="h-5 w-5" />
          <span>Tiếp tục với Google</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button
        size="lg"
        className="w-full gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
        variant="outline"
        onClick={() => onClick("google")}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            <span>Đang kết nối...</span>
          </>
        ) : (
          <>
            <FcGoogle className="h-5 w-5" />
            <span>Tiếp tục với Google</span>
          </>
        )}
      </Button>
    </div>
  );
}

export const SocialLogin = () => {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="w-full h-10 bg-gray-100 animate-pulse rounded"></div>
      </div>
    }>
      <SocialLoginContent />
    </Suspense>
  );
};
