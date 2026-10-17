import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../../services/api';
import {
  PageHeader, Table, Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';

const TYPE_MAP = {
  bahan: { label: 'Bahan Baku', color: 'blue' },
  produk: { label: 'Produk', color: 'green' },
};

const EMPTY = { name: '', type: 'bahan' };

export default function Categories() {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await categoryService.getAll();
    setData(res.data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setErrors({}); setModal('add'); };
  const openEdit = (row) => { setForm({ ...row }); setErrors({}); setModal(row); };
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
        await categoryService.create(form);
        showToast('Kategori berhasil ditambahkan');
      } else {
        await categoryService.update(modal.id, form);
        showToast('Kategori berhasil diperbarui');
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
    if (!window.confirm(`Hapus kategori "${row.name}"?`)) return;
    await categoryService.delete(row.id);
    showToast('Kategori dihapus', 'error');
    load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'name', label: 'Nama Kategori' },
    { key: 'type', label: 'Tipe', render: (r) => <Badge value={r.type} map={TYPE_MAP} /> },
  ];

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <PageHeader title="Kategori" onAdd={openAdd} />
      <Table columns={columns} data={data} onEdit={openEdit} onDelete={handleDelete} />

      {modal && (
        <Modal title={modal === 'add' ? 'Tambah Kategori' : 'Edit Kategori'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Nama Kategori" error={errors.name?.[0]}>
              <Input value={form.name} onChange={set('name')} required />
            </FormField>
            <FormField label="Tipe">
              <Select value={form.type} onChange={set('type')}>
                <option value="bahan">Bahan Baku</option>
                <option value="produk">Produk</option>
              </Select>
            </FormField>
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
