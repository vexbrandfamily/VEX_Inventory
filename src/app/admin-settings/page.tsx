'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Shield, Save, Eye, EyeOff, Palette } from 'lucide-react';
import AppearanceSettings from '@/components/AppearanceSettings';


export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      setProfile({ full_name: user.user_metadata?.full_name || '', email: user.email || '' });
      setLoading(false);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
      if (error) throw error;
      if (user) await supabase.from('user_profiles').update({ full_name: profile.full_name }).eq('id', user.id);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (e: any) {
      setProfileMsg({ type: 'error', text: e.message });
    } finally {
      setSavingProfile(false);
    }
  };

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
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setPasswordForm({ new_password: '', confirm_password: '' });
    } catch (e: any) {
      setPasswordMsg({ type: 'error', text: e.message });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppLayout accountType="admin" pageTitle="Settings" pageSubtitle="Admin account preferences">
      <div className="max-w-4xl space-y-5">
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
          {[{ id: 'profile' as const, label: 'Profile', icon: User }, { id: 'security' as const, label: 'Security', icon: Lock }, { id: 'appearance' as const, label: 'Appearance', icon: Palette }].map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'profile' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-700 text-foreground">Admin Profile</h3>
                <p className="text-xs text-muted-foreground">Update your admin account details</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Full Name</label>
                  <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Email Address</label>
                  <input value={profile.email} disabled
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg outline-none text-muted-foreground cursor-not-allowed" />
                </div>
                {profileMsg && (
                  <div className={`text-sm rounded-lg px-3 py-2 ${profileMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {profileMsg.text}
                  </div>
                )}
                <button type="submit" disabled={savingProfile}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-60">
                  <Save size={14} />
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-700 text-foreground">Change Password</h3>
                <p className="text-xs text-muted-foreground">Update your admin password</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">New Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
              {passwordMsg && (
                <div className={`text-sm rounded-lg px-3 py-2 ${passwordMsg.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {passwordMsg.text}
                </div>
              )}
              <button type="submit" disabled={savingPassword}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-60">
                <Lock size={14} />
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'appearance' && <AppearanceSettings />}
      </div>
    </AppLayout>
  );
}
