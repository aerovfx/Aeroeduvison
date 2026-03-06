"use client";

import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/card";
import { AuthHeader } from "@/components/auth/auth-header";
import { SocialLogin } from "@/components/auth/social-login";
import { AuthBackButton } from "@/components/auth/auth-back-button";

interface AuthCardProps {
  children: React.ReactNode;
  headerLabel: string;
  backButtonLabel: string;
  backButtonHref: string;
  showSocial?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const AuthCard = ({
  children,
  headerLabel,
  backButtonLabel,
  backButtonHref,
  showSocial = false,
  showCloseButton = false,
  onClose
}: AuthCardProps) => {
  return (
    <div className="relative">
      {showCloseButton && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <Card className="w-[400px] shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <AuthHeader label={headerLabel} />
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
        {showSocial && (
          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <SocialLogin />
          </CardFooter>
        )}
        <CardFooter className="pt-0">
          <AuthBackButton
            label={backButtonLabel}
            href={backButtonHref}
          />
        </CardFooter>
      </Card>
    </div>
  );
};
