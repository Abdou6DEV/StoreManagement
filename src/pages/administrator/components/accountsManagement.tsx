import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Shield, 
  Eye, 
  EyeOff,
  Save,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { Switch } from "../../../lib/components/switch";
import { Modal } from "../../../lib/components/modal";
import { useToast } from "../../../lib/contexts/toastContext";

interface User {
  id: string;
  username: string;
  email?: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canAccessCashier: boolean;
    canAccessStock: boolean;
    canAccessClients: boolean;
    canAccessBills: boolean;
    canAccessHistory: boolean;
    canAccessDashboard: boolean;
    canManageUsers: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
  };
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  permissions: {
    canAccessCashier: boolean;
    canAccessStock: boolean;
    canAccessClients: boolean;
    canAccessBills: boolean;
    canAccessHistory: boolean;
    canAccessDashboard: boolean;
    canManageUsers: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
  };
}

export default function AccountsManagement() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    permissions: {
      canAccessCashier: false,
      canAccessStock: false,
      canAccessClients: false,
      canAccessBills: false,
      canAccessHistory: false,
      canAccessDashboard: false,
      canManageUsers: false,
      canViewLogs: false,
      canManageSettings: false,
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await window.api.auth.getAllUsersWithPermissions();
      if (result.success && result.users) {
        // Backend now handles admin user inclusion, no need to add it manually
        setUsers(result.users.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })));
      }
    } catch (error) {
      console.error("Error loading users:", error);
      showToast(t("admin.accounts.loading", "Failed to load users"), "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      permissions: {
        canAccessCashier: false,
        canAccessStock: false,
        canAccessClients: false,
        canAccessBills: false,
        canAccessHistory: false,
        canAccessDashboard: false,
        canManageUsers: false,
        canViewLogs: false,
        canManageSettings: false,
      },
    });
  };

  const handleAddUser = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    
    // Filter out metadata fields from permissions
    const cleanPermissions = user.permissions ? {
      canAccessCashier: user.permissions.canAccessCashier || false,
      canAccessStock: user.permissions.canAccessStock || false,
      canAccessClients: user.permissions.canAccessClients || false,
      canAccessBills: user.permissions.canAccessBills || false,
      canAccessHistory: user.permissions.canAccessHistory || false,
      canAccessDashboard: user.permissions.canAccessDashboard || false,
      canManageUsers: user.permissions.canManageUsers || false,
      canViewLogs: user.permissions.canViewLogs || false,
      canManageSettings: user.permissions.canManageSettings || false,
    } : {
      canAccessCashier: false,
      canAccessStock: false,
      canAccessClients: false,
      canAccessBills: false,
      canAccessHistory: false,
      canAccessDashboard: false,
      canManageUsers: false,
      canViewLogs: false,
      canManageSettings: false,
    };
    
    setFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      confirmPassword: "",
      permissions: cleanPermissions,
    });
    setShowEditModal(true);
  };

  const handleChangePassword = (user: User) => {
    setPasswordUser(user);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswordModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === "hardcoded-admin") {
      showToast("Cannot delete the admin account", "error");
      return;
    }

    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const result = await window.api.auth.deleteUser(userId);
        if (result.success) {
          showToast(t("admin.accounts.deleteUserSuccess", "User deleted successfully"), "success");
          loadUsers();
        } else {
          showToast(t("admin.accounts.deleteUserError", "Failed to delete user"), "error");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        showToast(t("admin.accounts.deleteUserError", "Failed to delete user"), "error");
      }
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.username.trim()) {
      showToast(t("admin.accounts.usernameRequired", "Username is required"), "error");
      return;
    }

    if (!formData.password.trim()) {
      showToast(t("admin.accounts.passwordRequired", "Password is required"), "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast(t("admin.accounts.passwordMismatch", "Passwords do not match"), "error");
      return;
    }

    if (formData.password.length < 6) {
      showToast(t("admin.accounts.passwordMinLength", "Password must be at least 6 characters"), "error");
      return;
    }

    try {
      const result = await window.api.auth.createUser({
        username: formData.username,
        email: formData.email || undefined,
        password: formData.password,
        role: "USER",
        permissions: formData.permissions,
      });

      if (result.success) {
        showToast("User created successfully", "success");
        setShowAddModal(false);
        resetForm();
        loadUsers();
      } else {
        showToast(result.error || "Failed to create user", "error");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      showToast("Failed to create user", "error");
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    // Validation
    if (!formData.username.trim()) {
      showToast(t("admin.accounts.usernameRequired", "Username is required"), "error");
      return;
    }

    try {
      const result = await window.api.auth.updatePermissions(
        editingUser.id,
        formData.permissions
      );

      if (result.success) {
        showToast("User permissions updated successfully", "success");
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      } else {
        showToast(result.error || "Failed to update user", "error");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      showToast("Failed to update user", "error");
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordUser) return;

    // Validation
    if (!passwordData.newPassword.trim()) {
      showToast("New password is required", "error");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast(t("admin.accounts.passwordMismatch", "Passwords do not match"), "error");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast(t("admin.accounts.passwordMinLength", "Password must be at least 6 characters"), "error");
      return;
    }

    try {
      const result = await window.api.auth.updatePassword(
        passwordUser.id,
        passwordData.newPassword
      );

      if (result.success) {
        showToast("Password updated successfully", "success");
        setShowPasswordModal(false);
        setPasswordUser(null);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        showToast(result.error || "Failed to update password", "error");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      showToast("Failed to update password", "error");
    }
  };

  const togglePermission = (permission: keyof UserFormData["permissions"]) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission],
      },
    }));
  };

  const getPermissionLabel = (permission: keyof UserFormData["permissions"]) => {
    const labels: Record<keyof UserFormData["permissions"], string> = {
      canAccessCashier: t("admin.accounts.permissionLabels.cashier", "Cashier"),
      canAccessStock: t("admin.accounts.permissionLabels.stock", "Stock"),
      canAccessClients: t("admin.accounts.permissionLabels.clients", "Clients"),
      canAccessBills: t("admin.accounts.permissionLabels.bills", "Bills"),
      canAccessHistory: t("admin.accounts.permissionLabels.history", "History"),
      canAccessDashboard: t("admin.accounts.permissionLabels.dashboard", "Dashboard"),
      canManageUsers: "Manage Users",
      canViewLogs: "View Logs",
      canManageSettings: "Manage Settings",
    };
    return labels[permission];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {t("admin.accounts.title", "Accounts Management")}
          </h2>
        </div>
        <Button onClick={handleAddUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.accounts.addUser", "Add User")}
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.username", "Username")}
                </th>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.email", "Email")}
                </th>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.role", "Role")}
                </th>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.status", "Status")}
                </th>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.permissions", "Permissions")}
                </th>
                <th className={`px-6 py-4 text-left text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                  {t("admin.accounts.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                  <td className={`px-6 py-4 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {user.id === "hardcoded-admin" && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}>
                    {user.email || "N/A"}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isRTL ? "text-right" : "text-left"}`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "ADMIN" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.role === "ADMIN" ? t("admin.accounts.admin", "Admin") : t("admin.accounts.user", "User")}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm ${isRTL ? "text-right" : "text-left"}`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {user.isActive ? t("admin.accounts.active", "Active") : t("admin.accounts.inactive", "Inactive")}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions && Object.entries(user.permissions)
                        .filter(([_, value]) => value)
                        .map(([key, _]) => (
                          <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary">
                            {getPermissionLabel(key as keyof UserFormData["permissions"])}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChangePassword(user)}
                        className="flex items-center gap-1"
                      >
                        <Key className="h-3 w-3" />
                        {t("admin.accounts.changePassword", "Password")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        disabled={user.id === "hardcoded-admin"}
                        className="flex items-center gap-1"
                        title={user.id === "hardcoded-admin" ? "Admin account cannot be edited" : ""}
                      >
                        <Edit className="h-3 w-3" />
                        {t("admin.accounts.edit", "Edit")}
                      </Button>
                      {user.id !== "hardcoded-admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("admin.accounts.delete", "Delete")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title={t("admin.accounts.addUser", "Add New User")}
        size="lg"
      >
        <form onSubmit={handleSubmitAdd} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.username", "Username")} *
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.email", "Email")}
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email (optional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.password", "Password")} *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.confirmPassword", "Confirm Password")} *
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-4">
              {t("admin.accounts.permissions", "Permissions")}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                // Define the actual permission fields we want to show for new users
                const permissionFields = [
                  'canAccessCashier',
                  'canAccessStock', 
                  'canAccessClients',
                  'canAccessBills',
                  'canAccessHistory',
                  'canAccessDashboard'
                ];
                
                return permissionFields.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-foreground">
                      {getPermissionLabel(key as keyof UserFormData["permissions"])}
                    </label>
                    <Switch
                      checked={formData.permissions[key as keyof UserFormData["permissions"]] || false}
                      onCheckedChange={() => togglePermission(key as keyof UserFormData["permissions"])}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              {t("admin.accounts.cancel", "Cancel")}
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {t("admin.accounts.add", "Create User")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title={t("admin.accounts.editUser", "Edit User Permissions")}
        size="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.username", "Username")}
              </label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("admin.accounts.email", "Email")}
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-4">
              {t("admin.accounts.permissions", "Permissions")}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                // Define the actual permission fields we want to show
                const permissionFields = [
                  'canAccessCashier',
                  'canAccessStock', 
                  'canAccessClients',
                  'canAccessBills',
                  'canAccessHistory',
                  'canAccessDashboard',
                  'canManageUsers',
                  'canViewLogs',
                  'canManageSettings'
                ];
                
                // Filter based on user role
                const fieldsToShow = editingUser?.role === "USER" 
                  ? permissionFields.filter(field => !['canManageUsers', 'canViewLogs', 'canManageSettings'].includes(field))
                  : permissionFields;
                
                return fieldsToShow.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-foreground">
                      {getPermissionLabel(key as keyof UserFormData["permissions"])}
                    </label>
                    <Switch
                      checked={formData.permissions[key as keyof UserFormData["permissions"]] || false}
                      onCheckedChange={() => togglePermission(key as keyof UserFormData["permissions"])}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              {t("admin.accounts.cancel", "Cancel")}
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {t("admin.accounts.save", "Save Changes")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        title={t("admin.accounts.changePassword", "Change Password")}
        size="md"
      >
        <form onSubmit={handleSubmitPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("admin.accounts.user", "User")}
            </label>
            <Input
              value={passwordUser?.username || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("admin.accounts.newPassword", "New Password")} *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("admin.accounts.confirmPassword", "Confirm New Password")} *
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              {t("admin.accounts.cancel", "Cancel")}
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t("admin.accounts.save", "Update Password")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
