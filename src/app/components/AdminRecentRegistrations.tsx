'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, Edit2, Ban } from 'lucide-react';
import { adminService } from '@/lib/services/vexService';

interface Registration {
  id: string;
  name: string;
  email: string;
  type: 'store' | 'business';
  country: string;
}

export default function AdminRecentRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRow, setActiveRow] = useState<string | null>(null);

  useEffect(() => {
    adminService.getRecentRegistrations(10)
      .then(setRegistrations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = registrations.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-700 text-foreground">Recent Registrations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Latest client accounts added to the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-1.5">
            <Search size={13} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs outline-none w-36 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading accounts...</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Account</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Country</th>
                <th className="px-4 py-2.5 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No accounts found</td>
                </tr>
              ) : filtered.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/50 transition-colors duration-100 cursor-pointer ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5`}
                  onMouseEnter={() => setActiveRow(row.id)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-600 text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-500 text-foreground">{row.type}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-foreground">{row.country}</span></td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center justify-end gap-1 transition-opacity duration-150 ${activeRow === row.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button title="View account" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Eye size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Edit account" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Edit2 size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Suspend account" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Ban size={13} className="text-muted-foreground hover:text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="md:hidden p-3 space-y-3">
            {filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">No accounts found</p>
            ) : filtered.map((row) => (
              <article key={row.id} className="border border-border rounded-xl p-4 bg-muted/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-600 text-foreground break-words">{row.name}</p>
                    <p className="text-xs text-muted-foreground break-all mt-0.5">{row.email}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{row.type}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Country</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{row.country}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Showing {filtered.length} of {registrations.length} accounts</p>
      </div>
    </div>
  );
}