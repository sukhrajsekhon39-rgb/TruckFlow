import React from 'react';
import EntityPage from '../components/EntityPage';
import { brokersApi } from '../utils/api';
import { Building2 } from 'lucide-react';

export default function Brokers() {
  return (
    <EntityPage
      title="Brokers"
      api={brokersApi}
      emptyIcon={<Building2 size={32} />}
      fields={[
        { key: 'name', label: 'Company Name', placeholder: 'Echo Global Logistics' },
        { key: 'contact', label: 'Contact Person', placeholder: 'Jane Doe' },
        { key: 'phone', label: 'Phone', placeholder: '555-000-0000' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'mcNumber', label: 'MC Number', placeholder: 'MC-123456' },
        { key: 'paymentTerms', label: 'Payment Terms (days)', type: 'number', placeholder: '30' },
        { key: 'address', label: 'Address', fullWidth: true },
        { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
      ]}
      columns={[
        { key: 'name', label: 'Company' },
        { key: 'contact', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'mcNumber', label: 'MC #' },
        { key: 'paymentTerms', label: 'Payment Terms', render: (v) => v ? `Net ${v}` : 'Net 30' },
      ]}
    />
  );
}
