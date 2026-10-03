'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Shield, Eye, EyeOff, Palette, X } from 'lucide-react';
import AppearanceSettings from '@/components/AppearanceSettings';


export default function BusinessSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.user_metadata?.full_name || '', email: user.email || '' });
      setLoading(false);
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
      if (error) throw error;
      setPasswordForm({ new_password: '', confirm_password: '' });
      setShowPasswordForm(false);
      setPasswordSuccess(true);
      window.setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (e: any) {
      setPasswordMsg({ type: 'error', text: e.message });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppLayout accountType="business" pageTitle="Settings" pageSubtitle="Account preferences and configuration">
      <div className="max-w-4xl space-y-5">
        <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <User size={18} className="text-warning" />
              </div>
              <div>
                <h3 className="font-700 text-foreground">Profile Information</h3>
                <p className="text-xs text-muted-foreground">Update your account details</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Full Name</label>
                  <input value={profile.full_name} readOnly
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg outline-none text-muted-foreground cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Email Address</label>
                  <input value={profile.email} disabled
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg outline-none text-muted-foreground cursor-not-allowed" />
                </div>
              </div>
            )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-700 text-foreground">Security</h3>
                <p className="text-xs text-muted-foreground">Manage your account password</p>
              </div>
            </div>
            {passwordSuccess && <div className="mb-4 text-sm rounded-lg px-3 py-2 bg-success/10 text-success">Password changed successfully.</div>}
            <button type="button" onClick={() => { setPasswordMsg(null); setShowPasswordForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm">
              <Lock size={14} />
              Change Password
            </button>
        </div>

        <AppearanceSettings />
      </div>

      {showPasswordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPasswordForm(false); }}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-700 text-foreground">Change Password</h3>
                <p className="text-xs text-muted-foreground mt-1">Enter and confirm your new password.</p>
              </div>
              <button type="button" onClick={() => setShowPasswordForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">New Password</label>
                <div className="relative">
                  <input autoFocus type={showPwd ? 'text' : 'password'} value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Confirm New Password</label>
                <input type="password" value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              {passwordMsg && <div className={`text-sm rounded-lg px-3 py-2 ${passwordMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{passwordMsg.text}</div>}
              <button type="submit" disabled={savingPassword} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-60">
                <Lock size={14} />
                {savingPassword ? 'Saving...' : 'Save Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
