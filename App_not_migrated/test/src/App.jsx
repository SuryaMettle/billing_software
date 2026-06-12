import { useEffect, useState } from "react";
import Billing from "./components/Billing";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import InvoiceList from "./components/InvoiceList";
import Parties from "./components/Parties";
import PurchaseBilling from "./components/PurchaseBilling";
import PurchaseInvoiceList from "./components/PurchaseInvoiceList";
import Settings from "./components/Settings";
import SalesReturn from "./components/SalesReturn";
import PurchaseReturn from "./components/PurchaseReturn";
import Offers from "./components/Offers";
import GSTReports from "./components/GSTReports";
import "./App.css";

function App() {
  const [page, setPage] = useState("billing");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const loadProducts = async () => {
    const data = await window.api.getProducts();
    setProducts(Array.isArray(data) ? data : []);
  };

  const loadCategories = async () => {
    const data = await window.api.getCategories?.();
    setCategories(Array.isArray(data) ? data : []);
  };

  const refreshInventoryData = async () => {
    await Promise.all([loadProducts(), loadCategories()]);
  };

  const deleteProduct = async (id) => {
    await window.api.deleteProduct(id);
    await refreshInventoryData();
  };

  useEffect(() => {
    refreshInventoryData();
  }, []);

  useEffect(() => {
    const handlePurchaseUpdate = () => {
      refreshInventoryData();
    };

    window.addEventListener("purchase-updated", handlePurchaseUpdate);
    return () => window.removeEventListener("purchase-updated", handlePurchaseUpdate);
  }, []);

  useEffect(() => {
    const handleInvoiceUpdated = () => {
      refreshInventoryData();
    };

    window.addEventListener("invoice-updated", handleInvoiceUpdated);
    return () => window.removeEventListener("invoice-updated", handleInvoiceUpdated);
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Billing App</h2>

        <button onClick={() => setPage("billing")} className={`nav-btn ${page === "billing" ? "active" : ""}`}>
          Billing
        </button>

        <button onClick={() => setPage("products")} className={`nav-btn ${page === "products" ? "active" : ""}`}>
          Products
        </button>

        <button onClick={() => setPage("invoices")} className={`nav-btn ${page === "invoices" ? "active" : ""}`}>
          Invoices
        </button>

        <button onClick={() => setPage("sales-return")} className={`nav-btn ${page === "sales-return" ? "active" : ""}`}>
          Sales Return
        </button>

        <button onClick={() => setPage("parties")} className={`nav-btn ${page === "parties" ? "active" : ""}`}>
          Parties
        </button>

        <button onClick={() => setPage("purchases")} className={`nav-btn ${page === "purchases" ? "active" : ""}`}>
          Purchase Invoice
        </button>

        <button onClick={() => setPage("purchase-history")} className={`nav-btn ${page === "purchase-history" ? "active" : ""}`}>
          Purchase History
        </button>

        <button onClick={() => setPage("purchase-return")} className={`nav-btn ${page === "purchase-return" ? "active" : ""}`}>
          Purchase Return
        </button>

        <button onClick={() => setPage("settings")} className={`nav-btn ${page === "settings" ? "active" : ""}`}>
          Settings
        </button>

        <button onClick={() => setPage("offers")} className={`nav-btn ${page === "offers" ? "active" : ""}`}>
          Offers
        </button>

        <button onClick={() => setPage("gst-reports")} className={`nav-btn ${page === "gst-reports" ? "active" : ""}`}>
          GST Reports
        </button>

      </div>

      <div
        className="main"
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            width: "100%",
            padding: "20px 30px",
          }}
        >
          {page === "billing" && (
            <Billing onInvoiceSaved={refreshInventoryData} products={products} />
          )}

          {page === "products" && (
            <ProductList
              products={products}
              onDelete={deleteProduct}
              onProductAdded={refreshInventoryData}
              onCreateProduct={() => setPage("create-product")}
            />
          )}

          {page === "create-product" && (
            <ProductForm
              products={products}
              onBack={() => setPage("products")}
              onProductAdded={() => {
                refreshInventoryData();
                setPage("products");
              }}
            />
          )}

          {page === "invoices" && <InvoiceList />}

          {page === "sales-return" && (
            <SalesReturn products={products} onReturnSaved={refreshInventoryData} />
          )}

          {page === "parties" && (
            <Parties onOpenInvoices={() => setPage("invoices")} />
          )}

          {page === "purchases" && <PurchaseBilling />}

          {page === "purchase-history" && <PurchaseInvoiceList />}

          {page === "purchase-return" && (
            <PurchaseReturn onReturnSaved={refreshInventoryData} />
          )}

          {page === "settings" && <Settings />}

          {page === "offers" && (
            <Offers products={products} categories={categories} />
          )}

          {page === "gst-reports" && <GSTReports />}

        </div>
      </div>
    </div>
  );
}

export default App;