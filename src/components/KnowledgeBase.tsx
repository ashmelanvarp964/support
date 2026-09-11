import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Server,
  Zap,
  CreditCard,
  Globe,
  Sliders,
  Shield,
  UserCheck,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  LifeBuoy,
  PlusCircle,
  Eye,
} from 'lucide-react';
import type { KnowledgeArticle } from '../types.ts';

interface KnowledgeBaseProps {
  articles: KnowledgeArticle[];
  onNavigateToTicketCreate: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  articles,
  onNavigateToTicketCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'yes' | 'no'>>({});

  const categories = [
    { id: 'ALL', name: 'All Articles', icon: BookOpen },
    { id: 'Minecraft Hosting', name: 'Minecraft Hosting', icon: Zap },
    { id: 'VPS Hosting', name: 'VPS Hosting', icon: Server },
    { id: 'Billing', name: 'Billing & Payments', icon: CreditCard },
    { id: 'Domains & DNS', name: 'Domains & DNS', icon: Globe },
    { id: 'Pterodactyl Panel', name: 'Pterodactyl Panel', icon: Sliders },
    { id: 'Network & DDoS', name: 'Network & DDoS', icon: Shield },
    { id: 'Account', name: 'Account & Security', icon: UserCheck },
  ];

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchCat = selectedCategory === 'ALL' || art.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

  const handleFeedback = (artId: string, type: 'yes' | 'no') => {
    setFeedbackGiven((prev) => ({ ...prev, [artId]: type }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8">
      {/* Hero Search Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-8 sm:p-12 text-center backdrop-blur-xl shadow-2xl">
        <div className="mx-auto max-w-2xl">
          <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
            LumaCloud Help & Documentation
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Outfit'] mt-3">
            How can we assist your infrastructure today?
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Explore comprehensive guides for Minecraft server management, Linux VPS tuning, DDoS rules, and Pterodactyl.
          </p>

          {/* Large Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-cyan-400" />
            <input
              id="kb-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeArticle) setActiveArticle(null);
              }}
              placeholder="Search guides, JVM flags, SSH keys, billing..."
              className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/90 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 shadow-xl focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      </div>

      {activeArticle ? (
        /* Single Article View */
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-10 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={() => setActiveArticle(null)}
              className="flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Articles</span>
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 border border-slate-700">
                {activeArticle.category}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-slate-500" /> {activeArticle.views} views
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
              {activeArticle.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Last updated {new Date(activeArticle.updated_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed font-sans space-y-4">
            {activeArticle.content.split('\n\n').map((para, i) => {
              if (para.startsWith('### ')) {
                return (
                  <h3 key={i} className="text-base font-bold text-white font-['Outfit'] mt-6 mb-2">
                    {para.replace('### ', '')}
                  </h3>
                );
              }
              if (para.startsWith('```')) {
                return (
                  <pre
                    key={i}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-cyan-300 overflow-x-auto"
                  >
                    <code>{para.replace(/```/g, '')}</code>
                  </pre>
                );
              }
              return <p key={i}>{para}</p>;
            })}
          </div>

          {/* Feedback Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <div>
              <h4 className="text-xs font-bold text-white">Was this guide helpful?</h4>
              <p className="text-[11px] text-slate-400">Your feedback assists our engineering documentation team.</p>
            </div>

            {feedbackGiven[activeArticle.id] ? (
              <span className="text-xs font-semibold text-emerald-400">
                Thank you for your feedback!
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(activeArticle.id, 'yes')}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-300 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => handleFeedback(activeArticle.id, 'no')}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-rose-500 hover:text-rose-300 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5 text-rose-400" />
                  <span>No</span>
                </button>
              </div>
            )}
          </div>

          {/* Still need help callout */}
          <div className="text-center pt-6 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">Still unable to resolve your server issue?</p>
            <button
              onClick={onNavigateToTicketCreate}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Contact LumaCloud Support</span>
            </button>
          </div>
        </div>
      ) : (
        /* Categories and Articles List */
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 pb-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-2xl border border-slate-800 bg-slate-900/30 p-8">
                <BookOpen className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-white">No articles found</h3>
                <p className="text-xs text-slate-400 mt-1">Try another keyword or category filter.</p>
              </div>
            ) : (
              filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setActiveArticle(art)}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all shadow-lg group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-800/60">
                        {art.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Eye className="h-3 w-3" /> {art.views}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {art.content.replace(/### |```/g, '')}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Read Guide</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
