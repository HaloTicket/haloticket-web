import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowDown } from "react-icons/fi";

type LegalDocument = "terms" | "privacy";

const documents: Record<LegalDocument, { title: string; sections: Array<[string, string]> }> = {
  terms: {
    title: "Điều khoản sử dụng",
    sections: [
    [
        "1. Phạm vi và đối tượng áp dụng",
        "Điều khoản này áp dụng chung cho các cá nhân, tổ chức truy cập hoặc sử dụng website và ứng dụng HaloTicket, bao gồm khách hàng mua vé, người tham dự và nhà tổ chức sự kiện. Các đối tượng này được gọi chung là “Người dùng”. HaloTicket cung cấp các công cụ giới thiệu sự kiện, đăng bán, đặt vé, thanh toán, quản lý vé, kiểm soát tham dự và hỗ trợ giao dịch.\n\nTrước khi sử dụng dịch vụ, Người dùng cần đọc các điều khoản, chính sách bảo mật và điều kiện của từng sự kiện. Người dùng cam kết sử dụng dịch vụ trung thực, hợp pháp và chịu trách nhiệm về thông tin mình cung cấp. Các nghĩa vụ dành riêng cho khách hàng hoặc nhà tổ chức chỉ áp dụng khi Người dùng thực hiện vai trò tương ứng."
    ],
    [
        "2. Cập nhật điều khoản và thỏa thuận riêng",
        "HaloTicket có thể sửa đổi, bổ sung điều khoản và công bố phiên bản cập nhật trên hệ thống. Người dùng nên kiểm tra nội dung khi thực hiện giao dịch hoặc đăng sự kiện. Những thay đổi ảnh hưởng đến quyền và nghĩa vụ của các bên được áp dụng theo thời điểm công bố và các quy định liên quan.\n\nCác thỏa thuận dịch vụ riêng với nhà tổ chức, điều kiện bán vé, thông báo phí và chính sách của sự kiện là những thông tin cần được đọc cùng điều khoản này. Trường hợp có nội dung khác nhau, các bên đối chiếu thỏa thuận cụ thể và quy định áp dụng để xác định cách thực hiện."
    ],
    [
        "3. Đăng ký và xác thực thông tin",
        "Người dùng phải có năng lực phù hợp để thực hiện giao dịch; người chưa đủ tuổi cần được cha mẹ hoặc người giám hộ hỗ trợ theo quy định. Khi đăng ký, Người dùng cung cấp thông tin xác thực, cập nhật khi thay đổi và bảo đảm có quyền sử dụng thông tin đã khai báo.\n\nNhà tổ chức cung cấp thông tin định danh, tên và địa chỉ, thông tin doanh nghiệp hoặc mã số thuế khi được yêu cầu, thông tin liên hệ và thông tin phục vụ đối soát. Việc đại diện một tổ chức phải được ủy quyền hợp lệ. HaloTicket có thể yêu cầu bổ sung tài liệu khi cần xác minh tư cách tài khoản hoặc giao dịch."
    ],
    [
        "4. Tài khoản, mật khẩu và an toàn truy cập",
        "Người dùng chịu trách nhiệm bảo quản mật khẩu, mã OTP, email và các phương tiện xác thực; không cung cấp thông tin đăng nhập cho người không có thẩm quyền. Khi sử dụng thiết bị dùng chung, cần đăng xuất sau khi hoàn thành công việc.\n\nNếu phát hiện truy cập trái phép, lộ thông tin hoặc giao dịch bất thường, Người dùng cần thông báo ngay qua kênh hỗ trợ được công bố và phối hợp xác minh. Nhà tổ chức cần phân quyền nhân sự phù hợp, thu hồi quyền khi nhân sự ngừng nhiệm vụ và kiểm soát việc xuất dữ liệu từ tài khoản."
    ],
    [
        "5. Quyền sử dụng và hành vi bị cấm",
        "Người dùng được sử dụng các tính năng được cấp để tìm kiếm, mua và quản lý vé hoặc đăng bán, quảng bá và quản lý sự kiện của mình. Không được khai thác dịch vụ ngoài phạm vi được cho phép, chuyển nhượng quyền truy cập hoặc nhân danh bên thứ ba trái phép.\n\nNghiêm cấm giả mạo thông tin, tạo đơn hoặc đánh giá ảo, lạm dụng ưu đãi bằng nhiều tài khoản, giao dịch gian lận, phát tán mã độc, thu thập dữ liệu trái phép, gây quá tải hoặc can thiệp vào hệ thống. Không sao chép, phân phối, dịch ngược phần mềm hoặc xóa thông báo sở hữu trí tuệ khi chưa được phép."
    ],
    [
        "6. Công bố và quản lý sự kiện",
        "Nhà tổ chức chịu trách nhiệm về tính hợp pháp, độ chính xác và đầy đủ của tên sự kiện, nội dung, hình ảnh, địa điểm, lịch diễn, số lượng vé, giá bán và điều kiện tham dự. Các giấy phép, quyền khai thác nội dung và điều kiện tổ chức cần được đáp ứng trước khi triển khai hoạt động liên quan.\n\nThông tin về chính sách thanh toán, đổi trả, hoàn tiền, giới hạn độ tuổi, kiểm tra giấy tờ và quy định tại địa điểm phải được công bố rõ ràng. Khi có thay đổi, nhà tổ chức cần cập nhật kịp thời, thông báo cho HaloTicket và người mua, đồng thời phối hợp giải quyết các quyền lợi phát sinh."
    ],
    [
        "7. Đặt vé và xác nhận đơn hàng",
        "Khách hàng cần kiểm tra sự kiện, ngày giờ, hạng vé, chỗ ngồi, số lượng, thông tin người nhận và tổng tiền trước khi xác nhận. Việc giữ vé có thể có thời hạn; đơn chưa hoàn tất thanh toán có thể hết hiệu lực theo thông báo trên hệ thống.\n\nĐơn hàng được xử lý theo trạng thái giao dịch và thông báo xác nhận. Nếu xảy ra sai giá, sai số lượng hoặc sự cố kỹ thuật, HaloTicket phối hợp với các bên để kiểm tra, thông báo hướng xử lý và đối chiếu số tiền đã ghi nhận. Khách hàng nên kiểm tra đơn hiện có trước khi thanh toán lại."
    ],
    [
        "8. Thanh toán, phí và đối soát",
        "Phương thức thanh toán, tiền vé, phí dịch vụ và ưu đãi được thể hiện trong quá trình giao dịch. Người dùng cần bảo đảm có quyền sử dụng phương tiện thanh toán và tuân thủ quy định của đơn vị cung cấp dịch vụ thanh toán. Chứng từ giao dịch và mã đơn cần được lưu để phục vụ tra soát.\n\nVới nhà tổ chức, mức phí, thuế, lịch đối soát, chứng từ, khoản giữ lại hoặc điều chỉnh và cách thanh toán doanh thu thực hiện theo thỏa thuận dịch vụ và thông tin công bố. Sai lệch đối soát cần được phản ánh kèm tài liệu liên quan để xác minh trước khi chốt số liệu."
    ],
    [
        "9. Vé điện tử và kiểm soát tham dự",
        "Khách hàng nhận và sử dụng vé theo hướng dẫn trên hệ thống. Mã QR, mã vạch và thông tin đơn hàng cần được giữ an toàn; không công khai hình ảnh vé có thể dùng để vào cổng. Việc có nhiều bản sao không tạo thêm quyền tham dự.\n\nNhà tổ chức có thể kiểm tra tính hợp lệ của vé, trạng thái sử dụng và giấy tờ cần thiết theo điều kiện sự kiện. Vé đã sử dụng, bị chỉnh sửa, giả mạo hoặc có nguồn gốc không xác minh được có thể bị từ chối. Các bên phối hợp tra soát khi có tranh chấp về quyền sử dụng vé."
    ],
    [
        "10. Chuyển nhượng, đổi vé và sử dụng thương mại",
        "Việc tặng, chuyển nhượng hoặc bán lại vé chỉ được thực hiện khi sự kiện và tính năng tương ứng cho phép. Khách hàng cần kiểm tra hạn chế chuyển nhượng, điều kiện đổi thông tin người tham dự và các khoản phí liên quan trước khi thực hiện.\n\nKhông sử dụng vé, nhãn hiệu hoặc nội dung sự kiện để tổ chức chương trình quảng cáo, khuyến mại, cuộc thi hoặc phân phối thương mại trái phép. Vé mua qua nguồn bên ngoài không được mặc nhiên xem là hợp lệ; Người dùng cần tự kiểm tra kênh phân phối được cho phép."
    ],
    [
        "11. Hoãn, hủy sự kiện và hoàn tiền",
        "Nhà tổ chức phải công bố chính sách xử lý khi sự kiện thay đổi, bị hoãn hoặc hủy, đồng thời thông báo cho HaloTicket và khách hàng ngay khi có quyết định. Thông báo cần nêu lịch thay thế nếu có, phạm vi vé bị ảnh hưởng, phương thức yêu cầu và kế hoạch giải quyết.\n\nKhách hàng thực hiện yêu cầu hoàn hoặc đổi theo chính sách sự kiện và hướng dẫn được công bố. Nhà tổ chức chịu trách nhiệm phối hợp xác nhận, cung cấp nguồn tiền và xử lý quyền lợi thuộc trách nhiệm của mình. Các khoản phí, phương thức và thời gian hoàn được thông báo trong quá trình xử lý; không mặc nhiên áp dụng một chính sách chung cho mọi sự kiện."
    ],
    [
        "12. Quyền và trách nhiệm của các bên",
        "Khách hàng có quyền tiếp cận thông tin cần thiết để quyết định mua vé, quản lý giao dịch và gửi phản ánh; đồng thời có trách nhiệm cung cấp dữ liệu chính xác, thanh toán hợp lệ và tuân thủ quy định tham dự.\n\nNhà tổ chức có quyền sử dụng công cụ được cấp để quản lý sự kiện và giao dịch, nhận hỗ trợ và đóng góp ý kiến. Nhà tổ chức chịu trách nhiệm đối với chương trình, chất lượng dịch vụ, thông tin bán vé và xử lý khiếu nại liên quan đến sự kiện của mình.\n\nHaloTicket vận hành công cụ nền tảng, hướng dẫn sử dụng, tiếp nhận phản ánh và phối hợp cung cấp thông tin để xử lý giao dịch trong phạm vi dịch vụ đã thỏa thuận."
    ],
    [
        "13. Nội dung, phản hồi và sở hữu trí tuệ",
        "Người dùng chịu trách nhiệm về nội dung, nhận xét, hình ảnh và tài liệu đăng tải. Nhà tổ chức bảo đảm có quyền sử dụng các nội dung sự kiện và không xâm phạm quyền của người khác. Việc cung cấp nội dung cho nền tảng phải phù hợp với mục đích giới thiệu, bán vé và hỗ trợ sự kiện.\n\nQuyền đối với phần mềm, giao diện, nhãn hiệu và tài liệu HaloTicket thuộc các chủ thể quyền tương ứng. Người dùng không được khai thác trái phép hoặc loại bỏ dấu hiệu sở hữu. Quyền đối với dữ liệu cá nhân được xử lý theo chính sách bảo mật và quy định áp dụng, tách biệt với quyền sở hữu nội dung sự kiện."
    ],
    [
        "14. Bảo mật thông tin và dữ liệu cá nhân",
        "Việc thu thập, sử dụng, lưu trữ và chia sẻ thông tin được trình bày tại Chính sách bảo mật thông tin cá nhân của HaloTicket. Người dùng cần đọc chính sách này khi cung cấp dữ liệu của mình hoặc của người nhận vé.\n\nNhà tổ chức chỉ sử dụng thông tin người tham dự trong phạm vi cần thiết để thực hiện sự kiện và hỗ trợ giao dịch, quản lý người được truy cập và bảo vệ dữ liệu đã nhận. Thông tin đối soát, tài liệu nội bộ và nội dung thỏa thuận không công khai cần được bảo mật, trừ trường hợp được phép hoặc pháp luật yêu cầu cung cấp."
    ],
    [
        "15. Hạn chế truy cập và chấm dứt sử dụng",
        "HaloTicket có thể kiểm tra, giới hạn tính năng, tạm dừng đăng bán hoặc khóa tài khoản khi có căn cứ về thông tin giả mạo, gian lận, vi phạm điều khoản, nguy cơ mất an toàn hoặc yêu cầu hợp pháp của cơ quan có thẩm quyền. Việc khôi phục được xem xét sau khi xác minh và xử lý nguyên nhân liên quan.\n\nNgười dùng có thể ngừng sử dụng và gửi yêu cầu xóa tài khoản hoặc dữ liệu qua kênh hỗ trợ. Việc đóng tài khoản không tự động hủy các nghĩa vụ thanh toán, hoàn tiền, đối soát, khiếu nại hoặc lưu trữ dữ liệu cần thiết đang tồn tại."
    ],
    [
        "16. Bảo trì, gián đoạn và trách nhiệm",
        "Dịch vụ có thể bị gián đoạn do bảo trì, lỗi kỹ thuật, kết nối hoặc sự kiện ngoài khả năng kiểm soát. Người dùng cần lưu các thông báo và kiểm tra trạng thái đơn khi gặp sự cố để hỗ trợ đối chiếu sau đó.\n\nTrách nhiệm của mỗi bên được xác định theo phạm vi công việc, nguyên nhân, mức độ lỗi, thiệt hại thực tế, thỏa thuận cụ thể và quy định áp dụng. Nhà tổ chức chịu trách nhiệm về thông tin và hoạt động tổ chức thuộc quyền kiểm soát của mình; các bên cần phối hợp hạn chế thiệt hại và bảo vệ quyền lợi người mua."
    ],
    [
        "17. Khiếu nại và giải quyết tranh chấp",
        "Người dùng gửi phản ánh qua kênh hỗ trợ được công bố trên HaloTicket, kèm mã đơn hoặc mã sự kiện, diễn biến sự việc, tài liệu chứng minh và yêu cầu giải quyết. Không gửi mật khẩu, mã OTP hoặc thông tin thanh toán nhạy cảm không cần thiết.\n\nHaloTicket, khách hàng và nhà tổ chức phối hợp xác minh, đối chiếu dữ liệu và ưu tiên thương lượng. Nếu không đạt được phương án thống nhất, các bên có thể sử dụng cơ chế giải quyết tranh chấp phù hợp theo thỏa thuận hợp lệ và pháp luật Việt Nam."
    ],
    [
        "18. Hiệu lực và liên hệ",
        "Nếu một phần điều khoản không thể áp dụng, các nội dung còn lại tiếp tục được thực hiện trong phạm vi phù hợp. Các nghĩa vụ cần thiết về thanh toán, hoàn tiền, bảo mật và giải quyết tranh chấp vẫn được xem xét sau khi ngừng sử dụng dịch vụ.\n\nMọi yêu cầu về tài khoản, giao dịch, sự kiện và điều khoản được gửi qua các kênh liên hệ chính thức được công bố trên HaloTicket. Nội dung chung này được biên tập từ tài liệu do người dùng cung cấp; các điều kiện riêng của giao dịch hoặc sự kiện cần được thông báo rõ ràng trước khi thực hiện."
    ]
]
  },
  privacy: {
    title: "Chính sách bảo mật thông tin cá nhân",
    sections: [
      ["1. Thông tin được thu thập", "HaloTicket có thể thu thập thông tin tài khoản, thông tin liên hệ, lịch sử đơn hàng, thông tin thiết bị và dữ liệu cần thiết để cung cấp dịch vụ."],
      ["2. Mục đích sử dụng", "Thông tin được dùng để xác thực tài khoản, xử lý đặt vé và thanh toán, gửi thông báo giao dịch, hỗ trợ khách hàng, bảo vệ an toàn hệ thống và cải thiện trải nghiệm."],
      ["3. Chia sẻ thông tin", "Thông tin chỉ được chia sẻ ở mức cần thiết với ban tổ chức sự kiện, đơn vị thanh toán, nhà cung cấp dịch vụ hỗ trợ hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu."],
      ["4. Bảo vệ dữ liệu", "HaloTicket áp dụng các biện pháp kỹ thuật và quản trị phù hợp để bảo vệ dữ liệu khỏi truy cập, sử dụng hoặc tiết lộ trái phép. Bạn cần bảo vệ mật khẩu và mã xác thực của mình."],
      ["5. Thời hạn lưu trữ", "Dữ liệu được lưu trong thời gian cần thiết cho mục đích cung cấp dịch vụ, giải quyết tranh chấp, thực hiện nghĩa vụ pháp lý và bảo vệ quyền lợi hợp pháp của các bên."],
      ["6. Quyền của bạn", "Bạn có thể yêu cầu xem, cập nhật hoặc chỉnh sửa thông tin cá nhân, cũng như yêu cầu hỗ trợ về việc sử dụng dữ liệu theo quy định áp dụng."],
      ["7. Cookie và công nghệ tương tự", "HaloTicket có thể sử dụng cookie để ghi nhớ lựa chọn, duy trì phiên đăng nhập, đo lường hiệu quả và cải thiện dịch vụ. Bạn có thể điều chỉnh cookie trong trình duyệt."],
      ["8. Cập nhật chính sách", "Chính sách có thể được cập nhật khi dịch vụ hoặc quy định pháp luật thay đổi. Nội dung mới sẽ được công bố trên hệ thống và có hiệu lực từ thời điểm đăng tải."],
      ["9. Lựa chọn về dữ liệu", "Bạn có thể hỏi về phạm vi xử lý và gửi yêu cầu liên quan đến sự đồng ý. Một số dữ liệu vẫn cần được giữ để xử lý giao dịch hoặc nghĩa vụ pháp lý."],
      ["10. Nhà cung cấp hỗ trợ", "Đối tác kỹ thuật chỉ nên tiếp cận dữ liệu cần cho công việc được giao. Việc sử dụng thông tin phải gắn với mục đích cung cấp dịch vụ."],
      ["11. Tiếp nhận yêu cầu", "Yêu cầu chỉnh sửa hoặc xóa dữ liệu cần xác định tài khoản và phạm vi thông tin. Có thể cần xác minh danh tính để tránh cung cấp dữ liệu cho người khác."],
      ["12. Phản ánh sự cố", "Nếu nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật khẩu và báo bộ phận hỗ trợ. Không cung cấp mã xác thực qua tin nhắn không rõ nguồn gốc."],
      ["13. Thông tin của người khác", "Khi cung cấp thông tin người nhận vé, hãy bảo đảm bạn được phép chia sẻ và chỉ nhập dữ liệu cần thiết cho giao dịch."],
    ],
  },
};

export default function TermsNotice() {
  useTranslation();
  const [documentType, setDocumentType] = useState<LegalDocument>();
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const activeDocument = documentType ? documents[documentType] : undefined;

  function openDocument(type: LegalDocument) {
    setHasReachedEnd(false);
    setDocumentType(type);
  }

  function checkScrollEnd() {
    const content = contentRef.current;
    if (content && content.scrollHeight - content.clientHeight - content.scrollTop <= 4) {
      setHasReachedEnd(true);
    }
  }

  useEffect(() => {
    if (!documentType) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && hasReachedEnd) setDocumentType(undefined);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    checkScrollEnd();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [documentType, hasReachedEnd]);

  return (
    <>
      <p className="auth-terms">
        {translate("Bằng việc tiếp tục, bạn đã đọc và đồng ý với")} {" "}
        <button type="button" className="auth-legal-link" onClick={() => openDocument("terms")}>
          {translate("Điều khoản sử dụng")}
        </button>{" "}{translate("và")} {" "}
        <button type="button" className="auth-legal-link" onClick={() => openDocument("privacy")}>
          {translate("Chính sách bảo mật thông tin cá nhân")}
        </button>{" "}{translate("của HaloTicket.")}
      </p>

      {activeDocument && createPortal(
        <div className="auth-legal-backdrop" role="presentation" onMouseDown={() => { if (hasReachedEnd) setDocumentType(undefined); }}>
          <section className="auth-legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="auth-legal-header">
              <div><p className="auth-eyebrow">HaloTicket</p><h2 id="legal-modal-title">{translate(activeDocument.title)}</h2></div>
              <button type="button" className="auth-legal-close" disabled={!hasReachedEnd} aria-label={translate("Đóng")} onClick={() => setDocumentType(undefined)}>×</button>
            </header>
            <div className="auth-legal-content" ref={contentRef} onScroll={checkScrollEnd}>
              {activeDocument.sections.map(([heading, body]) => <article key={heading}><h3>{translate(heading)}</h3><p>{translate(body)}</p></article>)}
              <p className="auth-legal-updated">{translate("Phiên bản tham khảo của HaloTicket")}</p>
            </div>
            {!hasReachedEnd && <div className="auth-legal-scroll-hint">
              <button type="button" className="auth-legal-scroll-button" aria-label={translate("Cuộn xuống cuối")} onClick={() => contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" })}><FiArrowDown aria-hidden="true" /></button>
            </div>}
            <footer className="auth-legal-footer">
              <button type="button" disabled={!hasReachedEnd} className="auth-button auth-legal-done" onClick={() => setDocumentType(undefined)}>{translate("Đã hiểu")}</button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
