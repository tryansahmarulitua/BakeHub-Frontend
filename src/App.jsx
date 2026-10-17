import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/master/Suppliers';
import Customers from './pages/master/Customers';
import Categories from './pages/master/Categories';
import Units from './pages/master/Units';
import RawMaterials from './pages/master/RawMaterials';
import Products from './pages/master/Products';
import Inventory from './pages/inventory/Inventory';
import Recipes from './pages/production/Recipes';
import Productions from './pages/production/Productions';
import Sales from './pages/sales/Sales';
import OrderProduksi from './pages/sales/OrderProduksi';
import Returns from './pages/returns/Returns';
import Wastes from './pages/waste/Wastes';
import Reports from './pages/reports/Reports';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import GoodsReceipts from './pages/procurement/GoodsReceipts';
import './App.css';

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/master/suppliers" element={<Protected><Suppliers /></Protected>} />
          <Route path="/master/customers" element={<Protected><Customers /></Protected>} />
          <Route path="/master/categories" element={<Protected><Categories /></Protected>} />
          <Route path="/master/units" element={<Protected><Units /></Protected>} />
          <Route path="/master/raw-materials" element={<Protected><RawMaterials /></Protected>} />
          <Route path="/master/products" element={<Protected><Products /></Protected>} />
          <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
          <Route path="/production/recipes" element={<Protected><Recipes /></Protected>} />
          <Route path="/production/productions" element={<Protected><Productions /></Protected>} />
          <Route path="/sales" element={<Protected><Sales /></Protected>} />
          <Route path="/sales/order-produksi" element={<Protected><OrderProduksi /></Protected>} />
          <Route path="/returns" element={<Protected><Returns /></Protected>} />
          <Route path="/waste" element={<Protected><Wastes /></Protected>} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="/procurement/purchase-orders" element={<Protected><PurchaseOrders /></Protected>} />
          <Route path="/procurement/goods-receipts" element={<Protected><GoodsReceipts /></Protected>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
