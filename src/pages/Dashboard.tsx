import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@workos-inc/authkit-react';
import { useAuthWithCache } from '@/auth/useAuthWithCache';
import { Trash } from 'lucide-react';

type PromptItem = {
  id: string;
  name: string;
  contentPreview: string;
};

const Dashboard: React.FC = () => {
  const { user } = useAuthWithCache();
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const token = await getAccessToken();
        const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
        const res = await fetch(`${apiBase}/api/prompts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load prompts');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.prompts ?? [];
        setItems(
          list.map((p: any) => ({
            id: String(p.id),
            name: String(p.name ?? ''),
            contentPreview: '',
          }))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, getAccessToken]);

  return (
    <div className="min-h-screen bg-[#FEF7CD] dark:bg-gray-900 flex flex-col">
      <Header variant="index" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10">
          <h2 className="text-3xl font-black mb-6 text-black dark:text-white">Your Prompts</h2>
          {loading ? (
            <div className="text-gray-600 dark:text-gray-300">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-gray-600 dark:text-gray-300">No prompts yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((p) => (
                <PromptCell key={p.id} id={p.id} name={p.name} onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const PromptCell: React.FC<{ id: string; name: string; onDeleted: (id: string) => void }> = ({ id, name, onDeleted }) => {
  const { getAccessToken } = useAuth();
  const [preview, setPreview] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessToken();
        const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
        const res = await fetch(`${apiBase}/api/prompts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const content = String(data?.content ?? '');
        setPreview(content.slice(0, 200));
      } catch {}
    };
    load();
  }, [id, getAccessToken]);

  return (
    <div className="border-2 border-black rounded-none bg-white dark:bg-gray-800 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-2 border-black bg-white dark:bg-gray-900 p-2 h-32 overflow-hidden font-mono text-xs whitespace-pre-wrap">
        {preview}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="font-bold text-black dark:text-white truncate" title={name || 'Untitled'}>
          {name || 'Untitled'}
        </div>
        <button
          className="p-1 border-2 border-black bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          title="Delete"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            try {
              const token = await getAccessToken();
              const apiBase = import.meta.env.PROD ? 'https://backend.soyrun.workers.dev' : '';
              const res = await fetch(`${apiBase}/api/prompts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error('Failed to delete');
              onDeleted(id);
            } catch {}
            finally { setDeleting(false); }
          }}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;


