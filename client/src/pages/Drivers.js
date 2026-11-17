import React from 'react';
import EntityPage from '../components/EntityPage';
import { driversApi } from '../utils/api';
import { Users } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = { 'Active': 'badge-active', 'Inactive': 'badge-inactive', 'On Load': 'badge-transit' };

export default function Drivers() {
  return (
    <EntityPage
      title="Drivers"
      api={driversApi}
      emptyIcon={<Users size={32} />}
      fields={[
        { key: 'name', label: 'Full Name', placeholder: 'John Smith' },
        { key: 'phone', label: 'Phone', placeholder: '555-000-0000' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'driver@email.com' },
        { key: 'licenseNumber', label: 'CDL Number', placeholder: 'CDL12345' },
        { key: 'licenseExpiry', label: 'CDL Expiry', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'On Load'] },
        { key: 'homeBase', label: 'Home Base', placeholder: 'Chicago, IL' },
        { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'licenseNumber', label: 'CDL #' },
        { key: 'licenseExpiry', label: 'CDL Expiry', render: (v) => v ? format(new Date(v), 'MM/dd/yyyy') : '—' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${STATUS_COLORS[v] || ''}`}>{v}</span> },
        { key: 'homeBase', label: 'Home Base' },
      ]}
    />
  );
}
