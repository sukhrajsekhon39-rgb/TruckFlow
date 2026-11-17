import React from 'react';
import EntityPage from '../components/EntityPage';
import { trucksApi } from '../utils/api';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = { 'Active': 'badge-active', 'In Shop': 'badge-pending', 'Out of Service': 'badge-inactive' };

export default function Trucks() {
  return (
    <EntityPage
      title="Trucks"
      api={trucksApi}
      emptyIcon={<Truck size={32} />}
      fields={[
        { key: 'unitNumber', label: 'Unit #', placeholder: '101' },
        { key: 'year', label: 'Year', type: 'number', placeholder: '2022' },
        { key: 'make', label: 'Make', placeholder: 'Peterbilt' },
        { key: 'model', label: 'Model', placeholder: '389' },
        { key: 'vin', label: 'VIN', placeholder: '1XKWP9EX...' },
        { key: 'licensePlate', label: 'License Plate' },
        { key: 'state', label: 'State', placeholder: 'IL' },
        { key: 'mileage', label: 'Current Mileage', type: 'number' },
        { key: 'nextServiceMiles', label: 'Next Service (miles)', type: 'number' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'In Shop', 'Out of Service'] },
        { key: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' },
        { key: 'registrationExpiry', label: 'Registration Expiry', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
      ]}
      columns={[
        { key: 'unitNumber', label: 'Unit #' },
        { key: 'year', label: 'Year' },
        { key: 'make', label: 'Make' },
        { key: 'model', label: 'Model' },
        { key: 'licensePlate', label: 'Plate' },
        { key: 'mileage', label: 'Mileage', render: (v) => v ? v.toLocaleString() : '—' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${STATUS_COLORS[v] || ''}`}>{v}</span> },
        { key: 'insuranceExpiry', label: 'Ins. Expiry', render: (v) => v ? format(new Date(v), 'MM/dd/yyyy') : '—' },
        { key: 'registrationExpiry', label: 'Reg. Expiry', render: (v) => v ? format(new Date(v), 'MM/dd/yyyy') : '—' },
      ]}
    />
  );
}
