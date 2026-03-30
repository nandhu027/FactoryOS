import { Routes, Route } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import Dashboard from "../pages/Dashboard";
import MainLayout from "../layouts/MainLayout.jsx";
import ProtectedRoute from "./ProtectedRoute";
import PermissionGuard from "../components/auth/PermissionGuard.jsx";
import RolesPage from "../pages/roles/RolePage.jsx";
import UsersPage from "../pages/users/UsersPage";
import PartiesPage from "../pages/parties/PartiesPage";
import MachinesPage from "../pages/machines/MachinesPage";
import StaffPage from "../pages/staff/StaffPage";
import ProductsPage from "../pages/products/ProductsPage";
import RawMaterialPage from "../pages/rawMaterials/RawMaterialPage.jsx";
import StockPage from "../pages/stock/StockPage.jsx";
import ProductionPage from "../pages/production/ProductionPage.jsx";
import ContractorPage from "../pages/contractor/ContractorPage.jsx";
import JobBookPage from "../pages/jobbook/JobBookPage.jsx";
import DispatchPage from "../pages/dispatch/DispatchPage.jsx";
import ExpensePage from "../pages/expenses/ExpensePage.jsx";
import PaymentPage from "../pages/payment/PaymentPage.jsx";
import AttendancePage from "../pages/staff/AttendancePage.jsx";
import AuditLogsPage from "../pages/audit/AuditLogsPage.jsx";
import SettlementsPage from "../pages/settlements/SettlementsPage.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="users"
          element={
            <PermissionGuard module="ADMIN_USERS">
              <UsersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="roles"
          element={
            <PermissionGuard module="ADMIN_USERS">
              <RolesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="parties"
          element={
            <PermissionGuard module="PARTIES">
              <PartiesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="settlements"
          element={
            <PermissionGuard module="SETTLEMENTS">
              <SettlementsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="machines"
          element={
            <PermissionGuard module="MACHINES">
              <MachinesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff"
          element={
            <PermissionGuard module="STAFF_CONTRACTORS">
              <StaffPage />
            </PermissionGuard>
          }
        />
        <Route
          path="attendance"
          element={
            <PermissionGuard module="STAFF_ATTENDANCE">
              <AttendancePage />
            </PermissionGuard>
          }
        />
        <Route
          path="products"
          element={
            <PermissionGuard module="PRODUCTS">
              <ProductsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="raw-materials"
          element={
            <PermissionGuard module="RAW_INWARD">
              <RawMaterialPage />
            </PermissionGuard>
          }
        />
        <Route
          path="stock"
          element={
            <PermissionGuard module="STOCK_ENGINE">
              <StockPage />
            </PermissionGuard>
          }
        />
        <Route
          path="production"
          element={
            <PermissionGuard module="PRODUCTION">
              <ProductionPage />
            </PermissionGuard>
          }
        />
        <Route
          path="jobbook"
          element={
            <PermissionGuard module="JOBBOOK">
              <JobBookPage />
            </PermissionGuard>
          }
        />
        <Route
          path="contractor"
          element={
            <PermissionGuard module="CONTRACTOR_IO">
              <ContractorPage />
            </PermissionGuard>
          }
        />
        <Route
          path="dispatch"
          element={
            <PermissionGuard module="DISPATCH">
              <DispatchPage />
            </PermissionGuard>
          }
        />
        <Route
          path="expenses"
          element={
            <PermissionGuard module="EXPENSES">
              <ExpensePage />
            </PermissionGuard>
          }
        />
        <Route
          path="payments"
          element={
            <PermissionGuard module="PAYMENTS">
              <PaymentPage />
            </PermissionGuard>
          }
        />
        <Route
          path="audit-logs"
          element={
            <PermissionGuard module="AUDIT_LOG">
              <AuditLogsPage />
            </PermissionGuard>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
