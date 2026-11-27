import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile;
}

export default function EntityPage({ title, api, fields, columns, emptyIcon }) {
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => { const res = await api.getAll(); setItems(res.data); };
  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, []);

  const openAdd = () => { setEditing(null); setForm({}); setShowModal(true); };

  // The phone's + menu links here with ?new=1: open the Add form, then tidy the URL
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    openAdd();
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams]);
  const openEdit = (item) => { setEditing(item); setForm(item); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await api.update(editing._id, form); toast.success(`${title.slice(0,-1)} updated!`); }
      else { await api.create(form); toast.success(`${title.slice(0,-1)} added!`); }
      await fetchAll();
      setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${title.slice(0,-1).toLowerCase()}?`)) return;
    await api.delete(id);
    toast.success('Deleted');
    fetchAll();
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 className="section-title"><span className="accent">{title}</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{items.length} {title.toLowerCase()}</p>
        </div>
        <button
          className="btn btn-primary"
          style={isMobile ? { width: '100%', justifyContent: 'center' } : {}}
          onClick={openAdd}
        >
          <Plus size={16} /> Add {title.slice(0,-1)}
        </button>
      </div>

      {/* Mobile: card list */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div className="card empty-state" style={{ padding: 40 }}>
              {emptyIcon}
              <h3>No {title.toLowerCase()} yet</h3>
              <p>Tap "Add {title.slice(0,-1)}" to get started</p>
            </div>
          ) : items.map(item => (
            <div key={item._id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* First two columns as main info */}
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {columns[0].render ? columns[0].render(item[columns[0].key], item) : (item[columns[0].key] || '—')}
                  </div>
                  {columns.slice(1, 3).map(col => (
                    <div key={col.key} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{col.label}: </span>
                      {col.render ? col.render(item[col.key], item) : (item[col.key] || '—')}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 10 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(item._id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {columns.map(c => <th key={c.key}>{c.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={columns.length + 1}>
                    <div className="empty-state">{emptyIcon}<h3>No {title.toLowerCase()} yet</h3><p>Click "Add {title.slice(0,-1)}" to get started</p></div>
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item._id}>
                    {columns.map(c => (
                      <td key={c.key}>{c.render ? c.render(item[c.key], item) : (item[c.key] || '—')}</td>
                    ))}
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(item._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: isMobile ? 16 : 18 }}>{editing ? `Edit ${title.slice(0,-1)}` : `Add ${title.slice(0,-1)}`}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Render fields one per row on mobile, two per row on desktop */}
              {isMobile ? (
                fields.map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    {f.type === 'select' ? (
                      <select className="form-control" value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}>
                        <option value="">Select...</option>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea className="form-control" rows={3} value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                    ) : (
                      <input className="form-control" type={f.type || 'text'} value={form[f.key] || ''} placeholder={f.placeholder} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {fields.map(f => (
                    <div key={f.key} className="form-group" style={f.fullWidth ? { gridColumn: '1/-1' } : {}}>
                      <label className="form-label">{f.label}</label>
                      {f.type === 'select' ? (
                        <select className="form-control" value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}>
                          <option value="">Select...</option>
                          {f.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea className="form-control" rows={3} value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                      ) : (
                        <input className="form-control" type={f.type || 'text'} value={form[f.key] || ''} placeholder={f.placeholder} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <div className="spinner" /> : null}
                {editing ? 'Save' : `Add ${title.slice(0,-1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}