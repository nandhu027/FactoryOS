import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import ProductForm from "./ProductForm";
import ProductDetailModal from "./ProductDetailModal";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Package,
  Layers,
  Box,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const formatQty = (num) =>
  Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ProductsPage = () => {
  const [activeTab, setActiveTab] = useState("FINISHED"); // FINISHED | SEMI_FINISHED
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total_pages: 1,
    total: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const endpoint =
          activeTab === "FINISHED" ? "/products" : "/products/semi-finished";

        const query = new URLSearchParams({
          search: searchQuery,
          page: page,
          limit: 10,
          is_active: "ALL",
        }).toString();

        const res = await api.get(`${endpoint}?${query}`);

        let rawData = [];
        let metaData = null;

        if (res.data?.data?.data) {
          rawData = res.data.data.data;
          metaData = res.data.data.meta;
        } else if (Array.isArray(res.data?.data)) {
          rawData = res.data.data;
        } else if (Array.isArray(res.data)) {
          rawData = res.data;
        }

        rawData = rawData.filter(
          (item) =>
            !(item.product_name || item.item_name || "").startsWith(
              "[System Proxy]",
            ),
        );

        if (metaData) {
          setProducts(rawData);
          setMeta(metaData);
        } else {
          let filtered = rawData;

          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (item) =>
                (item.product_name || item.item_name || "")
                  .toLowerCase()
                  .includes(q) ||
                (item.product_code || item.item_code || "")
                  .toLowerCase()
                  .includes(q),
            );
          }

          const total = filtered.length;
          const total_pages = Math.ceil(total / 10) || 1;
          const safePage = Math.min(page, total_pages);
          const startIdx = (safePage - 1) * 10;

          setProducts(filtered.slice(startIdx, startIdx + 10));
          setMeta({
            page: safePage,
            limit: 10,
            total_pages: total_pages,
            total: total,
          });
        }
      } catch (error) {
        toast.error("Failed to fetch catalog");
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, searchQuery],
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setSearchQuery(localSearch);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to deactivate/delete this item?")
    ) {
      try {
        const endpoint =
          activeTab === "FINISHED"
            ? `/products/${id}`
            : `/products/semi-finished/${id}`;
        const res = await api.delete(endpoint);
        toast.success(res.data.message || "Item deactivated");
        fetchProducts(meta.page);
      } catch (error) {
        toast.error("Failed to delete item.");
      }
    }
  };

  const indexOfFirstItem = (meta.page - 1) * meta.limit;
  const indexOfLastItem = indexOfFirstItem + products.length;

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 shrink-0 w-full"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5">
              Product Catalog
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              Manage inventory master definitions
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative group flex-1 w-full min-w-[200px]"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder={`Search ${activeTab === "FINISHED" ? "Finished Goods" : "WIP Items"}...`}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.trim() === "") setSearchQuery("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit(e);
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" />
            </form>

            <div className="flex flex-col sm:flex-row lg:flex-row gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="w-full sm:w-[260px] shrink-0">
                <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full h-[40px] sm:h-[44px] gap-1">
                  <button
                    onClick={() => {
                      setActiveTab("FINISHED");
                      setLocalSearch("");
                      setSearchQuery("");
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "FINISHED"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <Package
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">Finished</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("SEMI_FINISHED");
                      setLocalSearch("");
                      setSearchQuery("");
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "SEMI_FINISHED"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <Layers
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">WIP</span>
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedProduct(null);
                  setShowForm(true);
                }}
                className="w-full sm:w-auto h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 shrink-0 whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2} className="text-white/90" />
                Add {activeTab === "FINISHED" ? "Product" : "WIP"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            {/* Desktop Header - Floating Style with Fixed Gaps */}
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
              <div className="w-[80px]">Record ID</div>
              <div className="flex-1 min-w-[200px]">Item Profile</div>
              <div className="w-[180px]">Live Physical Stock</div>
              <div className="w-[100px]">Base Unit</div>
              <div className="w-[100px]">Status</div>
              <div className="w-[120px] text-right pr-2">Actions</div>
            </div>

            {isLoading ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                  <Loader2
                    size={24}
                    className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${products.length === 0 ? "flex-1" : ""} overflow-y-auto`}
              >
                {products.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Box
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      Catalog is empty
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm text-center px-4">
                      Try adjusting your search or add a new item to get
                      started.
                    </p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="group flex flex-col w-full shrink-0"
                    >
                      <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-3 sm:p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] flex items-center justify-center font-bold text-[14px] sm:text-[16px] shadow-sm shrink-0 border ${activeTab === "FINISHED" ? "bg-slate-900 text-white border-slate-700/50" : "bg-emerald-50 text-emerald-700 border-emerald-200/80"}`}
                            >
                              {(
                                product.product_name ||
                                product.item_name ||
                                "WP"
                              )
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                {product.product_name || product.item_name}
                              </h4>
                              <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                                Code:{" "}
                                {product.product_code || product.item_code}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-[4px] sm:rounded-[6px] border border-slate-100 tabular-nums shrink-0 mt-0.5 shadow-sm">
                            #{product.id}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-[12px] p-2.5">
                          <div className="flex flex-col border-r border-slate-200/60 pr-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                              <Database size={10} /> Own Stock
                            </span>
                            <span className="text-[14px] font-bold text-slate-900 tabular-nums">
                              {formatQty(product.own_stock)}{" "}
                              <span className="text-[9px] text-slate-400 font-semibold">
                                {product.default_uom}
                              </span>
                            </span>
                          </div>
                          <div className="flex flex-col pl-1">
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                              <Database size={10} /> Job Work
                            </span>
                            <span className="text-[14px] font-bold text-blue-700 tabular-nums">
                              {formatQty(product.job_work_stock)}{" "}
                              <span className="text-[9px] text-blue-400/60 font-semibold">
                                {product.default_uom}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3.5">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                            UoM: {product.default_uom}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                              product.is_active
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-slate-500/10 text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100/80">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDetails(true);
                            }}
                            className="text-[11px] sm:text-[12px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[8px] sm:rounded-[10px] transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 border border-blue-100/50 tracking-wide"
                          >
                            <Eye
                              size={12}
                              strokeWidth={2.5}
                              className="sm:w-[14px] sm:h-[14px]"
                            />{" "}
                            View Lifecycle
                          </button>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowForm(true);
                              }}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-slate-400 hover:text-slate-900 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                            >
                              <Pencil
                                size={14}
                                className="sm:w-[16px] sm:h-[16px]"
                                strokeWidth={2}
                              />
                            </button>
                            {product.is_active && (
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                              >
                                <Trash2
                                  size={14}
                                  className="sm:w-[16px] sm:h-[16px]"
                                  strokeWidth={2}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                        <div className="w-[80px]">
                          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2 py-1 rounded-full border border-slate-200/60 tabular-nums">
                            #{product.id}
                          </span>
                        </div>

                        <div className="flex-1 min-w-[200px] flex items-center gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-[13px] shadow-sm shrink-0 border ${activeTab === "FINISHED" ? "bg-white border-slate-200 text-slate-700" : "bg-emerald-50 text-emerald-700 border-emerald-200/80"}`}
                          >
                            {(product.product_name || product.item_name || "WP")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex flex-col justify-center">
                            <h4
                              className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowDetails(true);
                              }}
                            >
                              {product.product_name || product.item_name}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                              Code: {product.product_code || product.item_code}
                            </p>
                          </div>
                        </div>
                        <div className="w-[180px] flex gap-3">
                          <div className="flex flex-col border-r border-slate-200/60 pr-3">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                              Own
                            </span>
                            <span className="text-[13px] font-bold text-slate-900 tabular-nums">
                              {formatQty(product.own_stock)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">
                              Job Work
                            </span>
                            <span className="text-[13px] font-bold text-blue-700 tabular-nums">
                              {formatQty(product.job_work_stock)}
                            </span>
                          </div>
                        </div>

                        <div className="w-[100px] flex items-center">
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                            {product.default_uom}
                          </span>
                        </div>

                        <div className="w-[100px] flex items-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              product.is_active
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-slate-500/10 text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="w-[120px] text-right flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDetails(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="View Lifecycle"
                          >
                            <Eye size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowForm(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="Edit Details"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                          {product.is_active && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Deactivate Item"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {!isLoading && products.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {Math.min(indexOfLastItem, meta.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {meta.total}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {meta.page} of {meta.total_pages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={meta.page <= 1}
                      onClick={() => fetchProducts(meta.page - 1)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {meta.page} of {meta.total_pages}
                      </span>
                    </div>
                    <button
                      disabled={meta.page >= meta.total_pages}
                      onClick={() => fetchProducts(meta.page + 1)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {showForm && (
          <ProductForm
            item={selectedProduct}
            itemType={activeTab}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              fetchProducts(meta.page);
            }}
          />
        )}
        {showDetails && (
          <ProductDetailModal
            itemId={selectedProduct.id}
            itemType={activeTab}
            onClose={() => setShowDetails(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsPage;
