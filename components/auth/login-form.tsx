"use client";

import { useState, useTransition, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/auth-card";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { getRedirectUrl } from "@/lib/auth-redirect";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof LoginSchema>;

function LoginFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Show messages from URL params
  useEffect(() => {
    const registered = searchParams.get('registered');
    const verified = searchParams.get('verified');

    if (registered === 'true') {
      toast.success('Account created!', {
        description: 'Please check your email to verify your account.',
        duration: 5000
      });
    }

    if (verified === 'true') {
      toast.success('Email verified!', {
        description: 'You can now login to your account.',
        duration: 5000
      });
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        'CredentialsSignin': 'Invalid email or password',
        'OAuthSignin': 'Error occurred during OAuth sign in',
        'OAuthCallback': 'Error occurred during OAuth callback',
        'OAuthCreateAccount': 'Could not create OAuth account',
        'EmailCreateAccount': 'Could not create email account',
        'Callback': 'Error occurred during callback',
        'InvalidToken': 'Invalid verification token',
        'TokenExpired': 'Verification token has expired. Please request a new one.',
        'UserNotFound': 'User not found',
        'VerificationFailed': 'Email verification failed. Please try again.',
        'OAuthAccountNotLinked': 'Email already exists with different provider',
        'EmailSignin': 'Check your email for the sign in link',
        'SessionRequired': 'Please sign in to access this page'
      };
      
      toast.error(errorMessages[error] || 'An error occurred during sign in');
    }
  }, [error, searchParams]);

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    
    try {
      // Use redirect: false to handle redirect manually
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      console.log('Login result:', result);
      
      if (result?.error) {
        toast.error("Invalid email or password");
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success("Signed in successfully!");
        
        // Get the user's role from the session to determine redirect
        // We'll fetch this from the API since we can't access session immediately
        try {
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          
          if (session?.user?.role) {
            const redirectUrl = getRedirectUrl(session.user.role, callbackUrl);
            router.push(redirectUrl);
          } else {
            // Fallback to callbackUrl or dashboard
            router.push(callbackUrl);
          }
        } catch (sessionError) {
          console.error('Error fetching session:', sessionError);
          // Fallback to callbackUrl or dashboard
          router.push(callbackUrl);
        }
      } else {
        console.log('Login failed - result:', result);
        toast.error("Login failed. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("An error occurred during sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <AuthCard
        headerLabel="Welcome back"
        backButtonLabel="Don't have an account?"
        backButtonHref="/auth/signup"
        showSocial={true}
        showCloseButton={true}
        onClose={() => window.location.href = "/"}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="mail@example.com"
                className="pl-10"
                disabled={isLoading || isPending}
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="******"
                className="pl-10 pr-10"
                disabled={isLoading || isPending}
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <Link 
                href="/auth/forgot-password" 
                className="font-medium text-amber-600 hover:text-amber-500"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading || isPending}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isLoading || isPending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}

export const LoginForm = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
};
