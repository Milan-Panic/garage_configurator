import { useEffect, useState } from 'react'

// Fotografije završenih objekata iz ocena stvarnih kupaca. Bez izmišljenih slika:
// dok nema nijedne, deo na naslovnoj se ne prikazuje.
export function useGallery() {
  const [items, setItems] = useState(null)
  useEffect(() => {
    let stop = false
    fetch('/api/gallery')
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload) => !stop && setItems(payload.items || []))
      .catch(() => !stop && setItems([]))
    return () => {
      stop = true
    }
  }, [])
  return items
}
