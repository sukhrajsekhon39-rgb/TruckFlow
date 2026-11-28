import { useEffect } from 'react';

// Sets the browser tab title: "Loads · TruckFlow". Pass nothing to show just "TruckFlow".
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · TruckFlow` : 'TruckFlow';
  }, [title]);
}
