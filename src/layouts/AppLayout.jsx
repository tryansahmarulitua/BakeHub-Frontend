import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ALL = ['Owner', 'Admin', 'Staff Gudang', 'Staff Produksi', 'Kasir'];

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ALL },
  {
    label: 'Master Data',
    icon: '📁',
    roles: ['Admin'],
    children: [
      { path: '/master/categories', label: 'Kategori' },
      { path: '/master/units', label: 'Satuan' },
      { path: '/master/raw-materials', label: 'Bahan Baku' },
      { path: '/master/products', label: 'Produk' },
      { path: '/master/suppliers', label: 'Supplier' },
      { path: '/master/customers', label: 'Customer' },
    ],
  },
  {
    label: 'Procurement',
    icon: '🛒',
    roles: ['Admin', 'Staff Gudang'],
    children: [
      { path: '/procurement/purchase-orders', label: 'Purchase Order' },
      { path: '/procurement/goods-receipts', label: 'Penerimaan Barang' },
    ],
  },
  {
    label: 'Inventory',
    icon: '📦',
    roles: ['Admin', 'Staff Gudang'],
    children: [
      { path: '/inventory', label: 'Inventory & Stok' },
    ],
  },
  {
    label: 'Produksi',
    icon: '🏭',
    roles: ['Admin', 'Staff Produksi'],
    children: [
      { path: '/production/recipes', label: 'Resep / BOM' },
      { path: '/production/productions', label: 'Order Produksi' },
    ],
  },
  {
    label: 'Penjualan',
    icon: '💰',
    roles: ['Admin', 'Kasir'],
    children: [
      { path: '/master/products', label: 'Produk' },
      { path: '/master/customers', label: 'Customer' },
      { path: '/sales', label: 'Transaksi Penjualan' },
      { path: '/sales/order-produksi', label: 'Order Produksi' },
    ],
  },
  {
    label: 'Return & Waste',
    icon: '🗑️',
    roles: ['Admin', 'Staff Gudang', 'Staff Produksi'],
    children: [
      { path: '/returns', label: 'Return' },
      { path: '/waste', label: 'Waste' },
    ],
  },
  {
    label: 'Return Penjualan',
    icon: '↩️',
    roles: ['Admin', 'Kasir'],
    children: [
      { path: '/returns', label: 'Return Penjualan' },
    ],
  },
  { path: '/reports', label: 'Laporan', icon: '📈', roles: ['Owner', 'Admin'] },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState('Master Data');

  const roleName = user?.role?.name;
  const visibleMenu = menuItems.filter((item) =>
    !item.roles || item.roles.includes(roleName)
  );

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">🍞 BakeHub</h1>
          <p className="text-xs text-gray-400 mt-1">ERP Toko Roti</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {visibleMenu.map((item) =>
            item.children ? (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                  className="w-full flex items-center justify-between px-6 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <span>{item.icon} {item.label}</span>
                  <span>{openGroup === item.label ? '▾' : '▸'}</span>
                </button>
                {openGroup === item.label && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block px-6 py-2 text-sm transition ${
                          location.pathname === child.path
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-2 text-sm transition ${
                  location.pathname === item.path
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.icon} <span className="ml-2">{item.label}</span>
              </Link>
            )
          )}
        </nav>

        <div className="px-6 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role?.name}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
