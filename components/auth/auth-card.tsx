"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AuthHeader } from "@/components/auth/auth-header";
import { SocialLogin } from "@/components/auth/social-login";
import { AuthBackButton } from "@/components/auth/auth-back-button";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onClose,
}: AuthCardProps) => {
  const { t } = useLanguage();

  return (
    <div className="relative w-full max-w-[400px]">
      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("auth.login.closeAria")}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      <Card className="border border-border bg-card/95 shadow-xl backdrop-blur-md dark:bg-card/90">
        <CardHeader className="pb-4 pt-8">
          <AuthHeader label={headerLabel} />
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {showSocial && (
          <CardFooter className="flex flex-col space-y-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.login.orContinue")}
                </span>
              </div>
            </div>
            <SocialLogin />
          </CardFooter>
        )}
        <CardFooter className="pt-0">
          <AuthBackButton label={backButtonLabel} href={backButtonHref} />
        </CardFooter>
      </Card>
    </div>
  );
};
