import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiGift, FiLoader, FiTag, FiX } from "react-icons/fi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { ekycApi } from "@/services/ekycApi";
import { useMarketplaceSaga } from "@/features/resale/hooks/useMarketplaceSaga";
import { formatCurrency } from "@/utils/formatters";
import { PATHS } from "@/routes/paths";
import type { ResaleEligibility } from "@/types/marketplace";
import type { TicketItem } from "./MyTickets";

interface ModalProps {
  ticket: TicketItem;
  onClose: () => void;
  onChanged: () => void;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Marketplace</p>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TicketSummary({ ticket }: { ticket: TicketItem }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
        {ticket.eventPoster ? (
          <img src={ticket.eventPoster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">HaloTicket</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{ticket.eventTitle}</p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{ticket.ticketTypeName} · 1 vé</span>
          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(ticket.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

function FlowSteps({ gift = false, activeStep = 1 as 1 | 2 | 3 }: { gift?: boolean; activeStep?: 1 | 2 | 3 }) {
  const steps = gift ? ["Người nhận", "Xác nhận", "Chuyển vé"] : ["Thiết lập giá", "Xác nhận", "Đăng bán"];
  return (
    <nav aria-label="Các bước thực hiện" className="w-full">
      <ol className="flex items-center justify-between text-xs">
        {steps.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const isCurrent = n === activeStep;
          const isPassed = n < activeStep;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className={`flex items-center gap-1.5 ${isCurrent ? "font-semibold text-blue-600 dark:text-blue-400" : isPassed ? "font-medium text-slate-600 dark:text-slate-300" : "font-normal text-slate-400 dark:text-slate-500"}`}>
                {isCurrent ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                ) : isPassed ? (
                  <span className="text-[11px] font-bold text-slate-500">✓</span>
                ) : null}
                <span>{n} {label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-2 h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function errorMessage(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const response = (error as { response?: { data?: { message?: string; detail?: string; error?: string } } })?.response?.data;
  const raw = typeof response === "string" ? response : JSON.stringify(response || {});
  const code = ((typeof response === "object" && response ? response.message || response.detail || response.error : "") || "") + " " + raw;
  if (code.includes("PRICE_OUT_OF_RANGE")) return "Giá bán phải nằm trong khoảng cho phép.";
  if (code.includes("POLICY_CHANGED")) return "Chính sách bán lại vừa thay đổi. Hãy tải lại thông tin giá.";
  if (code.includes("TICKET_NOT_ELIGIBLE")) return "Vé không còn đủ điều kiện thực hiện thao tác này.";
  if (code.includes("EKYC_REQUIRED")) return "Tài khoản của bạn cần hoàn tất xác minh danh tính (eKYC) trước khi đăng bán lại vé.";
  if (code.includes("EKYC_SERVICE_UNAVAILABLE")) return "Dịch vụ xác thực danh tính tạm thời không phản hồi. Vui lòng thử lại sau.";
  if (status === 409 || code.includes("Conflict")) {
    return "Tài khoản của bạn cần hoàn tất xác minh danh tính (eKYC) trước khi đăng bán lại vé.";
  }
  return "Không thể hoàn tất thao tác. Trạng thái vé sẽ được hệ thống đối soát và khôi phục nếu cần.";
}

export function ResaleTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const [eligibility, setEligibility] = useState<ResaleEligibility | null>(null);
  const [price, setPrice] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sagaId, setSagaId] = useState<string>();
  const changedForSaga = useRef<string | undefined>(undefined);
  const { saga } = useMarketplaceSaga(sagaId);

  useEffect(() => {
    let active = true;
    Promise.all([
      marketplaceApi.getResaleEligibility(ticket.id),
      ekycApi.getOrganizerEligibility().catch(() => ({ eligible: false, reasonCode: "EKYC_NOT_STARTED" })),
    ])
      .then(([result, ekyc]) => {
        if (!active) return;
        if (!ekyc?.eligible) {
          setEligibility({
            ...result,
            eligible: false,
            reasonCode: "EKYC_REQUIRED",
          });
          return;
        }
        setEligibility(result);
        if (result.minPrice != null) setPrice(String(result.minPrice));
      })
      .catch((error) => active && setSubmitError(errorMessage(error)))
      .finally(() => active && setLoadingEligibility(false));
    return () => { active = false; };
  }, [ticket.id]);

  useEffect(() => {
    if (!sagaId || changedForSaga.current === sagaId || !saga) return;
    if (["COMPLETED", "FAILED", "COMPENSATED"].includes(saga.state)) {
      changedForSaga.current = sagaId;
      onChanged();
    }
  }, [onChanged, saga, sagaId]);

  const numericPrice = Number(price);
  const priceValid = useMemo(() => Boolean(
    eligibility?.eligible && Number.isInteger(numericPrice) && numericPrice >= (eligibility.minPrice ?? 0) && numericPrice <= (eligibility.maxPrice ?? Number.MAX_SAFE_INTEGER)
  ), [eligibility, numericPrice]);

  const quantity = ticket.quantity || 1;
  const isMultiTicket = quantity >= 2;
  const [allowRetail, setAllowRetail] = useState(true);

  const submit = async () => {
    if (!eligibility || !priceValid || !accepted) return;
    setSubmitError(null);
    try {
      const result = await marketplaceApi.createResaleListing({
        ticketId: ticket.id,
        price: numericPrice,
        policyVersion: eligibility.policyVersion ?? undefined,
        termsVersion: eligibility.termsVersion ?? undefined,
        allowRetail: quantity <= 1 ? true : allowRetail,
      });
      setSagaId(result.sagaId);
      setStep(3);
    } catch (error) {
      setSubmitError(errorMessage(error));
      onChanged();
    }
  };

  const failed = saga && ["FAILED", "COMPENSATED"].includes(saga.state);
  const completed = saga?.state === "COMPLETED";
  const isTerminal = completed || failed;

  // Derive active step for FlowSteps
  const activeStep: 1 | 2 | 3 = sagaId ? 3 : step;

  return (
    <ModalShell title="Đăng bán lại vé" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <FlowSteps activeStep={activeStep} />
        <TicketSummary ticket={ticket} />

        {loadingEligibility ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><FiLoader className="animate-spin" /> Đang kiểm tra điều kiện bán lại…</div>
        ) : completed ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200"><FiCheck /> Vé đã được đăng bán.</div>
            <p className="mt-1">Vé đã khóa check-in và tin đăng đang hiển thị trên Marketplace.</p>
          </div>
        ) : failed ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-200"><FiAlertCircle /> Đăng bán không thành công</div>
            <p className="mt-1">{saga.lastError || "Hệ thống đang trả vé về trạng thái trước đó."}</p>
          </div>
        ) : sagaId ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
            <FiLoader className="animate-spin text-blue-600" /> Đang khóa vé và công khai tin đăng…
          </div>
        ) : eligibility?.eligible && step === 1 ? (
          <>
            {/* Step 1: Price input */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="p-2.5 text-center">
                <p className="text-slate-500 dark:text-slate-400">Giá gốc</p>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(eligibility.originalPrice || 0)}</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="text-slate-500 dark:text-slate-400">Tối thiểu</p>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(eligibility.minPrice || 0)}</p>
              </div>
              <div className="p-2.5 text-center">
                <p className="text-slate-500 dark:text-slate-400">Tối đa</p>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(eligibility.maxPrice || 0)}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Giá bán
              </label>
              <div className="relative mt-1.5">
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  aria-label="Giá bán"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">đ</span>
              </div>
              {price && !priceValid && (
                <span className="mt-1 block text-xs text-rose-600">
                  Nhập giá trong khoảng {formatCurrency(eligibility.minPrice || 0)} – {formatCurrency(eligibility.maxPrice || 0)}.
                </span>
              )}
            </div>
            {/* Hình thức bán vé */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hình thức bán lại
              </label>
              {isMultiTicket ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                      allowRetail
                        ? "border-blue-600 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Bán lẻ</span>
                      <input
                        type="radio"
                        name="resale_sale_mode"
                        checked={allowRetail}
                        onChange={() => setAllowRetail(true)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Người mua có thể chọn mua lẻ từng vé theo nhu cầu.
                    </p>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                      !allowRetail
                        ? "border-blue-600 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Không bán lẻ</span>
                      <input
                        type="radio"
                        name="resale_sale_mode"
                        checked={!allowRetail}
                        onChange={() => setAllowRetail(false)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Bắt buộc mua toàn bộ {quantity} vé cùng một lúc.
                    </p>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Bán lẻ
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Đơn hàng 1 vé tự động áp dụng chế độ bán lẻ.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    1 vé
                  </span>
                </div>
              )}
            </div>

            {eligibility.closesAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhận đăng bán đến {new Date(eligibility.closesAt).toLocaleString("vi-VN")}.
              </p>
            )}
          </>
        ) : eligibility?.eligible && step === 2 ? (
          <>
            {/* Step 2: Confirmation table */}
            <dl className="grid grid-cols-2 gap-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/40">
              <dt className="text-slate-500 dark:text-slate-400">Sự kiện</dt>
              <dd className="truncate text-right font-medium text-slate-900 dark:text-white">{ticket.eventTitle}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Loại vé</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">{ticket.ticketTypeName}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Số lượng</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">{quantity} vé</dd>
              <dt className="text-slate-500 dark:text-slate-400">Hình thức bán</dt>
              <dd className="text-right font-semibold text-slate-900 dark:text-white">
                {quantity <= 1 || allowRetail ? (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Bán lẻ
                  </span>
                ) : (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Không bán lẻ
                  </span>
                )}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Giá gốc</dt>
              <dd className="text-right text-slate-500 dark:text-slate-400">{formatCurrency(eligibility.originalPrice || 0)}</dd>
              <dt className="font-semibold text-slate-900 dark:text-white">Giá bán</dt>
              <dd className="text-right text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(numericPrice)}</dd>
            </dl>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Tôi đồng ý điều khoản bán lại và hiểu rằng vé sẽ bị khóa check-in khi tin đăng được tạo.</span>
            </label>
          </>
        ) : !eligibility?.eligible ? (
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-800/40 dark:bg-amber-950/20">
            {eligibility?.reasonCode === "EKYC_REQUIRED" ? (
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Tài khoản của bạn cần hoàn tất xác minh danh tính (eKYC) trước khi đăng bán lại vé.
                </p>
                <div className="mt-2.5">
                  <Link
                    to={PATHS.EKYC}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Xác minh eKYC ngay
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Vé không đủ điều kiện bán lại hoặc thời gian nhận đăng bán đã kết thúc.
              </p>
            )}
          </div>
        ) : null}

        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <FiAlertCircle className="shrink-0" />
              <span>{submitError}</span>
            </div>
            {submitError.includes("eKYC") && (
              <div className="mt-2">
                <Link
                  to={PATHS.EKYC}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Xác minh eKYC ngay
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2.5 border-t border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:-mx-6 sm:-mb-6 sm:px-6">
          {isTerminal ? (
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Đóng</button>
          ) : sagaId ? (
            // Polling — no actions
            null
          ) : step === 1 ? (
            <>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Hủy</button>
              {eligibility?.eligible && (
                <button type="button" onClick={() => setStep(2)} disabled={!priceValid} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                  Tiếp tục
                </button>
              )}
            </>
          ) : step === 2 ? (
            <>
              <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Quay lại</button>
              <button type="button" onClick={submit} disabled={!accepted} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                <span className="inline-flex items-center gap-1.5"><FiTag /> Xác nhận đăng bán</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Hủy</button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

export function GiftTicketModal({ ticket, onClose, onChanged }: ModalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sagaId, setSagaId] = useState<string>();
  const changedForSaga = useRef<string | undefined>(undefined);
  const { saga } = useMarketplaceSaga(sagaId, { stopOnWaitingRecipient: true });
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (!sagaId || changedForSaga.current === sagaId || !saga) return;
    if (["WAITING_RECIPIENT", "COMPLETED", "FAILED", "COMPENSATED"].includes(saga.state)) {
      changedForSaga.current = sagaId;
      onChanged();
    }
  }, [onChanged, saga, sagaId]);

  const submit = async () => {
    if (!emailValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await marketplaceApi.createGift({ ticketId: ticket.id, recipientEmail: email.trim(), message: message.trim() || undefined });
      setSagaId(result.sagaId);
    } catch (error) {
      setSubmitError(errorMessage(error));
      onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const waitingRecipient = saga?.state === "WAITING_RECIPIENT";
  const completed = saga?.state === "COMPLETED";
  const failed = saga && ["FAILED", "COMPENSATED"].includes(saga.state);

  const giftActiveStep: 1 | 2 | 3 = sagaId ? (waitingRecipient || completed || failed ? 3 : 3) : 1;

  return (
    <ModalShell title="Tặng vé" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <FlowSteps gift activeStep={giftActiveStep} />
        <TicketSummary ticket={ticket} />
        {waitingRecipient || completed ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200"><FiCheck /> {completed ? "Đã chuyển vé" : "Đã gửi lời mời nhận vé"}</div>
            <p className="mt-1">{completed ? "Quyền sở hữu vé đã được cập nhật." : `Người nhận cần mở email ${email} và xác nhận trước khi vé được chuyển.`}</p>
          </div>
        ) : failed ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"><div className="flex items-center gap-1.5 font-semibold"><FiAlertCircle /> Không thể tặng vé</div><p className="mt-1">{saga.lastError || "Vé đang được trả về trạng thái trước đó."}</p></div>
        ) : sagaId ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200"><FiLoader className="animate-spin text-blue-600" /> Đang khóa vé và gửi lời mời…</div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email người nhận</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="nguoinhan@example.com" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Lời nhắn <span className="font-normal text-slate-400">(không bắt buộc)</span></label>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={300} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Gửi một lời nhắn cùng vé…" />
            </div>
            <div className="flex gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200"><FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p>Vé sẽ bị khóa check-in trong lúc chờ người nhận xác nhận. Mã QR mới được tạo sau khi chuyển vé thành công.</p></div>
          </>
        )}
        {submitError && <p className="text-xs text-rose-600">{submitError}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2.5 border-t border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:-mx-6 sm:-mb-6 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{waitingRecipient || completed || failed ? "Đóng" : "Hủy"}</button>
          {!sagaId && <button type="button" onClick={submit} disabled={!emailValid || submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><span className="inline-flex items-center gap-1.5">{submitting ? <FiLoader className="animate-spin" /> : <FiGift />} Xác nhận tặng vé</span></button>}
        </div>
      </div>
    </ModalShell>
  );
}
