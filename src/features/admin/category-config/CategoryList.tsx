import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle, FiArrowDown, FiArrowUp, FiEdit2, FiLink, FiMenu, FiPlus, FiRefreshCw, FiSave, FiSearch, FiUploadCloud, FiX,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import type { Category } from "@/types/adminConfig";
import { adminConfigApi } from "@/services/adminConfigApi";
import { mediaApi } from "@/services/mediaApi";
import { toast } from "sonner";

type VisibilityFilter = "all" | "visible" | "hidden";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const inputClass =
  "w-full px-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main";

const isVisible = (c: Category) => c.status !== "INACTIVE" && c.active !== false;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The message the backend sent, so the admin sees why a save failed (a duplicate name, an invalid value...). */
function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { status?: number; data?: { message?: string; error?: string; detail?: string } }; message?: string };
  const body = e.response?.data;
  const text = body?.message || body?.detail || body?.error;
  if (text) return text;
  if (e.response?.status === 409) return "Tên hoặc đường dẫn danh mục đã tồn tại.";
  if (e.response?.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  return fallback;
}

function unwrap(res: unknown): Category[] {
  const data = Array.isArray(res) ? res : (res as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as Category[]) : [];
}

function sortedByOrder(list: Category[]): Category[] {
  return list
    .map((c, index) => ({ c, index }))
    .sort((a, b) => (a.c.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.c.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ c }) => c);
}

function VisibilitySwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500 ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function CategoryList() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VisibilityFilter>("all");

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hidingCategory, setHidingCategory] = useState<Category | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    adminConfigApi
      .getCategories()
      .then((res) => {
        if (!alive) return;
        const list = sortedByOrder(unwrap(res));
        setCategories(list);
        setSavedOrder(list.map((c) => c.id));
        setLoadError(null);
      })
      .catch((error) => {
        if (alive) setLoadError(apiErrorMessage(error, "Không tải được danh sách danh mục."));
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  const orderDirty = useMemo(
    () => categories.length === savedOrder.length && categories.some((c, i) => c.id !== savedOrder[i]),
    [categories, savedOrder],
  );
  const canReorder = !search.trim() && filter === "all";

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (filter === "visible" && !isVisible(c)) return false;
      if (filter === "hidden" && isVisible(c)) return false;
      return !q || c.name.toLowerCase().includes(q) || (c.slug || "").toLowerCase().includes(q);
    });
  }, [categories, search, filter]);

  const visibleCount = categories.filter(isVisible).length;

  // ---- order ----
  const move = (id: string, delta: number) => {
    setCategories((prev) => {
      const from = prev.findIndex((c) => c.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId || !canReorder) return;
    setCategories((prev) => {
      const from = prev.findIndex((c) => c.id === draggedId);
      const to = prev.findIndex((c) => c.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const saveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await adminConfigApi.reorderCategories(categories.map((c) => c.id));
      setSavedOrder(categories.map((c) => c.id));
      toast.success(t("Đã lưu thứ tự danh mục"));
    } catch (error) {
      toast.error(t(apiErrorMessage(error, "Không lưu được thứ tự danh mục.")));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const resetOrder = () => {
    setCategories((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      return savedOrder.map((id) => byId.get(id)).filter((c): c is Category => !!c);
    });
  };

  // ---- show / hide ----
  const applyVisibility = async (cat: Category, visible: boolean) => {
    setBusyId(cat.id);
    const next = { ...cat, status: visible ? "ACTIVE" : "INACTIVE", active: visible };
    try {
      await adminConfigApi.updateCategory(cat.id, next);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: next.status, active: next.active } : c)));
      toast.success(visible ? t("Đã hiển thị danh mục") : t("Đã ẩn danh mục"));
    } catch (error) {
      toast.error(t(apiErrorMessage(error, "Không cập nhật được trạng thái danh mục.")));
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisibility = (cat: Category) => {
    if (isVisible(cat)) setHidingCategory(cat); // hiding needs a confirmation: events cannot pick it any more
    else void applyVisibility(cat, true);
  };

  // ---- create / edit ----
  const openModal = (cat?: Category) => {
    setFormError(null);
    setUploadMode("url");
    if (cat) {
      setEditingCategory(cat);
      setFormData({ ...cat });
      setSlugEdited(true);
    } else {
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", imageUrl: "", active: true, status: "ACTIVE" });
      setSlugEdited(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) setIsModalOpen(false);
  };

  const onNameChange = (name: string) =>
    setFormData((prev) => ({ ...prev, name, slug: slugEdited ? prev.slug : slugify(name) }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, imageUrl: tempUrl }));
    try {
      setUploadingImage(true);
      const res = (await mediaApi.uploadImage(file, "categories")) as { imageUrl?: string; data?: { imageUrl?: string } };
      const url = res?.imageUrl || res?.data?.imageUrl || "";
      setFormData((prev) => (prev.imageUrl === tempUrl ? { ...prev, imageUrl: url } : prev));
      if (!url) throw new Error("no url");
    } catch {
      setFormData((prev) => (prev.imageUrl === tempUrl ? { ...prev, imageUrl: "" } : prev));
      toast.error(t("Lỗi tải ảnh lên"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validate = (): string | null => {
    const name = (formData.name || "").trim();
    const slug = (formData.slug || "").trim();
    if (!name) return "Vui lòng nhập tên danh mục.";
    if (!slug) return "Vui lòng nhập đường dẫn (slug).";
    if (!SLUG_PATTERN.test(slug)) return "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.";
    const others = categories.filter((c) => c.id !== editingCategory?.id);
    if (others.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) return "Đã có danh mục trùng tên.";
    if (others.some((c) => (c.slug || "").toLowerCase() === slug.toLowerCase())) return "Đã có danh mục trùng đường dẫn.";
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    const visible = formData.active !== false;
    const payload: Partial<Category> = {
      ...formData,
      name: (formData.name || "").trim(),
      slug: (formData.slug || "").trim(),
      description: (formData.description || "").trim(),
      active: visible,
      status: visible ? "ACTIVE" : "INACTIVE",
    };
    try {
      if (editingCategory) {
        await adminConfigApi.updateCategory(editingCategory.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? { ...c, ...payload } : c)));
        toast.success(t("Cập nhật danh mục thành công"));
      } else {
        const created = (await adminConfigApi.addCategory(payload)) as unknown as Category | { data?: Category };
        const saved = ((created as { data?: Category }).data || created) as Category;
        if (!saved?.id) throw new Error("missing id");
        setCategories((prev) => [...prev, { ...payload, ...saved, eventCount: saved.eventCount ?? 0 } as Category]);
        setSavedOrder((prev) => [...prev, saved.id]);
        toast.success(t("Thêm danh mục thành công"));
      }
      setIsModalOpen(false);
    } catch (error) {
      setFormError(apiErrorMessage(error, "Có lỗi xảy ra khi lưu danh mục."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- render ----
  const filterTabs: { key: VisibilityFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: categories.length },
    { key: "visible", label: "Đang hiển thị", count: visibleCount },
    { key: "hidden", label: "Đã ẩn", count: categories.length - visibleCount },
  ];

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Tìm theo tên hoặc đường dẫn")}
              aria-label={t("Tìm danh mục")}
              className={`${inputClass} pl-8`}
            />
          </div>
          <div className="inline-flex rounded-md border app-border p-0.5 app-bg-card" role="tablist" aria-label={t("Lọc theo trạng thái")}>
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 min-h-8 text-xs font-medium rounded transition-colors cursor-pointer ${
                  filter === tab.key ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E1E20]"
                }`}
              >
                {t(tab.label)} <span className="opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orderDirty && (
            <>
              <button
                type="button"
                onClick={resetOrder}
                disabled={isSavingOrder}
                className="inline-flex items-center gap-1.5 px-3 min-h-9 text-xs font-medium rounded-md border app-border app-text-main hover:bg-slate-50 dark:hover:bg-[#1E1E20] cursor-pointer disabled:opacity-50"
              >
                <FiX className="w-3.5 h-3.5" /> {t("Hoàn tác thứ tự")}
              </button>
              <button
                type="button"
                onClick={saveOrder}
                disabled={isSavingOrder}
                className="inline-flex items-center gap-1.5 px-3 min-h-9 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
              >
                <FiSave className="w-3.5 h-3.5" /> {isSavingOrder ? t("Đang lưu...") : t("Lưu thứ tự")}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-9 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            <FiPlus className="w-3.5 h-3.5" /> {t("Thêm danh mục")}
          </button>
        </div>
      </div>

      {!canReorder && categories.length > 1 && (
        <p className="text-xs app-text-muted">{t("Xóa ô tìm kiếm và chọn \"Tất cả\" để sắp xếp lại thứ tự.")}</p>
      )}

      {/* list */}
      <div className="app-bg-card border app-border rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[2rem_3rem_minmax(0,1fr)_6rem_7rem_5.5rem] items-center gap-3 px-4 py-2 border-b app-border app-bg-subnav text-[10px] font-semibold uppercase tracking-wider app-text-muted">
          <span />
          <span />
          <span>{t("Danh mục")}</span>
          <span className="text-right">{t("Sự kiện")}</span>
          <span className="text-center">{t("Hiển thị")}</span>
          <span className="text-right">{t("Thao tác")}</span>
        </div>

        {isLoading ? (
          <div className="divide-y app-border" aria-busy="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center" role="alert">
            <FiAlertCircle className="w-6 h-6 text-rose-500" />
            <p className="text-sm app-text-main">{t(loadError)}</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 px-3 min-h-9 text-xs font-semibold rounded-md border app-border app-text-main hover:bg-slate-50 dark:hover:bg-[#1E1E20] cursor-pointer"
            >
              <FiRefreshCw className="w-3.5 h-3.5" /> {t("Thử lại")}
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <p className="text-sm app-text-main">{t("Chưa có danh mục nào.")}</p>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-9 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" /> {t("Thêm danh mục đầu tiên")}
            </button>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm app-text-muted">{t("Không có danh mục phù hợp với bộ lọc.")}</p>
        ) : (
          <ul className="divide-y app-border">
            {shown.map((cat) => {
              const index = categories.findIndex((c) => c.id === cat.id);
              const visible = isVisible(cat);
              return (
                <li
                  key={cat.id}
                  draggable={canReorder}
                  onDragStart={(e) => {
                    setDraggedId(cat.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_3rem_minmax(0,1fr)_6rem_7rem_5.5rem] items-center gap-3 px-4 py-2.5 transition-colors ${
                    draggedId === cat.id ? "opacity-50 app-bg-subnav" : "hover:bg-slate-50 dark:hover:bg-[#1E1E20]"
                  } ${visible ? "" : "opacity-70"}`}
                >
                  <div className="flex flex-col items-center">
                    {canReorder ? (
                      <>
                        <button
                          type="button"
                          aria-label={t("Chuyển lên")}
                          disabled={index === 0}
                          onClick={() => move(cat.id, -1)}
                          className="text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        >
                          <FiArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <FiMenu className="w-3.5 h-3.5 text-slate-400 cursor-grab" aria-hidden />
                        <button
                          type="button"
                          aria-label={t("Chuyển xuống")}
                          disabled={index === categories.length - 1}
                          onClick={() => move(cat.id, 1)}
                          className="text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        >
                          <FiArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs app-text-muted">{index + 1}</span>
                    )}
                  </div>

                  <div className="h-10 w-10 rounded-md overflow-hidden app-bg-subnav border app-border flex items-center justify-center">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[10px] text-slate-400">{t("Chưa có ảnh")}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold app-text-main">{t(cat.name)}</p>
                    <p className="truncate text-xs app-text-muted">/{cat.slug}</p>
                  </div>

                  <span className="hidden md:block text-right text-sm app-text-main tabular-nums">
                    {typeof cat.eventCount === "number" ? cat.eventCount : "—"}
                  </span>

                  <div className="flex items-center justify-center gap-2">
                    <VisibilitySwitch
                      checked={visible}
                      disabled={busyId === cat.id}
                      label={`${t("Hiển thị")}: ${cat.name}`}
                      onChange={() => toggleVisibility(cat)}
                    />
                    <span className="hidden lg:inline text-[10px] app-text-muted w-12">{visible ? t("Hiển thị") : t("Đã ẩn")}</span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => openModal(cat)}
                      aria-label={`${t("Sửa")}: ${cat.name}`}
                      className="inline-flex items-center gap-1.5 px-2.5 min-h-8 text-xs font-medium rounded-md border app-border app-text-main hover:bg-slate-100 dark:hover:bg-[#2a2a2d] cursor-pointer"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">{t("Sửa")}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <AdminModal title={editingCategory ? t("Sửa danh mục") : t("Thêm danh mục mới")} onClose={closeModal} pending={isSubmitting}>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300" role="alert">
                <FiAlertCircle className="w-4 h-4 mt-px shrink-0" />
                <span>{t(formError)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="text-xs font-medium app-text-main">{t("Tên danh mục")}</label>
              <input id="cat-name" type="text" value={formData.name || ""} onChange={(e) => onNameChange(e.target.value)} className={inputClass} placeholder={t("Ví dụ: Nhạc kịch")} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-slug" className="text-xs font-medium app-text-main">{t("Đường dẫn (Slug)")}</label>
              <input
                id="cat-slug"
                type="text"
                value={formData.slug || ""}
                onChange={(e) => {
                  setSlugEdited(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                className={inputClass}
                placeholder={t("Ví dụ: nhac-kich")}
              />
              <p className="text-[10px] app-text-muted">{t("Tự sinh từ tên; sửa tay nếu cần. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang.")}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-desc" className="text-xs font-medium app-text-main">{t("Mô tả")}</label>
              <textarea
                id="cat-desc"
                rows={2}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${inputClass} py-2 resize-none`}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium app-text-main">{t("Hình ảnh đại diện")}</span>
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-md">
                {([["url", FiLink, "Nhập URL"], ["upload", FiUploadCloud, "Upload"]] as const).map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setUploadMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      uploadMode === mode ? "bg-white dark:bg-[#1E1E20] shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t(label)}
                  </button>
                ))}
              </div>
              {uploadMode === "url" ? (
                <input type="text" value={formData.imageUrl || ""} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className={inputClass} placeholder="https://..." />
              ) : (
                <div className="border border-dashed app-border rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 relative overflow-hidden group">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="" className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="text-white text-xs font-medium">{uploadingImage ? t("Đang tải...") : t("Thay đổi ảnh")}</span>
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer py-4">
                      <FiUploadCloud className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-[10px] font-medium">{uploadingImage ? t("Đang tải...") : t("Chọn ảnh để tải lên")}</span>
                      <span className="text-[9px] text-slate-400 mt-1">{t("Kích thước khuyến nghị: 400x400 (Vuông)")}</span>
                    </button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active !== false}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium app-text-main">{t("Hiển thị trên trang chủ và khi chọn danh mục")}</span>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t app-border">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="min-h-9 px-4 text-xs font-medium rounded-md border app-border hover:bg-slate-50 dark:hover:bg-[#1E1E20] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50">
              {t("Hủy bỏ")}
            </button>
            <button type="button" onClick={handleSave} disabled={isSubmitting || uploadingImage} className="min-h-9 px-4 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer">
              {isSubmitting ? t("Đang lưu...") : t("Xác nhận")}
            </button>
          </div>
        </AdminModal>
      )}

      {hidingCategory && (
        <AdminConfirmModal
          title={t("Ẩn danh mục")}
          subtitle={t("Ẩn \"{{name}}\"? Các sự kiện đang dùng danh mục này vẫn giữ nguyên, nhưng không thể chọn danh mục này cho sự kiện mới và danh mục không còn hiện trên trang chủ.", { name: hidingCategory.name })}
          onConfirm={() => {
            const target = hidingCategory;
            setHidingCategory(null);
            void applyVisibility(target, false);
          }}
          onClose={() => setHidingCategory(null)}
          confirmText={t("Ẩn danh mục")}
          cancelText={t("Hủy")}
        />
      )}
    </div>
  );
}
