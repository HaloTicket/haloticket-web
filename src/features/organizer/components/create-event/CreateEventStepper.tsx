import { useTranslation } from "react-i18next";
import React from "react";
import { FiAlertCircle, FiCheck, FiChevronRight } from "react-icons/fi";

interface CreateEventStepperProps {
  stepTitles: string[];
  currentStep: number;
  onStepClick: (stepNum: number) => void;
  flaggedSteps?: number[];
}

export const CreateEventStepper: React.FC<CreateEventStepperProps> = ({
  stepTitles,
  currentStep,
  onStepClick,
  flaggedSteps = []
}) => {
  const { t: translate } = useTranslation();
  return (
    <div className="w-full app-bg-card border app-border rounded-2xl p-4 md:p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar pb-2 md:pb-0 gap-4">
        {stepTitles.map((stTitle, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;
          const isFlagged = flaggedSteps.includes(stepNum);

          return (
            <button
              key={stTitle}
              type="button"
              onClick={() => onStepClick(stepNum)}
              aria-current={isActive ? "step" : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap cursor-pointer transition-all ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-extrabold"
                  : isCompleted
                  ? "text-blue-600 dark:text-blue-400 font-bold opacity-90"
                  : "app-text-muted hover:app-text-main font-medium"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isActive
                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md scale-110"
                    : isCompleted
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : "app-bg-subnav app-text-muted border app-border"
                }`}
              >
                {isCompleted ? <FiCheck className="w-4 h-4" /> : stepNum}
              </div>
              <span className="text-xs md:text-sm">{translate(stTitle)}</span>
              {isFlagged && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white" title={translate("Cần chỉnh sửa")}>
                  <FiAlertCircle className="h-3 w-3" aria-hidden="true" />
                  <span>{translate("Cần chỉnh sửa")}</span>
                </span>
              )}
              {idx < stepTitles.length - 1 && (
                <FiChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 shrink-0 ml-2 hidden md:block" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CreateEventStepper;
