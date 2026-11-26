import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mail, Search, Paperclip, FileText, ChevronDown, ChevronUp, Download, Eye } from 'lucide-react';
import { loadsApi } from '../utils/api';
import { format } from 'date-fns';
import PdfViewerModal from '../components/PdfViewerModal';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile;
}

const DOC_TYPES = ['BOL', 'Ratecon', 'Lumper Receipt', 'Detention', 'Other'];

function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

export default function GmailInbox() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [days, setDays] = useState(30);
  const [searching, setSearching] = useState(false);
  const [emails, setEmails] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [selectedType, setSelectedType] = useState({});
  const [selectedLoad, setSelectedLoad] = useState({});
  const [importing, setImporting] = useState(null);
  const [loads, setLoads] = useState([]);
  const [importedKeys, setImportedKeys] = useState(new Set());
  const [viewerDoc, setViewerDoc] = useState(null);

  useEffect(() => {
    loadsApi.getAll().then(r => setLoads(r.data)).catch(() => {});
    // Auto-load recent emails on mount
    doSearch('', 30);
  }, []);

  const doSearch = async (q, d) => {
    setSearching(true);
    try {
      const res = await fetch('/api/gmail/search-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), days: d }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmails(data.emails);
    } catch (err) {
      toast.error(err.message);
      setEmails([]);
    } finally { setSearching(false); }
  };

  const search = () => doSearch(query, days);

  const toggleExpand = (uid) => setExpanded(prev => ({ ...prev, [uid]: !prev[uid] }));

  const importAttachment = async (email, attIdx) => {
    const key = `${email.uid}-${attIdx}`;
    const loadId = selectedLoad[key];
    const docType = selectedType[key] || 'BOL';
    if (!loadId) { toast.error('Select a load to import into'); return; }
    setImporting(key);
    try {
      const res = await fetch(`/api/gmail/import/${loadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: email.uid, attachmentIndex: attIdx, docType, query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Imported as ${docType}!`);
      setImportedKeys(prev => new Set([...prev, key]));
    } catch (err) {
      toast.error(err.message);
    } finally { setImporting(null); }
  };

  const previewAttachment = async (email, attIdx) => {
    const att = email.attachments[attIdx];
    try {
      const res = await fetch('/api/gmail/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: email.uid, attachmentIndex: attIdx, query: query.trim() }),
      });
      if (!res.ok) { toast.error('Could not load preview'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setViewerDoc({ url, filename: att.filename });
    } catch { toast.error('Could not load preview'); }
  };

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title"><span className="accent">Gmail</span> Inbox</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Recent emails with attachments — import directly into any load
        </p>
      </div>

      {/* Search bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: isMobile ? '100%' : 0 }}>
            <label className="form-label">Search</label>
            <div className="search-bar">
              <Search size={15} />
              <input
                className="form-control"
                placeholder="Broker name, load number, keyword..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 130 }}>
            <label className="form-label">Time range</label>
            <select className="form-control" value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={search} disabled={searching}
            style={{ flexShrink: 0, marginBottom: 2, width: isMobile ? '100%' : 'auto' }}>
            {searching ? <div className="spinner" /> : <Search size={15} />}
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {searching && (
        <div className="card empty-state" style={{ padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading emails...</p>
        </div>
      )}

      {/* No results */}
      {!searching && emails?.length === 0 && (
        <div className="card empty-state" style={{ padding: 60 }}>
          <Mail size={36} color="var(--text-muted)" />
          <h3>No emails with attachments found</h3>
          <p>Try expanding the time range or searching a different keyword</p>
        </div>
      )}

      {/* Results */}
      {!searching && emails?.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {emails.length} email{emails.length !== 1 ? 's' : ''} with attachments
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {emails.map(email => (
              <div key={email.uid} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Email header */}
                <div style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onClick={() => toggleExpand(email.uid)}>
                  <Mail size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email.subject}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>{email.from}</span>
                      {email.date && <span>{format(new Date(email.date), 'MMM d, yyyy')}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Paperclip size={11} /> {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {expanded[email.uid]
                    ? <ChevronUp size={16} color="var(--text-muted)" />
                    : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {/* Attachments */}
                {expanded[email.uid] && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {email.attachments.map((att, attIdx) => {
                      const key = `${email.uid}-${attIdx}`;
                      const isImported = importedKeys.has(key);
                      const isImporting = importing === key;
                      return (
                        <div key={attIdx} style={{
                          background: isImported ? 'var(--green-dim)' : 'var(--bg-secondary)',
                          borderRadius: 12, padding: '14px 16px',
                          border: isImported ? '1px solid var(--green-border)' : '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isImported ? 0 : 12 }}>
                            <FileText size={14} color="var(--accent)" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.filename}
                              </div>
                              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{formatSize(att.size)}</div>
                            </div>
                            {isImported && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ Imported</span>}
                            {!isImported && (
                              <button className="btn btn-ghost btn-icon btn-sm" title="Preview"
                                onClick={() => previewAttachment(email, attIdx)}>
                                <Eye size={13} />
                              </button>
                            )}
                          </div>

                          {!isImported && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'center' }}>
                              <select className="form-control" style={{ flex: 2, fontSize: 13 }}
                                value={selectedLoad[key] || ''}
                                onChange={e => setSelectedLoad(prev => ({ ...prev, [key]: e.target.value }))}>
                                <option value="">Select load to import into...</option>
                                {loads.map(l => (
                                  <option key={l._id} value={l._id}>
                                    {l.loadNumber} — {l.broker?.name || 'No broker'}{l.pickup?.city ? ` · ${l.pickup.city}` : ''}
                                  </option>
                                ))}
                              </select>
                              <select className="form-control" style={{ flex: 1, fontSize: 13 }}
                                value={selectedType[key] || 'BOL'}
                                onChange={e => setSelectedType(prev => ({ ...prev, [key]: e.target.value }))}>
                                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                              </select>
                              <button className="btn btn-primary btn-sm"
                                style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}
                                onClick={() => importAttachment(email, attIdx)}
                                disabled={isImporting || !selectedLoad[key]}>
                                {isImporting ? <div className="spinner" /> : <Download size={13} />}
                                {isImporting ? 'Importing...' : 'Import'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* PDF Viewer */}
      {viewerDoc && (
        <PdfViewerModal
          url={viewerDoc.url}
          filename={viewerDoc.filename}
          onClose={() => {
            window.URL.revokeObjectURL(viewerDoc.url);
            setViewerDoc(null);
          }}
        />
      )}
    </div>
  );
}