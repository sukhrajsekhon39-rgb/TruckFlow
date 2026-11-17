import React from 'react';
import EntityPage from '../components/EntityPage';
import { trailersApi } from '../utils/api';
import { Container } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = { 'Active': 'badge-active', 'In Shop': 'badge-pending', 'Out of Service': 'badge-inactive' };

export default function Trailers() {
  return (
    <EntityPage
      title="Trailers"
      api={trailersApi}
      emptyIcon={<Container size={32} />}
      fields={[
        { key: 'unitNumber', label: 'Unit #', placeholder: 'T-201' },
        { key: 'type', label: 'Type', type: 'select', options: ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Lowboy', 'Other'] },
        { key: 'length', label: 'Length (ft)', type: 'number', placeholder: '53' },
        { key: 'year', label: 'Year', type: 'number' },
        { key: 'make', label: 'Make', placeholder: 'Wabash' },
        { key: 'vin', label: 'VIN' },
        { key: 'licensePlate', label: 'License Plate' },
        { key: 'state', label: 'State' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'In Shop', 'Out of Service'] },
        { key: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' },
        { key: 'registrationExpiry', label: 'Registration Expiry', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
      ]}
      columns={[
        { key: 'unitNumber', label: 'Unit #' },
        { key: 'type', label: 'Type' },
        { key: 'length', label: 'Length', render: (v) => v ? `${v} ft` : '—' },
        { key: 'licensePlate', label: 'Plate' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${STATUS_COLORS[v] || ''}`}>{v}</span> },
        { key: 'insuranceExpiry', label: 'Ins. Expiry', render: (v) => v ? format(new Date(v), 'MM/dd/yyyy') : '—' },
        { key: 'registrationExpiry', label: 'Reg. Expiry', render: (v) => v ? format(new Date(v), 'MM/dd/yyyy') : '—' },
      ]}
    />
  );
}
