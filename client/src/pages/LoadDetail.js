import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadsApi } from '../utils/api';
import { ArrowLeft, FileText, Upload, Trash2, Download, Receipt, CheckCircle, Eye } from 'lucide-react';
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

function StatusBadge({ status }) {
  const map = { 'Pending': 'badge-pending', 'In Transit': 'badge-transit', 'Delivered': 'badge-delivered', 'Invoiced': 'badge-invoiced', 'Paid': 'badge-paid' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', textAlign: 'right', flex: 1 }}>{value}</span>
    </div>
  );
}

// Fetch a protected file (PDF/image) with the login token attached.
async function fetchBlob(url, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('tf-token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) {
    localStorage.removeItem('tf-token');
    localStorage.removeItem('tf-user');
    window.location.href = '/login';
    throw new Error('Session expired — please sign in again');
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.blob();
}

async function blobDownload(url, filename, method = 'GET', body = null) {
  const blob = await fetchBlob(url, method, body);
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(a.href);
}

const DOC_TYPES = ['BOL', 'Ratecon', 'Lumper Receipt', 'Detention', 'Other'];
const DOC_COLORS = {
  'BOL': 'var(--green)',
  'Ratecon': 'var(--blue)',
  'Lumper Receipt': 'var(--yellow)',
  'Detention': 'var(--accent)',
  'Other': 'var(--text-muted)',
};

function DocTypeModal({ file, onConfirm, onCancel }) {
  const [docType, setDocType] = useState('BOL');
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16 }}>What type of document is this?</h2>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            File: <strong style={{ color: 'var(--text-primary)' }}>{file?.name}</strong>
          </p>
          {DOC_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setDocType(type)}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${docType === type ? DOC_COLORS[type] : 'var(--border)'}`,
                background: docType === type ? `${DOC_COLORS[type]}18` : 'var(--bg-card)',
                color: docType === type ? DOC_COLORS[type] : 'var(--text-secondary)',
                fontWeight: docType === type ? 600 : 400,
                fontSize: 14, cursor: 'pointer',
                textAlign: 'left', transition: 'var(--transition)',
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(docType)}>
            Upload as {docType}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null); // { url, filename, docId }
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('companyInfo') || '{}'); }
    catch { return {}; }
  });

  const fetchLoad = async () => {
    const res = await loadsApi.getById(id);
    setLoad(res.data);
  };

  useEffect(() => { fetchLoad().finally(() => setLoading(false)); }, [id]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = '';
  };

  const handleDocTypeConfirm = async (docType) => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', docType);
    formData.append('name', file.name);
    try {
      await loadsApi.uploadDoc(id, formData);
      toast.success(`${docType} uploaded!`);
      fetchLoad();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDocDownload = async (doc) => {
    try {
      await blobDownload(`/api/loads/${id}/documents/${doc._id}/download`, doc.name);
    } catch (e) { toast.error(e.message || 'Could not download document'); }
  };

  const openPreview = async (doc) => {
    try {
      const blob = await fetchBlob(`/api/loads/${id}/documents/${doc._id}/preview`);
      setViewerDoc({ url: URL.createObjectURL(blob), filename: doc.name, docId: doc._id });
    } catch (e) { toast.error(e.message || 'Could not open document'); }
  };

  const closePreview = () => {
    if (viewerDoc?.url?.startsWith('blob:')) URL.revokeObjectURL(viewerDoc.url);
    setViewerDoc(null);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    await loadsApi.deleteDoc(id, docId);
    toast.success('Document deleted');
    fetchLoad();
  };

  const generateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      await blobDownload(`/api/invoices/generate/${id}`, `invoice-${load.loadNumber}.pdf`, 'POST', { companyInfo });
      toast.success('Invoice downloaded!');
      setShowInvoiceModal(false);
      fetchLoad();
    } catch (e) { toast.error(e.message || 'Failed to generate invoice'); }
    finally { setGeneratingInvoice(false); }
  };

  const updateStatus = async (status) => {
    await loadsApi.update(id, { status });
    toast.success(`Status updated to ${status}`);
    fetchLoad();
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!load) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Load not found</div>;

  const pickupFull = [load.pickup?.address, load.pickup?.city, load.pickup?.state, load.pickup?.zip].filter(Boolean).join(', ');
  const deliveryFull = [load.delivery?.address, load.delivery?.city, load.delivery?.state, load.delivery?.zip].filter(Boolean).join(', ');

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/loads')}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="serif" style={{ fontSize: isMobile ? 32 : 44, lineHeight: 1 }}>Load <span style={{ color: 'var(--accent)' }}>{load.loadNumber}</span></h1>
            <StatusBadge status={load.status} />
            {load.invoiceGenerated && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--green)' }}>
                <CheckCircle size={12} /> Invoiced
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Created {format(new Date(load.createdAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <select className="form-control" style={{ width: isMobile ? '100%' : 'auto' }} value={load.status} onChange={e => updateStatus(e.target.value)}>
            {['Pending','In Transit','Delivered','Invoiced','Paid'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" style={isMobile ? { width: '100%', justifyContent: 'center' } : {}} onClick={() => setShowInvoiceModal(true)} disabled={generatingInvoice}>
            <Receipt size={15} />
            {load.invoiceGenerated ? 'Re-generate Invoice' : 'Generate Invoice'}
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* Load Info */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15, color: 'var(--accent)' }}>Load Details</div>
          <InfoRow label="Driver" value={load.driver?.name} />
          <InfoRow label="Truck" value={load.truck ? `${load.truck.unitNumber}${load.truck.make ? ` – ${load.truck.make} ${load.truck.model || ''}` : ''}`.trim() : null} />
          <InfoRow label="Trailer" value={load.trailer ? `${load.trailer.unitNumber}${load.trailer.type ? ` – ${load.trailer.type}` : ''}` : null} />
          <InfoRow label="Broker" value={load.broker?.name} />
          <InfoRow label="Commodity" value={load.commodity} />
          <InfoRow label="Weight" value={load.weight ? `${load.weight.toLocaleString()} lbs` : null} />
          <InfoRow label="Notes" value={load.notes} />
        </div>

        {/* Financials */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15, color: 'var(--green)' }}>Financials</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Rate', value: `$${(load.rate || 0).toLocaleString()}`, color: 'var(--green)', size: 22 },
              { label: 'Rate / Mile', value: `$${(load.ratePerMile || 0).toFixed(2)}`, color: 'var(--blue)', size: 22 },
              { label: 'Miles', value: (load.miles || 0).toLocaleString(), color: 'var(--text-primary)', size: 20 },
              load.invoiceDate ? { label: 'Invoiced', value: format(new Date(load.invoiceDate), 'MM/dd/yyyy'), color: 'var(--text-primary)', size: 14 } : null,
            ].filter(Boolean).map(s => (
              <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: s.size, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Route */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Route</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 0, top: 4, width: 10, height: 10, background: 'var(--green)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', left: 4, top: 14, bottom: -12, width: 2, background: 'var(--border)' }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 2 }}>PICKUP</div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{pickupFull || '—'}</div>
              {load.pickup?.scheduledTime && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{format(new Date(load.pickup.scheduledTime), 'EEE, MMM d · h:mm a')}</div>}
            </div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 0, top: 4, width: 10, height: 10, background: 'var(--accent)', borderRadius: '50%' }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 2 }}>DELIVERY</div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{deliveryFull || '—'}</div>
              {load.delivery?.scheduledTime && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{format(new Date(load.delivery.scheduledTime), 'EEE, MMM d · h:mm a')}</div>}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Documents</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? <div className="spinner" /> : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" disabled={uploading} />
            </label>
            </div>
          </div>
          {!load.documents?.length ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <FileText size={24} />
              <p>No documents yet</p>
            </div>
          ) : load.documents.map(doc => (
            <div key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8 }}>
              <FileText size={16} color={DOC_COLORS[doc.type] || 'var(--text-muted)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 12.5, color: DOC_COLORS[doc.type] || 'var(--text-muted)', fontWeight: 500 }}>{doc.type}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>· {format(new Date(doc.uploadedAt), 'MM/dd/yyyy')}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" title="Preview"
                onClick={() => openPreview(doc)}>
                <Eye size={13} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDocDownload(doc)} title="Download">
                <Download size={13} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteDoc(doc._id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Viewer */}
      {viewerDoc && (
        <PdfViewerModal
          url={viewerDoc.url}
          filename={viewerDoc.filename}
          onClose={closePreview}
          onDownload={() => { handleDocDownload({ _id: viewerDoc.docId, name: viewerDoc.filename }); }}
        />
      )}

      {/* Doc type picker */}
      {pendingFile && <DocTypeModal file={pendingFile} onConfirm={handleDocTypeConfirm} onCancel={() => setPendingFile(null)} />}


      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvoiceModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Generate Invoice</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Company info is saved automatically.</p>
              {[['name','Company Name'],['address','Address'],['phone','Phone'],['email','Email'],['mc','MC Number'],['dot','DOT Number']].map(([key, label]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-control" value={companyInfo[key] || ''} onChange={e => {
                    const updated = { ...companyInfo, [key]: e.target.value };
                    setCompanyInfo(updated);
                    localStorage.setItem('companyInfo', JSON.stringify(updated));
                  }} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={generateInvoice} disabled={generatingInvoice}>
                {generatingInvoice ? <div className="spinner" /> : <Receipt size={15} />}
                Generate & Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}