import { useState } from 'react';
import { inventoryService } from '../../services/api';
import { Modal, FormField, Input, Select } from '../../components/ui';

export default function StockAdjustmentModal({ onClose, onSuccess, rawMaterials = [], products = [] }) {
  const [form, setForm] = useState({
    item_type: 'raw_material',
    item_id: '',
    quantity: '',
    type: 'increase',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset item_id saat item_type berubah
  const handleTypeChange = (e) => setForm((f) => ({ ...f, item_type: e.target.value, item_id: '' }));

  const items = form.item_type === 'raw_material' ? rawMaterials : products;
  const selectedItem = items.find((i) => String(i.id) === String(form.item_id));
  const kodeField = form.item_type === 'raw_material' ? 'kode_bahan' : 'kode_produk';
  const namaField = form.item_type === 'raw_material' ? 'nama_bahan' : 'nama_produk';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await inventoryService.postAdjustment(form);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        setErrors({ reason: [err.response?.data?.message ?? 'Gagal memproses'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Stock Adjustment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tipe Item" error={errors.item_type?.[0]}>
          <Select value={form.item_type} onChange={handleTypeChange}>
            <option value="raw_material">Bahan Baku</option>
            <option value="product">Produk</option>
          </Select>
        </FormField>

        <FormField label={form.item_type === 'raw_material' ? 'Bahan Baku' : 'Produk'} error={errors.item_id?.[0]}>
          <div className="flex gap-2">
            {/* Dropdown kode — pilih saja, tidak bisa tulis */}
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-1">Kode</label>
              <select
                value={form.item_id}
                onChange={set('item_id')}
                required
                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                  errors.item_id?.[0] ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">— Kode —</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i[kodeField]}</option>
                ))}
              </select>
            </div>
            {/* Nama auto-isi, read-only */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Nama</label>
              <input
                readOnly
                value={selectedItem?.[namaField] ?? ''}
                placeholder="Pilih kode →"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700"
              />
            </div>
          </div>
          {selectedItem && (
            <p className="text-xs text-gray-500 mt-1">
              Stok saat ini: <span className="font-medium text-indigo-700">{selectedItem.stok}</span>
            </p>
          )}
        </FormField>

        <FormField label="Jenis Penyesuaian" error={errors.type?.[0]}>
          <Select value={form.type} onChange={set('type')}>
            <option value="increase">Tambah Stok (Increase)</option>
            <option value="decrease">Kurangi Stok (Decrease)</option>
          </Select>
        </FormField>

        <FormField label="Jumlah" error={errors.quantity?.[0]}>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={set('quantity')}
            required
          />
        </FormField>

        <FormField label="Alasan" error={errors.reason?.[0]}>
          <Input
            value={form.reason}
            onChange={set('reason')}
            placeholder="Mis: Rusak, Selisih stok opname, dsb."
            required
          />
        </FormField>

        <FormField label="Tanggal" error={errors.date?.[0]}>
          <Input type="date" value={form.date} onChange={set('date')} required />
        </FormField>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
