import React from "react";
import { FiPlus, FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { CustomQuestionItem } from "@/types/organizer";

interface Step4CustomQuestionsProps {
  questionScope: "order" | "ticket";
  setQuestionScope: (v: "order" | "ticket") => void;
  questions: CustomQuestionItem[];
  setQuestions: React.Dispatch<React.SetStateAction<CustomQuestionItem[]>>;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step4CustomQuestions: React.FC<Step4CustomQuestionsProps> = ({
  questionScope,
  setQuestionScope,
  questions,
  setQuestions,
  onAddQuestion,
  onDeleteQuestion,
  onBack,
  onNext
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4">
          Tạo bảng câu hỏi cho người mua vé
        </h3>

        {/* Question scope */}
        <div className="space-y-2">
          <label className="text-xs font-bold app-text-main">Phạm vi áp dụng câu hỏi</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              onClick={() => setQuestionScope("order")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${questionScope === "order"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40"
                  : "app-bg-subnav app-border"
                }`}
            >
              <span className="text-sm font-extrabold app-text-main block mb-1">
                Cho cả đơn hàng
              </span>
              <span className="text-xs app-text-muted">
                Người mua vé chỉ trả lời danh sách câu hỏi 1 lần duy nhất trên mỗi đơn.
              </span>
            </label>

            <label
              onClick={() => setQuestionScope("ticket")}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${questionScope === "ticket"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40"
                  : "app-bg-subnav app-border"
                }`}
            >
              <span className="text-sm font-extrabold app-text-main block mb-1">
                Cho từng vé mua
              </span>
              <span className="text-xs app-text-muted">
                Người mua vé sẽ điền thông tin tương ứng với số lượng vé họ mua.
              </span>
            </label>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold app-text-main">Danh sách câu hỏi thu thập</h4>
            <button
              type="button"
              onClick={onAddQuestion}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FiPlus className="w-4 h-4" />
              <span>Tạo câu hỏi</span>
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl app-bg-subnav border app-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold app-text-brand uppercase">
                    Câu {idx + 1}: Câu hỏi dạng văn bản
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(q.id)}
                    className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={q.title}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[idx].title = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full app-bg-card app-text-main text-sm rounded-xl px-4 py-2.5 border app-border font-bold"
                  placeholder="Nhập tiêu đề câu hỏi..."
                />

                <input
                  type="text"
                  value={q.description}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[idx].description = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full app-bg-card app-text-main text-xs rounded-xl px-4 py-2 border app-border"
                  placeholder="Nhập ghi chú hướng dẫn trả lời..."
                />

                <label className="flex items-center gap-2 text-xs font-bold app-text-main cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={q.isRequired}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].isRequired = e.target.checked;
                      setQuestions(updated);
                    }}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <span>Bắt buộc người tham gia phải trả lời</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stepper Nav Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 app-bg-subnav app-text-main font-extrabold text-sm rounded-xl border app-border flex items-center gap-2 cursor-pointer"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <span>Tiếp tục: Thông tin thanh toán</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step4CustomQuestions;
