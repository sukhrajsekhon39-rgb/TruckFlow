import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadsApi, driversApi, trucksApi, trailersApi, brokersApi, milesApi } from '../utils/api';
import { Plus, Search, Filter, Trash2, Eye, MapPin, Navigation, Package, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import AddressAutocomplete from '../components/AddressAutocomplete';

const STATUS_OPTIONS = ['Pending', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];

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

function G({ cols, children, gap = 12, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap }}>
      {children}
    </div>
  );
}

function F({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function LoadModal({ load, onClose, onSaved, drivers, trucks, trailers, brokers }) {
  const isEdit = !!load?._id;
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    status: 'Pending', loadNumber: '',
    driver: '', truck: '', trailer: '', broker: '',
    'pickup.address': '', 'pickup.city': '', 'pickup.state': '', 'pickup.zip': '', 'pickup.scheduledTime': '',
    'delivery.address': '', 'delivery.city': '', 'delivery.state': '', 'delivery.zip': '', 'delivery.scheduledTime': '',
    rate: '', miles: '', commodity: '', weight: '', notes: '',
    ...load,
    driver: load?.driver?._id || load?.driver || '',
    truck: load?.truck?._id || load?.truck || '',
    trailer: load?.trailer?._id || load?.trailer || '',
    broker: load?.broker?._id || load?.broker || '',
    'pickup.address': load?.pickup?.address || '',
    'pickup.city': load?.pickup?.city || '',
    'pickup.state': load?.pickup?.state || '',
    'pickup.zip': load?.pickup?.zip || '',
    'pickup.scheduledTime': load?.pickup?.scheduledTime ? format(new Date(load.pickup.scheduledTime), "yyyy-MM-dd'T'HH:mm") : '',
    'delivery.address': load?.delivery?.address || '',
    'delivery.city': load?.delivery?.city || '',
    'delivery.state': load?.delivery?.state || '',
    'delivery.zip': load?.delivery?.zip || '',
    'delivery.scheduledTime': load?.delivery?.scheduledTime ? format(new Date(load.delivery.scheduledTime), "yyyy-MM-dd'T'HH:mm") : '',
  });
  const [saving, setSaving] = useState(false);
  const [calcMiles, setCalcMiles] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [milesEdited, setMilesEdited] = useState(!!load?.miles);

  const calculateMiles = async (silent = false) => {
    const pickup = { address: form['pickup.address'], city: form['pickup.city'], state: form['pickup.state'], zip: form['pickup.zip'] };
    const delivery = { address: form['delivery.address'], city: form['delivery.city'], state: form['delivery.state'], zip: form['delivery.zip'] };
    const ok = p => (p.city && p.state) || p.zip.length >= 5;
    if (!ok(pickup) || !ok(delivery)) {
      if (!silent) toast.error('Enter city & state (or ZIP) for pickup and delivery');
      return;
    }
    setCalcMiles(true);
    try {
      const res = await milesApi.calculate({ pickup, delivery });
      set('miles', res.data.miles);
      if (!silent) toast.success(`${res.data.miles} miles · ${res.data.hours}h drive${res.data.estimated ? ' (estimate)' : ''}`);
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.error || 'Could not calculate miles');
    } finally { setCalcMiles(false); }
  };

  // Auto-calculate 1.5s after the location fields stop changing
  useEffect(() => {
    if (milesEdited) return;
    const t = setTimeout(() => calculateMiles(true), 1500);
    return () => clearTimeout(t);
  }, [form['pickup.city'], form['pickup.state'], form['pickup.zip'],
      form['delivery.city'], form['delivery.state'], form['delivery.zip']]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        status: form.status, loadNumber: form.loadNumber || undefined,
        driver: form.driver || undefined, truck: form.truck || undefined,
        trailer: form.trailer || undefined, broker: form.broker || undefined,
        rate: parseFloat(form.rate) || 0, miles: parseFloat(form.miles) || 0,
        commodity: form.commodity, weight: parseFloat(form.weight) || undefined, notes: form.notes,
        pickup: { address: form['pickup.address'], city: form['pickup.city'], state: form['pickup.state'], zip: form['pickup.zip'], scheduledTime: form['pickup.scheduledTime'] || undefined },
        delivery: { address: form['delivery.address'], city: form['delivery.city'], state: form['delivery.state'], zip: form['delivery.zip'], scheduledTime: form['delivery.scheduledTime'] || undefined },
      };
      if (isEdit) { await loadsApi.update(load._id, payload); toast.success('Load updated!'); }
      else { await loadsApi.create(payload); toast.success('Load created!'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving load'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 style={{ fontSize: isMobile ? 16 : 18 }}>{isEdit ? `Edit ${load.loadNumber}` : 'Add New Load'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Row 1: Status / Load# / Rate */}
          <G cols="1fr 1fr 1fr" isMobile={isMobile}>
            <F label="Status">
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </F>
            <F label="Load # (auto if blank)">
              <input className="form-control mono" value={form.loadNumber} onChange={e => set('loadNumber', e.target.value)} placeholder="TF-00001" />
            </F>
            <F label="Rate ($)">
              <input type="number" className="form-control" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.00" />
            </F>
          </G>

          {/* Row 2: Driver / Truck / Trailer */}
          <G cols="1fr 1fr 1fr" isMobile={isMobile}>
            <F label="Driver">
              <select className="form-control" value={form.driver} onChange={e => set('driver', e.target.value)}>
                <option value="">Select driver</option>
                {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </F>
            <F label="Truck">
              <select className="form-control" value={form.truck} onChange={e => set('truck', e.target.value)}>
                <option value="">Select truck</option>
                {trucks.map(t => <option key={t._id} value={t._id}>{t.unitNumber}{t.make ? ` – ${t.make}` : ''}</option>)}
              </select>
            </F>
            <F label="Trailer">
              <select className="form-control" value={form.trailer} onChange={e => set('trailer', e.target.value)}>
                <option value="">Select trailer</option>
                {trailers.map(t => <option key={t._id} value={t._id}>{t.unitNumber}{t.type ? ` – ${t.type}` : ''}</option>)}
              </select>
            </F>
          </G>

          {/* Row 3: Broker / Commodity / Weight */}
          <G cols="1fr 1fr 1fr" isMobile={isMobile}>
            <F label="Broker">
              <select className="form-control" value={form.broker} onChange={e => set('broker', e.target.value)}>
                <option value="">Select broker</option>
                {brokers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </F>
            <F label="Commodity">
              <input className="form-control" value={form.commodity} onChange={e => set('commodity', e.target.value)} placeholder="e.g. Auto Parts" />
            </F>
            <F label="Weight (lbs)">
              <input type="number" className="form-control" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="0" />
            </F>
          </G>

          <hr className="divider" style={{ margin: '4px 0' }} />

          {/* Pickup */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MapPin size={14} color="var(--green)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Pickup</span>
            </div>
            <G cols="1fr 1fr" gap={10} isMobile={isMobile}>
              <F label="Address">
                <AddressAutocomplete
                  value={form['pickup.address']}
                  onChange={v => set('pickup.address', v)}
                  onPick={s => setForm(f => ({
                    ...f,
                    ...(s.address ? { 'pickup.address': s.address } : {}),
                    'pickup.city': s.city || f['pickup.city'],
                    'pickup.state': s.state || f['pickup.state'],
                    'pickup.zip': s.zip || f['pickup.zip'],
                  }))}
                />
              </F>
              <F label="Scheduled Time">
                <input type="datetime-local" className="form-control" value={form['pickup.scheduledTime']} onChange={e => set('pickup.scheduledTime', e.target.value)} />
              </F>
            </G>
            <div style={{ marginTop: 10 }}>
              <G cols="1fr 72px 90px" gap={10} isMobile={isMobile}>
                <F label="City">
                  <input className="form-control" value={form['pickup.city']} onChange={e => set('pickup.city', e.target.value)} />
                </F>
                <F label="State">
                  <input className="form-control" value={form['pickup.state']} onChange={e => set('pickup.state', e.target.value)} maxLength={2} />
                </F>
                <F label="ZIP">
                  <input className="form-control" value={form['pickup.zip']} onChange={e => set('pickup.zip', e.target.value)} />
                </F>
              </G>
            </div>
          </div>

          {/* Delivery */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MapPin size={14} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Delivery</span>
            </div>
            <G cols="1fr 1fr" gap={10} isMobile={isMobile}>
              <F label="Address">
                <AddressAutocomplete
                  value={form['delivery.address']}
                  onChange={v => set('delivery.address', v)}
                  onPick={s => setForm(f => ({
                    ...f,
                    ...(s.address ? { 'delivery.address': s.address } : {}),
                    'delivery.city': s.city || f['delivery.city'],
                    'delivery.state': s.state || f['delivery.state'],
                    'delivery.zip': s.zip || f['delivery.zip'],
                  }))}
                />
              </F>
              <F label="Scheduled Time">
                <input type="datetime-local" className="form-control" value={form['delivery.scheduledTime']} onChange={e => set('delivery.scheduledTime', e.target.value)} />
              </F>
            </G>
            <div style={{ marginTop: 10 }}>
              <G cols="1fr 72px 90px" gap={10} isMobile={isMobile}>
                <F label="City">
                  <input className="form-control" value={form['delivery.city']} onChange={e => set('delivery.city', e.target.value)} />
                </F>
                <F label="State">
                  <input className="form-control" value={form['delivery.state']} onChange={e => set('delivery.state', e.target.value)} maxLength={2} />
                </F>
                <F label="ZIP">
                  <input className="form-control" value={form['delivery.zip']} onChange={e => set('delivery.zip', e.target.value)} />
                </F>
              </G>
            </div>
          </div>

          {/* Miles */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
            <F label="Miles">
              <input type="number" className="form-control" value={form.miles} onChange={e => { setMilesEdited(true); set('miles', e.target.value); }} placeholder="0" />
            </F>
            <button className="btn btn-secondary" onClick={() => { setMilesEdited(false); calculateMiles(false); }} disabled={calcMiles} style={{ flexShrink: 0, marginBottom: isMobile ? 0 : 2 }}>
              {calcMiles ? <div className="spinner" /> : <Navigation size={15} />}
              {calcMiles ? 'Calculating...' : 'Auto-calculate Miles'}
            </button>
          </div>

          <F label="Notes">
            <textarea className="form-control" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </F>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <div className="spinner" /> : null}
            {isEdit ? 'Save Changes' : 'Create Load'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Loads() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLoad, setEditLoad] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortField, setSortField] = useState('delivery.scheduledTime');
  const [sortDir, setSortDir] = useState('desc');

  const fetchLoads = useCallback(async () => {
    const res = await loadsApi.getAll(statusFilter ? { status: statusFilter } : {});
    setLoads(res.data);
  }, [statusFilter]);

  useEffect(() => {
    Promise.all([
      fetchLoads(),
      driversApi.getAll().then(r => setDrivers(r.data)),
      trucksApi.getAll().then(r => setTrucks(r.data)),
      trailersApi.getAll().then(r => setTrailers(r.data)),
      brokersApi.getAll().then(r => setBrokers(r.data)),
    ]).finally(() => setLoading(false));
  }, [fetchLoads]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this load?')) return;
    await loadsApi.delete(id);
    toast.success('Load deleted');
    fetchLoads();
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Full client-side search — matches anything
  const q = search.trim().toLowerCase();
  const filtered = loads.filter(l => {
    if (!q) return true;
    const fields = [
      l.loadNumber,
      l.status,
      l.driver?.name,
      l.truck?.unitNumber, l.truck?.make, l.truck?.model,
      l.trailer?.unitNumber, l.trailer?.type,
      l.broker?.name,
      l.commodity,
      l.pickup?.address, l.pickup?.city, l.pickup?.state, l.pickup?.zip,
      l.delivery?.address, l.delivery?.city, l.delivery?.state, l.delivery?.zip,
      l.notes,
      l.rate ? `$${l.rate}` : null,
      l.miles ? `${l.miles}` : null,
      l.ratePerMile ? `${l.ratePerMile}` : null,
      l.weight ? `${l.weight}` : null,
      l.pickup?.scheduledTime ? format(new Date(l.pickup.scheduledTime), 'MM/dd/yyyy') : null,
      l.delivery?.scheduledTime ? format(new Date(l.delivery.scheduledTime), 'MM/dd/yyyy') : null,
    ];
    return fields.some(f => f && f.toString().toLowerCase().includes(q));
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortField === 'delivery.scheduledTime') {
      av = a.delivery?.scheduledTime ? new Date(a.delivery.scheduledTime) : new Date(0);
      bv = b.delivery?.scheduledTime ? new Date(b.delivery.scheduledTime) : new Date(0);
    } else if (sortField === 'pickup.scheduledTime') {
      av = a.pickup?.scheduledTime ? new Date(a.pickup.scheduledTime) : new Date(0);
      bv = b.pickup?.scheduledTime ? new Date(b.pickup.scheduledTime) : new Date(0);
    } else if (sortField === 'rate') {
      av = a.rate || 0; bv = b.rate || 0;
    } else if (sortField === 'miles') {
      av = a.miles || 0; bv = b.miles || 0;
    } else if (sortField === 'ratePerMile') {
      av = a.ratePerMile || 0; bv = b.ratePerMile || 0;
    } else if (sortField === 'status') {
      const order = ['Pending','In Transit','Delivered','Invoiced','Paid'];
      av = order.indexOf(a.status); bv = order.indexOf(b.status);
    } else if (sortField === 'loadNumber') {
      av = a.loadNumber || ''; bv = b.loadNumber || '';
    } else if (sortField === 'broker') {
      av = a.broker?.name || ''; bv = b.broker?.name || '';
    } else if (sortField === 'driver') {
      av = a.driver?.name || ''; bv = b.driver?.name || '';
    } else {
      av = 0; bv = 0;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Sort icon helper
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} color="var(--text-muted)" style={{ marginLeft: 4, opacity: 0.5 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} color="var(--accent)" style={{ marginLeft: 4 }} />
      : <ChevronDown size={12} color="var(--accent)" style={{ marginLeft: 4 }} />;
  };

  const Th = ({ field, children, style }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      onClick={() => handleSort(field)}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}<SortIcon field={field} />
      </span>
    </th>
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 className="section-title"><span className="accent">Loads</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {sorted.length}{sorted.length !== loads.length ? ` of ${loads.length}` : ''} loads
          </p>
        </div>
        <button className="btn btn-primary" style={isMobile ? { width: '100%', justifyContent: 'center' } : {}} onClick={() => { setEditLoad(null); setShowModal(true); }}>
          <Plus size={16} /> Add Load
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
          <Search size={15} />
          <input className="form-control" placeholder="Search by load #, driver, broker, city, status, rate..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="var(--text-muted)" />
          <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile: card list */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.length === 0 ? (
            <div className="card empty-state"><Package size={28} /><h3>No loads found</h3><p>Tap Add Load to get started</p></div>
          ) : sorted.map(load => (
            <div key={load._id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => navigate(`/loads/${load._id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{load.loadNumber}</span>
                <StatusBadge status={load.status} />
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {load.pickup?.city || '—'}{load.pickup?.state ? `, ${load.pickup.state}` : ''}
                <span style={{ color: 'var(--text-muted)' }}> → </span>
                {load.delivery?.city || '—'}{load.delivery?.state ? `, ${load.delivery.state}` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {load.driver?.name || 'No driver'} · {load.miles ? `${load.miles.toLocaleString()} mi` : '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{load.rate ? `$${load.rate.toLocaleString()}` : '—'}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={e => handleDelete(load._id, e)}>
                    <Trash2 size={14} />
                  </button>
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
                  <Th field="loadNumber">Load #</Th>
                  <Th field="status">Status</Th>
                  <Th field="driver">Driver</Th>
                  <th>Truck / Trailer</th>
                  <Th field="pickup.scheduledTime">Pickup</Th>
                  <Th field="delivery.scheduledTime">Delivery</Th>
                  <Th field="miles">Miles</Th>
                  <Th field="rate">Rate</Th>
                  <Th field="ratePerMile">RPM</Th>
                  <Th field="broker">Broker</Th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={11}>
                    <div className="empty-state"><Package size={32} /><h3>No loads found</h3><p>Add your first load to get started</p></div>
                  </td></tr>
                ) : sorted.map(load => (
                  <tr key={load._id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => navigate(`/loads/${load._id}`)}><span className="mono" style={{ color: 'var(--accent)' }}>{load.loadNumber}</span></td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}><StatusBadge status={load.status} /></td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>{load.driver?.name || '—'}</td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>
                      <div style={{ fontSize: 13 }}>{load.truck?.unitNumber || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{load.trailer?.unitNumber || '—'}</div>
                    </td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>
                      <div style={{ fontSize: 13 }}>{load.pickup?.city || '—'}{load.pickup?.state ? `, ${load.pickup.state}` : ''}</div>
                      {load.pickup?.scheduledTime && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(load.pickup.scheduledTime), 'MM/dd HH:mm')}</div>}
                    </td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>
                      <div style={{ fontSize: 13 }}>{load.delivery?.city || '—'}{load.delivery?.state ? `, ${load.delivery.state}` : ''}</div>
                      {load.delivery?.scheduledTime && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(load.delivery.scheduledTime), 'MM/dd HH:mm')}</div>}
                    </td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>{load.miles ? load.miles.toLocaleString() : '—'}</td>
                    <td onClick={() => navigate(`/loads/${load._id}`)} style={{ color: 'var(--green)', fontWeight: 600 }}>{load.rate ? `$${load.rate.toLocaleString()}` : '—'}</td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>{load.ratePerMile ? <span style={{ color: 'var(--blue)' }}>${load.ratePerMile}/mi</span> : '—'}</td>
                    <td onClick={() => navigate(`/loads/${load._id}`)}>{load.broker?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/loads/${load._id}`)}><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { setEditLoad(load); setShowModal(true); e.stopPropagation(); }}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={e => handleDelete(load._id, e)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <LoadModal load={editLoad} drivers={drivers} trucks={trucks} trailers={trailers} brokers={brokers}
          onClose={() => setShowModal(false)} onSaved={fetchLoads} />
      )}
    </div>
  );
}
