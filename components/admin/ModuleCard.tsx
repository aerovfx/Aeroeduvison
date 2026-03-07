"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'inactive' | 'maintenance';
  subscription: 'basic' | 'premium' | 'enterprise';
  price: number;
  period: 'month' | 'year';
  usage: number;
  users: number;
  features: string[];
  lastUpdated: string;
  category: string;
  isActive: boolean;
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ModuleCard({
  id,
  name,
  description,
  icon: Icon,
  status,
  subscription,
  price,
  period,
  usage,
  users,
  features,
  lastUpdated,
  category,
  isActive,
  onToggle,
  onEdit,
  onView
}: ModuleCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-100";
      case "inactive": return "text-gray-600 bg-gray-100";
      case "maintenance": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case "premium": return "text-purple-600 bg-purple-100";
      case "enterprise": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`text-xs ${getStatusColor(status)}`}>
                  {status}
                </Badge>
                <Badge className={`text-xs ${getSubscriptionColor(subscription)}`}>
                  {subscription}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggle(id)}
          >
            {isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">{usage}%</span>
          </div>
          <Progress value={usage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Users</span>
              <p className="font-medium">{users.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Price</span>
              <p className="font-medium">${price}/{period}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Key Features:</p>
          <div className="flex flex-wrap gap-1">
            {features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{features.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Category: {category}</span>
          <span>Updated: {lastUpdated}</span>
        </div>
        
        {(onEdit || onView) && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(id)}>
                View Details
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
