/**
 * ProductPicker — pilih produk via kode, nama auto-isi.
 * Props:
 *   products   : Product[]
 *   value      : product_id (number|string)
 *   onChange   : (product_id, product) => void
 *   error      : string|undefined
 *   disabled   : bool
 */
export default function ProductPicker({ products = [], value, onChange, error, disabled }) {
  const selected = products.find((p) => String(p.id) === String(value));

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        {/* Kode produk — dropdown */}
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Kode</label>
          <select
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const p = products.find((x) => String(x.id) === e.target.value);
              onChange(e.target.value, p ?? null);
            }}
            className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
              error ? 'border-red-400' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">— Kode —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode_produk}
              </option>
            ))}
          </select>
        </div>

        {/* Nama produk — auto-isi, readonly */}
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Nama Produk</label>
          <input
            readOnly
            value={selected?.nama_produk ?? ''}
            placeholder="Pilih kode →"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700"
          />
        </div>
      </div>

      {/* Stok badge jika ada */}
      {selected && (
        <p className="text-xs text-gray-500">
          Stok:{' '}
          <span className={parseFloat(selected.stok) < 10 ? 'text-red-600 font-semibold' : 'text-green-700 font-medium'}>
            {selected.stok} pcs
          </span>
          {' · '}Harga: <span className="text-indigo-700">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selected.harga_jual)}</span>
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
