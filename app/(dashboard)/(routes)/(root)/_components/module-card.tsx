"use client"

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Star, 
  Users, 
  Clock, 
  TrendingUp,
  Sparkles,
  Zap
} from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: "default" | "premium" | "featured" | "new";
  stats?: {
    users?: number;
    completion?: number;
    rating?: number;
    duration?: string;
  };
  features?: string[];
  benefits?: string[];
  useCases?: string;
  isNew?: boolean;
  isPopular?: boolean;
  gradient?: string;
  category?: string;
}

export const ModuleCard = ({
  title,
  description,
  icon: Icon,
  href,
  variant = "default",
  stats,
  features = [],
  benefits = [],
  useCases,
  isNew = false,
  isPopular = false,
  gradient,
  category
}: ModuleCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "premium":
        return {
          card: "bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 border-pink-200 hover:border-pink-300 shadow-lg hover:shadow-pink-200/50",
          icon: "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white shadow-lg",
          badge: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md",
          button: "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
        };
      case "featured":
        return {
          card: "bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-yellow-200 hover:border-yellow-300 shadow-lg hover:shadow-yellow-200/50",
          icon: "bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 text-white shadow-lg",
          badge: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md",
          button: "bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 hover:from-yellow-600 hover:via-orange-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl"
        };
      case "new":
        return {
          card: "bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-purple-200 hover:border-purple-300 shadow-lg hover:shadow-purple-200/50",
          icon: "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white shadow-lg",
          badge: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md",
          button: "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl"
        };
      default:
        return {
          card: "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 hover:border-pink-300 shadow-md hover:shadow-lg",
          icon: "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md",
          badge: "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm",
          button: "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md hover:shadow-lg"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${styles.card} ${gradient || ''}`}>
      {/* Decorative elements - Student style */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100/30 to-rose-100/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-100/30 to-yellow-100/20 rounded-full -ml-12 -mb-12 group-hover:scale-110 transition-transform duration-500"></div>
      
      {/* Student-style pattern overlay */}
      <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-300">
        <div className="absolute top-4 left-4 w-8 h-8 border-2 border-pink-300 rounded-full animate-pulse"></div>
        <div className="absolute top-8 left-12 w-4 h-4 border border-rose-300 rounded-full animate-bounce"></div>
        <div className="absolute bottom-8 right-8 w-6 h-6 border-2 border-orange-300 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-pink-300 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-rose-300 rounded-full animate-bounce"></div>
      </div>
      
      {/* Badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {isNew && (
          <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs animate-pulse shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" />
            ✨ Mới
          </Badge>
        )}
        {isPopular && (
          <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs shadow-lg">
            <TrendingUp className="h-3 w-3 mr-1" />
            🌟 Phổ biến
          </Badge>
        )}
      </div>

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl shadow-lg ${styles.icon} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-8 w-8" />
          </div>
          {category && (
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-xl font-bold mb-3 group-hover:text-gray-800 transition-colors bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        
        <CardDescription className="text-gray-600 leading-relaxed text-sm group-hover:text-gray-700 transition-colors">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            {stats.users && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{stats.users.toLocaleString()} người dùng</span>
              </div>
            )}
            {stats.completion && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4" />
                <span>{stats.completion}% hoàn thành</span>
              </div>
            )}
            {stats.rating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{stats.rating}/5</span>
              </div>
            )}
            {stats.duration && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{stats.duration}</span>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Tính năng nổi bật:</h4>
            <div className="space-y-2">
              {features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="text-xs mt-0.5">•</div>
                  <span className="leading-relaxed">{feature}</span>
                </div>
              ))}
              {features.length > 4 && (
                <div className="text-xs text-gray-500 italic">
                  +{features.length - 4} tính năng khác...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benefits */}
        {benefits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Lợi ích:</h4>
            <div className="space-y-1">
              {benefits.slice(0, 3).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-green-600">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use Cases */}
        {useCases && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Đối tượng sử dụng:</h4>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2 rounded">
              {useCases}
            </p>
          </div>
        )}

        {/* Action Button - Student style */}
        <Link href={href} className="block">
          <Button className={`w-full ${styles.button} group-hover:shadow-lg transition-all duration-300 relative overflow-hidden transform hover:scale-105 active:scale-95`}>
            <span className="relative z-10 font-semibold">🎯 Bắt đầu học</span>
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform relative z-10" />
            <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </Button>
        </Link>
      </CardContent>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </Card>
  );
};
