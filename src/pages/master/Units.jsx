import { useState, useEffect, useCallback } from 'react';
import { unitService } from '../../services/api';
import { PageHeader, Table, Modal, FormField, Input, Select, Toast } from '../../components/ui';

const EMPTY = { name: '', symbol: '', category: 'weight' };

export default function Units() {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await unitService.getAll();
    setData(res.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setErrors({}); setModal('add'); };
  const openEdit = (row) => {
    setForm({
      name: row.name,
      symbol: row.symbol ?? '',
      category: row.category ?? 'weight',
    });
    setErrors({});
    setModal(row);
  };
  const closeModal = () => setModal(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modal === 'add') {
        await unitService.create(form);
        showToast('Satuan berhasil ditambahkan');
      } else {
        await unitService.update(modal.id, form);
        showToast('Satuan berhasil diperbarui');
      }
      closeModal();
      load();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus satuan "${row.name}"?`)) return;
    try {
      await unitService.delete(row.id);
      showToast('Satuan dihapus', 'error');
      load();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal menghapus satuan', 'error');
    }
  };

  const formatMultiplier = (val) => {
    const num = parseFloat(val);
    if (num < 1 && num > 0) {
      return num.toFixed(6).replace(/\.?0+$/, '');
    }
    return Number(num).toLocaleString('id-ID');
  };

  const columns = [
    { key: 'name', label: 'Nama Satuan' },
    { key: 'symbol', label: 'Simbol', render: (r) => <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{r.symbol || '-'}</span> },
    {
      key: 'category',
      label: 'Kategori',
      render: (r) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          r.category === 'weight' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {r.category === 'weight' ? 'Berat (Massa)' : 'Jumlah (Hitungan)'}
        </span>
      ),
    },
    {
      key: 'conversions',
      label: 'Aturan Konversi',
      render: (r) => {
        if (!r.conversions_from || r.conversions_from.length === 0) {
          return <span className="text-gray-400 text-xs italic">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 text-xs">
            {r.conversions_from.map((c) => (
              <span key={c.id} className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                1 {r.symbol} = {formatMultiplier(c.multiplier)} {c.to_unit?.symbol}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Satuan & Konversi" onAdd={openAdd} />
      <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Satuan' : 'Edit Satuan'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Nama Satuan" error={errors.name?.[0]}>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Kilogram"
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Simbol / Kode" error={errors.symbol?.[0]}>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="Contoh: kg, g, pcs"
                  required
                />
              </FormField>
              <FormField label="Kategori" error={errors.category?.[0]}>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="weight">Berat (Massa)</option>
                  <option value="count">Jumlah (Hitungan)</option>
                </Select>
              </FormField>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Batal</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
