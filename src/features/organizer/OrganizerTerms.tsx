import React, { useState } from "react";
import { FiChevronRight, FiChevronDown, FiShield, FiCheckCircle } from "react-icons/fi";

export const OrganizerTerms: React.FC = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  const termSections = [
    {
      id: 1,
      title: "1. Danh mục hàng hoá, dịch vụ cấm kinh doanh",
      details: [
        "Vũ khí quân dụng, trang thiết bị kỹ thuật, khí tài, phương tiện chuyên dùng quân sự, công an; quân trang (bao gồm cả huy hiệu, cấp hiệu, quân hiệu của quân đội, công an), quân dụng cho lực lượng vũ trang.",
        "Các chất ma túy, chất kích thích nhân tạo bị cấm theo quy định của pháp luật Việt Nam.",
        "Các sản phẩm văn hóa nguy hại, đồi trụy, phản động, xâm phạm an ninh quốc gia.",
        "Dịch vụ tổ chức đánh bạc, cá độ trái phép dưới mọi hình thức."
      ]
    },
    {
      id: 2,
      title: "2. Danh mục hàng hóa, dịch vụ cấm quảng cáo",
      details: [
        "Hàng hóa, dịch vụ cấm kinh doanh theo quy định của pháp luật.",
        "Thuốc lá, rượu có nồng độ cồn từ 15 độ trở lên.",
        "Sản phẩm sữa thay thế sữa mẹ dùng cho trẻ dưới 24 tháng tuổi, sản phẩm dinh dưỡng bổ sung dùng cho trẻ dưới 06 tháng tuổi.",
        "Thuốc kê đơn; thuốc không kê đơn nhưng được cơ quan nhà nước có thẩm quyền khuyến cáo hạn chế sử dụng hoặc sử dụng có sự giám sát của bác sĩ."
      ]
    },
    {
      id: 3,
      title: "3. Quy định kiểm duyệt nội dung & hình ảnh",
      details: [
        "Không đính kèm thông tin liên lạc cá nhân của Ban Tổ Chức (Số điện thoại, Email, Link Facebook, Zalo...) trực tiếp lên Banner hoặc mô tả sự kiện. Mọi liên hệ giải đáp vé phải thông qua Hotline HaloTicket 1900.6408.",
        "Hình ảnh Poster/Banner phải đạt độ phân giải chuẩn, không chứa nhãn hiệu vi phạm bản quyền hoặc hình ảnh phản cảm.",
        "Sự kiện công khai sẽ được Ban Quản Trị duyệt trong vòng 24 giờ kể từ thời điểm gửi yêu cầu thành công."
      ]
    }
  ];

  const toggleSection = (id: number) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">

      {/* Main Container Card */}
      <div className="w-full max-w-4xl app-bg-card border app-border rounded-2xl p-4 md:p-6 shadow-sm space-y-3">
        {termSections.map((sec) => {
          const isOpen = openSection === sec.id;
          return (
            <div
              key={sec.id}
              className="border app-border rounded-xl overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="w-full p-4 md:p-5 app-bg-subnav hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FiShield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-sm font-extrabold app-text-main">
                    {sec.title}
                  </span>
                </div>
                {isOpen ? (
                  <FiChevronDown className="w-5 h-5 app-text-muted shrink-0" />
                ) : (
                  <FiChevronRight className="w-5 h-5 app-text-muted shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="p-5 app-bg-card border-t app-border space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-2.5">
                    {sec.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs app-text-main leading-relaxed">
                        <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizerTerms;
