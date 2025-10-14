"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_ROLES, PERMISSION_DESCRIPTIONS, MODULE_NAMES, type UserRole, type ModulePermissions, getPermissionBadge } from "@/lib/permissions";
import { Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface PermissionMatrixProps {
  onRoleChange?: (roles: typeof DEFAULT_ROLES) => void;
}

export function PermissionMatrix({ onRoleChange }: PermissionMatrixProps) {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRole, setNewRole] = useState<Partial<UserRole>>({
    id: "",
    name: "",
    description: "",
    color: "bg-gray-100 text-gray-800",
    icon: "👤",
    permissions: {
      users: 'none',
      courses: 'none',
      lessons: 'none',
      quizzes: 'none',
      assignments: 'none',
      progress: 'none',
      payments: 'none',
      videos: 'none',
      learningPath: 'none',
      liveChat: 'none',
      competition: 'none',
      stem: 'none',
      calendar: 'none',
      notes: 'none',
      tasks: 'none',
      scrumboard: 'none',
      contacts: 'none',
      analytics: 'none'
    }
  });

  const updateRole = (roleId: string, updates: Partial<UserRole>) => {
    const updatedRoles = roles.map(role => 
      role.id === roleId ? { ...role, ...updates } : role
    );
    setRoles(updatedRoles);
    onRoleChange?.(updatedRoles);
  };

  const updateRolePermission = (roleId: string, module: keyof ModulePermissions, permission: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    const updatedPermissions = {
      ...role.permissions,
      [module]: permission as any
    };
    
    updateRole(roleId, { permissions: updatedPermissions });
  };

  const createRole = () => {
    if (!newRole.name || !newRole.id) return;
    
    const role: UserRole = {
      id: newRole.id,
      name: newRole.name,
      description: newRole.description || "",
      color: newRole.color || "bg-gray-100 text-gray-800",
      icon: newRole.icon || "👤",
      permissions: newRole.permissions || {
        users: 'none',
        courses: 'none',
        lessons: 'none',
        quizzes: 'none',
        assignments: 'none',
        progress: 'none',
        payments: 'none',
        videos: 'none',
        learningPath: 'none',
        liveChat: 'none',
        competition: 'none',
        stem: 'none',
        calendar: 'none',
        notes: 'none',
        tasks: 'none',
        scrumboard: 'none',
        contacts: 'none',
        analytics: 'none'
      }
    };
    
    const updatedRoles = [...roles, role];
    setRoles(updatedRoles);
    onRoleChange?.(updatedRoles);
    
    setIsCreating(false);
    setNewRole({
      id: "",
      name: "",
      description: "",
      color: "bg-gray-100 text-gray-800",
      icon: "👤",
      permissions: {
        users: 'none',
        courses: 'none',
        lessons: 'none',
        quizzes: 'none',
        assignments: 'none',
        progress: 'none',
        payments: 'none',
        videos: 'none',
        learningPath: 'none',
        liveChat: 'none',
        competition: 'none',
        stem: 'none',
        calendar: 'none',
        notes: 'none',
        tasks: 'none',
        scrumboard: 'none',
        contacts: 'none',
        analytics: 'none'
      }
    });
  };

  const deleteRole = (roleId: string) => {
    const updatedRoles = roles.filter(role => role.id !== roleId);
    setRoles(updatedRoles);
    onRoleChange?.(updatedRoles);
  };

  const coreModules = ['users', 'courses', 'lessons', 'quizzes', 'assignments', 'progress', 'payments'] as const;
  const extendedModules = ['videos', 'learningPath', 'liveChat', 'competition', 'stem', 'calendar', 'notes', 'tasks', 'scrumboard', 'contacts', 'analytics'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ma trận phân quyền</h2>
          <p className="text-muted-foreground">
            Quản lý quyền truy cập của từng vai trò cho các module
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tạo vai trò mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tạo vai trò mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role-id">ID vai trò</Label>
                  <Input
                    id="role-id"
                    placeholder="vd: content-editor"
                    value={newRole.id || ""}
                    onChange={(e) => setNewRole({ ...newRole, id: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role-name">Tên vai trò</Label>
                  <Input
                    id="role-name"
                    placeholder="vd: Content Editor"
                    value={newRole.name || ""}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role-description">Mô tả</Label>
                <Textarea
                  id="role-description"
                  placeholder="Mô tả vai trò và quyền hạn..."
                  value={newRole.description || ""}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Input
                    placeholder="vd: 📝"
                    value={newRole.icon || ""}
                    onChange={(e) => setNewRole({ ...newRole, icon: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Màu sắc</Label>
                  <Select
                    value={newRole.color || ""}
                    onValueChange={(value) => setNewRole({ ...newRole, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn màu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-blue-100 text-blue-800">Xanh dương</SelectItem>
                      <SelectItem value="bg-green-100 text-green-800">Xanh lá</SelectItem>
                      <SelectItem value="bg-yellow-100 text-yellow-800">Vàng</SelectItem>
                      <SelectItem value="bg-red-100 text-red-800">Đỏ</SelectItem>
                      <SelectItem value="bg-purple-100 text-purple-800">Tím</SelectItem>
                      <SelectItem value="bg-gray-100 text-gray-800">Xám</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Hủy
                </Button>
                <Button onClick={createRole}>
                  Tạo vai trò
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permission Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chú giải quyền hạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(PERMISSION_DESCRIPTIONS).map(([level, desc]) => (
              <div key={level} className="flex items-center gap-2 p-2 rounded-lg border">
                <Badge className={getPermissionBadge(level as any).className}>
                  {desc.icon} {desc.label}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core LMS Modules Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Module cốt lõi LMS</CardTitle>
          <CardDescription>
            Các module chính của hệ thống học tập trực tuyến
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Module</th>
                  {roles.map((role) => (
                    <th key={role.id} className="text-center p-3 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${role.color}`}>
                          {role.icon}
                        </span>
                        <span className="text-sm font-medium">{role.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-3 w-[60px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCreating(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coreModules.map((module) => (
                  <tr key={module} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {MODULE_NAMES[module]}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="p-3 text-center">
                        <Select
                          value={role.permissions[module]}
                          onValueChange={(value) => updateRolePermission(role.id, module, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PERMISSION_DESCRIPTIONS).map(([level, desc]) => (
                              <SelectItem key={level} value={level}>
                                <div className="flex items-center gap-2">
                                  <span>{desc.icon}</span>
                                  <span>{desc.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Extended Modules Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Module mở rộng</CardTitle>
          <CardDescription>
            Các tính năng bổ sung và công cụ hỗ trợ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Module</th>
                  {roles.map((role) => (
                    <th key={role.id} className="text-center p-3 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${role.color}`}>
                          {role.icon}
                        </span>
                        <span className="text-sm font-medium">{role.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-3 w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {extendedModules.map((module) => (
                  <tr key={module} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {MODULE_NAMES[module]}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="p-3 text-center">
                        <Select
                          value={role.permissions[module]}
                          onValueChange={(value) => updateRolePermission(role.id, module, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PERMISSION_DESCRIPTIONS).map(([level, desc]) => (
                              <SelectItem key={level} value={level}>
                                <div className="flex items-center gap-2">
                                  <span>{desc.icon}</span>
                                  <span>{desc.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quản lý vai trò</CardTitle>
          <CardDescription>
            Chỉnh sửa thông tin và quyền hạn của từng vai trò
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${role.color}`}>
                        {role.icon}
                      </span>
                      <CardTitle className="text-base">{role.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {role.id !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRole(role.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Quyền hạn chính:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(role.permissions)
                        .filter(([_, level]) => level !== 'none')
                        .slice(0, 4)
                        .map(([module, level]) => (
                          <Badge 
                            key={module} 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {MODULE_NAMES[module as keyof typeof MODULE_NAMES]}
                          </Badge>
                        ))}
                      {Object.entries(role.permissions).filter(([_, level]) => level !== 'none').length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{Object.entries(role.permissions).filter(([_, level]) => level !== 'none').length - 4} khác
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}















