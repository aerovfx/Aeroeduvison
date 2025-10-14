"use client";

import { useState } from "react";
import { SignInForm } from "@/components/home/signin-form-fixed";
import { CommunityWelcome } from "@/components/home/community-welcome";
import { AuthMethodSelector } from "@/components/home/auth-method-selector";

export const HomePage = () => {
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<"jwt" | "firebase" | "aws">("jwt");

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Sign-in Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h1>
            <p className="text-gray-600">
              Don't have an account?{" "}
              <a href="/auth/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up
              </a>
            </p>
          </div>

          {/* Auth Method Selector */}
          <AuthMethodSelector 
            selectedMethod={selectedAuthMethod}
            onMethodChange={setSelectedAuthMethod}
          />

          {/* Sign-in Form */}
          <SignInForm authMethod={selectedAuthMethod} />
        </div>
      </div>

      {/* Right Column - Community Welcome */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <CommunityWelcome />
      </div>
    </div>
  );
};
