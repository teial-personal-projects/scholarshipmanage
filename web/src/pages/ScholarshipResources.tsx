import { useEffect, useState, useMemo } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

interface ScholarshipResource {
  id: number;
  name: string;
  displayName?: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  requiresAuth?: boolean;
  isFree?: boolean;
  logoUrl?: string;
}

function ScholarshipResources() {
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToastHelpers();
  const [resources, setResources] = useState<ScholarshipResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchResources() {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ScholarshipResource[]>('/resources');
        setResources(data || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load resources';
        setError(msg);
        showError('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) fetchResources();
  }, [user, authLoading, showError]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources.forEach((r) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [resources]);

  const filteredResources = useMemo(() =>
    categoryFilter === 'all' ? resources : resources.filter((r) => r.category === categoryFilter),
    [resources, categoryFilter]);

  if (authLoading || loading) return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-96">
      <div className="spinner w-10 h-10" />
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="font-bold text-red-800 mb-1">Error loading resources</p>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scholarship Resources</h1>
        <p className="text-gray-600 mt-1">Discover trusted websites and organizations to help you find scholarship opportunities</p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`badge text-sm py-1 px-3 cursor-pointer transition-opacity hover:opacity-80 ${categoryFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`badge text-sm py-1 px-3 cursor-pointer transition-opacity hover:opacity-80 ${categoryFilter === cat ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filteredResources.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-sm">
            {categoryFilter === 'all'
              ? 'No resources available at this time.'
              : `No resources found in the "${categoryFilter}" category.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((r) => (
            <div key={r.id} className="card flex flex-col">
              <div className="card-header flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{r.displayName || r.name}</h3>
                  {r.category && <span className="badge badge-blue text-xs mt-1">{r.category}</span>}
                </div>
                {r.logoUrl && (
                  <img src={r.logoUrl} alt={`${r.displayName || r.name} logo`} className="w-12 h-12 object-contain rounded flex-shrink-0" />
                )}
              </div>
              <div className="card-body flex-1 space-y-3">
                {r.description && <p className="text-gray-600 text-sm">{r.description}</p>}

                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <Tag size={12} className="text-gray-400" />
                    {r.tags.map((tag, idx) => (
                      <span key={idx} className="badge badge-gray text-xs">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {r.isFree !== false && <span className="badge badge-green text-xs">Free</span>}
                  {r.requiresAuth && <span className="badge badge-orange text-xs">Account Required</span>}
                </div>

                <a
                  href={r.url.startsWith('http') ? r.url : `https://${r.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand-500 font-medium text-sm hover:underline mt-2"
                >
                  <span>Visit Website</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScholarshipResources;
