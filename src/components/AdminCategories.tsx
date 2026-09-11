import React, { useState } from 'react';
import {
  FolderTree,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  Ticket,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { Category, Ticket as TicketType } from '../types.ts';

interface AdminCategoriesProps {
  categories: Category[];
  tickets: TicketType[];
  onRefresh: () => void;
}

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  tickets,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('server');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');

      setShowAddModal(false);
      setName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error creating category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const ticketCount = tickets.filter((t) => t.category_id === cat.id).length;
    if (ticketCount > 0) {
      alert(`Cannot delete category "${cat.name}". It currently has ${ticketCount} associated tickets.`);
      return;
    }

    if (!confirm(`Are you sure you want to remove the category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
              TAXONOMY
            </span>
            <span className="text-xs text-slate-400">Hosting ticket classifications & routing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Outfit']">
            Support Categories ({categories.length})
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const catTickets = tickets.filter((t) => t.category_id === cat.id);

          return (
            <div
              key={cat.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-lg bg-cyan-950/60 px-2.5 py-1 text-xs font-mono text-cyan-400 border border-cyan-800/60">
                    {cat.slug}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {catTickets.length} tickets
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-['Outfit']">{cat.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>

                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white font-['Outfit']">Add Ticket Category</h2>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dedicated Bare-Metal Servers"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Inquiries related to custom dedicated hardware, IPMI, and remote reboot..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  {loading ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
