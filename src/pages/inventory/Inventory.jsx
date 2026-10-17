import { useState, useEffect, useCallback } from 'react';
import { inventoryService, rawMaterialService, productService } from '../../services/api';
import {
  PageHeader, SearchInput, Table, Pagination,
  Modal, FormField, Input, Select, Badge, Toast,
} from '../../components/ui';
import StockAdjustmentModal from './StockAdjustmentModal';

const STATUS_MAP = {
  aktif: { label: 'Aktif', color: 'green' },
  nonaktif: { label: 'Nonaktif', color: 'red' },
};

const EMPTY = {
  kode_bahan: '', nama_bahan: '', category_id: '', unit_id: '',
  harga_beli: '', stok: '', stok_minimum: '',
  tanggal_kedaluwarsa: '', supplier_id: '', status: 'aktif',
};

const IDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('raw-materials');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [rawMeta, setRawMeta] = useState(null);
  const [products, setProducts] = useState([]);
  const [productMeta, setProductMeta] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stockCard, setStockCard] = useState([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);

  // Semua item untuk dropdown modal adjustment (tanpa paginasi)
  const [allRawMaterials, setAllRawMaterials] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  useEffect(() => {
    rawMaterialService.getAll(1, '').then((r) => setAllRawMaterials(r.data.data.data ?? []));
    productService.getAll(1, '').then((r) => setAllProducts(r.data.data.data ?? []));
    // Load low-stock & expiring saat mount untuk badge count
    inventoryService.getLowStock().then((r) => setLowStock(r.data.data ?? []));
    inventoryService.getExpiring(30).then((r) => setExpiring(r.data.data ?? []));
  }, []);

  const loadRawMaterials = useCallback(async () => {
    const res = await rawMaterialService.getAll(page, search);
    setRawMaterials(res.data.data.data);
    setRawMeta(res.data.data);
  }, [page, search]);

  const loadProducts = useCallback(async () => {
    const res = await productService.getAll(page, search);
    setProducts(res.data.data.data);
    setProductMeta(res.data.data);
  }, [page, search]);

  const loadLowStock = useCallback(async () => {
    const res = await inventoryService.getLowStock();
    setLowStock(res.data.data);
  }, []);

  const loadExpiring = useCallback(async () => {
    const res = await inventoryService.getExpiring();
    setExpiring(res.data.data);
  }, []);

  const loadTransactions = useCallback(async () => {
    const res = await inventoryService.getTransactions();
    setTransactions(res.data.data.data);
  }, []);

  const loadStockCard = useCallback(async () => {
    const res = await inventoryService.getStockCard();
    setStockCard(res.data.data.data);
  }, []);

  useEffect(() => {
    if (activeTab === 'raw-materials') {
      loadRawMaterials();
    } else if (activeTab === 'products') {
      loadProducts();
    } else if (activeTab === 'low-stock') {
      loadLowStock();
    } else if (activeTab === 'expiring') {
      loadExpiring();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'stock-card') {
      loadStockCard();
    }
  }, [activeTab, loadRawMaterials, loadProducts, loadLowStock, loadExpiring, loadTransactions, loadStockCard]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdjustment = async (data) => {
    setLoading(true);
    try {
      await inventoryService.postAdjustment(data);
      showToast('Penyesuaian stok berhasil');
      if (activeTab === 'transactions') loadTransactions();
      if (activeTab === 'stock-card') loadStockCard();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'raw-materials':
        return (
          <div>
            <div className="mb-4">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari bahan baku..." />
            </div>
            <Table
              columns={[
                { key: 'kode_bahan', label: 'Kode' },
                { key: 'nama_bahan', label: 'Nama Bahan' },
                { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
                { key: 'unit', label: 'Satuan', render: (r) => r.unit?.name ?? '-' },
                { key: 'stok', label: 'Stok', render: (r) => `${r.stok} ${r.unit?.name ?? ''}` },
                { key: 'harga_beli', label: 'Harga Beli', render: (r) => IDR(r.harga_beli) },
                { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} map={STATUS_MAP} /> },
              ]}
              data={rawMaterials}
            />
            <Pagination meta={rawMeta} onPageChange={setPage} />
          </div>
        );
      case 'products':
        return (
          <div>
            <div className="mb-4">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari produk..." />
            </div>
            <Table
              columns={[
                { key: 'kode_produk', label: 'Kode' },
                { key: 'nama_produk', label: 'Nama Produk' },
                { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
                { key: 'unit', label: 'Satuan', render: (r) => r.unit?.name ?? '-' },
                { key: 'stok', label: 'Stok', render: (r) => `${r.stok} ${r.unit?.name ?? ''}` },
                {
                  key: 'tanggal_kedaluwarsa',
                  label: 'Tgl Kedaluwarsa',
                  render: (r) => {
                    if (!r.tanggal_kedaluwarsa) return <span className="text-gray-400 italic">-</span>;
                    return r.tanggal_kedaluwarsa.split('T')[0];
                  },
                },
                { key: 'harga_jual', label: 'Harga Jual', render: (r) => IDR(r.harga_jual) },
                { key: 'harga_modal', label: 'Harga Modal', render: (r) => IDR(r.harga_modal) },
              ]}
              data={products}
            />
            <Pagination meta={productMeta} onPageChange={setPage} />
          </div>
        );
      case 'low-stock':
        return (
          <Table
            columns={[
              { key: 'kode_bahan', label: 'Kode' },
              { key: 'nama_bahan', label: 'Nama Bahan' },
              {
                key: 'stok',
                label: 'Stok Saat Ini',
                render: (r) => {
                  const isLow = Number(r.stok) <= Number(r.stok_minimum);
                  return (
                    <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                      {r.stok} {r.unit?.name ?? ''}
                    </span>
                  );
                },
              },
              {
                key: 'stok_minimum',
                label: 'Stok Minimum',
                render: (r) => `${r.stok_minimum} ${r.unit?.name ?? ''}`,
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => {
                  const diff = Number(r.stok) - Number(r.stok_minimum);
                  if (diff <= 0) {
                    return (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        {diff === 0 ? 'Mencapai Batas' : `Kurang ${Math.abs(diff)} ${r.unit?.name ?? ''}`}
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      Aman (+{diff} {r.unit?.name ?? ''})
                    </span>
                  );
                },
              },
              { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
            ]}
            data={lowStock}
          />
        );
      case 'expiring':
        return (
          <Table
            columns={[
              {
                key: 'item_type',
                label: 'Tipe',
                render: (r) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.item_type === 'Produk' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.item_type ?? 'Bahan Baku'}
                  </span>
                ),
              },
              { key: 'kode_bahan', label: 'Kode' },
              { key: 'nama_bahan', label: 'Nama Item' },
              {
                key: 'stok',
                label: 'Stok',
                render: (r) => `${r.stok} ${r.unit?.name ?? ''}`,
              },
              {
                key: 'tanggal_kedaluwarsa',
                label: 'Tgl Kedaluwarsa',
                render: (r) => {
                  if (!r.tanggal_kedaluwarsa) return <span className="text-gray-400 italic">Belum diatur</span>;
                  return r.tanggal_kedaluwarsa.split('T')[0];
                },
              },
              {
                key: 'status_kedaluwarsa',
                label: 'Status',
                render: (r) => {
                  if (!r.tanggal_kedaluwarsa) {
                    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Belum diatur</span>;
                  }
                  const targetDate = new Date(r.tanggal_kedaluwarsa.split('T')[0]);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  targetDate.setHours(0, 0, 0, 0);
                  const days = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

                  if (days < 0) {
                    return (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        Kedaluwarsa ({Math.abs(days)} hari lalu)
                      </span>
                    );
                  }
                  if (days === 0) {
                    return (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        Kedaluwarsa Hari Ini
                      </span>
                    );
                  }
                  if (days <= 7) {
                    return (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
                        Mendesak ({days} hari lagi)
                      </span>
                    );
                  }
                  if (days <= 30) {
                    return (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Mendekati ({days} hari lagi)
                      </span>
                    );
                  }
                  return (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      Aman ({days} hari lagi)
                    </span>
                  );
                },
              },
              { key: 'category', label: 'Kategori', render: (r) => r.category?.name ?? '-' },
              { key: 'supplier', label: 'Supplier', render: (r) => r.supplier?.nama_supplier ?? '-' },
            ]}
            data={expiring}
          />
        );
      case 'transactions':
        return (
          <Table
            columns={[
              { key: 'transaction_number', label: 'Nomor' },
              { key: 'item_type', label: 'Tipe', render: (r) => r.item_type === 'raw_material' ? 'Bahan Baku' : 'Produk' },
              { key: 'item', label: 'Item', render: (r) => r.item_type === 'raw_material' ? r.raw_material?.nama_bahan : r.product?.nama_produk },
              { key: 'transaction_type', label: 'Tipe Transaksi' },
              { key: 'quantity', label: 'Qty' },
              { key: 'balance_after', label: 'Saldo Akhir' },
              { key: 'transaction_date', label: 'Tanggal' },
              { key: 'creator', label: 'Dibuat Oleh', render: (r) => r.creator?.name },
            ]}
            data={transactions}
          />
        );
      case 'stock-card':
        return (
          <Table
            columns={[
              { key: 'transaction_number', label: 'Nomor' },
              { key: 'transaction_type', label: 'Tipe' },
              { key: 'quantity', label: 'Qty' },
              { key: 'balance_before', label: 'Saldo Sebelum' },
              { key: 'balance_after', label: 'Saldo Sesudah' },
              { key: 'transaction_date', label: 'Tanggal' },
              { key: 'reference_type', label: 'Referensi' },
              { key: 'reference_id', label: 'ID Referensi' },
            ]}
            data={stockCard}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between mb-0">
        <PageHeader title="Inventory" />
        <button
          onClick={() => setShowAdjustment(true)}
          className="mb-6 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          ± Stock Adjustment
        </button>
      </div>

      {showAdjustment && (
        <StockAdjustmentModal
          onClose={() => setShowAdjustment(false)}
          rawMaterials={allRawMaterials}
          products={allProducts}
          onSuccess={() => {
            showToast('Adjustment berhasil');
            if (activeTab === 'transactions') loadTransactions();
            else if (activeTab === 'raw-materials') loadRawMaterials();
            else if (activeTab === 'products') loadProducts();
          }}
        />
      )}

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { key: 'raw-materials', label: 'Bahan Baku' },
            { key: 'products', label: 'Produk' },
            {
              key: 'low-stock',
              label: 'Stok Minimum',
              badge: lowStock.filter((r) => Number(r.stok) <= Number(r.stok_minimum)).length,
            },
            {
              key: 'expiring',
              label: 'Akan Kedaluwarsa',
              badge: expiring.filter((r) => {
                if (!r.tanggal_kedaluwarsa) return false;
                const targetDate = new Date(r.tanggal_kedaluwarsa.split('T')[0]);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                targetDate.setHours(0, 0, 0, 0);
                return Math.round((targetDate - today) / (1000 * 60 * 60 * 24)) <= 30;
              }).length,
            },
            { key: 'transactions', label: 'Transaksi' },
            { key: 'stock-card', label: 'Stock Card' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
}
