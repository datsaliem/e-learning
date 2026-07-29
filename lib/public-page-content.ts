export interface PublicPageSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface PublicPageContent {
  eyebrow: string;
  title: string;
  description: string;
  sections: PublicPageSection[];
  notice?: string;
}

export const PUBLIC_PAGE_CONTENT = {
  help: {
    eyebrow: "Hỗ trợ",
    title: "Trung tâm trợ giúp",
    description:
      "Thông tin nhanh để xử lý các vấn đề thường gặp khi đăng nhập, học tập và sử dụng chứng chỉ.",
    sections: [
      {
        title: "Tài khoản và đăng nhập",
        items: [
          "Kiểm tra cả thư mục Spam nếu chưa thấy email xác nhận.",
          "Dùng trang Quên mật khẩu để nhận liên kết đặt lại mật khẩu mới.",
          "Không chia sẻ mật khẩu, mã xác nhận hoặc thông tin thanh toán cho bất kỳ ai.",
        ],
      },
      {
        title: "Khoá học và tiến độ",
        items: [
          "Khoá học đã ghi danh xuất hiện trong mục Khoá học của tôi.",
          "Tiến độ được lưu tự động trong lúc xem bài học.",
          "Nếu nội dung chưa cập nhật, hãy tải lại trang và kiểm tra kết nối mạng.",
        ],
      },
      {
        title: "Chứng chỉ",
        paragraphs: [
          "Mỗi chứng chỉ có một mã xác minh riêng. Bạn có thể nhập mã tại trang Xác minh chứng chỉ để kiểm tra trạng thái.",
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Hỗ trợ",
    title: "Liên hệ hỗ trợ",
    description:
      "Chuẩn bị đúng thông tin giúp đội ngũ vận hành xác định vấn đề nhanh và an toàn hơn.",
    sections: [
      {
        title: "Thông tin nên cung cấp",
        items: [
          "Email dùng để đăng ký tài khoản.",
          "Đường dẫn khoá học hoặc bài học đang gặp lỗi.",
          "Ảnh chụp màn hình và thời điểm lỗi xảy ra.",
          "Tên trình duyệt và thiết bị đang sử dụng.",
        ],
      },
      {
        title: "Thông tin không nên gửi",
        items: [
          "Mật khẩu hoặc mã xác nhận đăng nhập.",
          "Số thẻ đầy đủ, mã bảo mật hoặc thông tin ngân hàng nhạy cảm.",
          "Khoá API, access token hoặc dữ liệu riêng tư không liên quan.",
        ],
      },
      {
        title: "Kênh hỗ trợ",
        paragraphs: [
          "Phiên bản demo chưa tiếp nhận yêu cầu qua biểu mẫu công khai. Bạn có thể xem Trung tâm trợ giúp và Câu hỏi thường gặp trong thời gian kênh hỗ trợ chính thức được hoàn thiện.",
        ],
      },
    ],
  },
  faq: {
    eyebrow: "Hỗ trợ",
    title: "Câu hỏi thường gặp",
    description: "Giải đáp ngắn gọn các câu hỏi phổ biến của học viên và giảng viên.",
    sections: [
      {
        title: "Tôi chưa nhận được email xác nhận?",
        paragraphs: [
          "Hãy kiểm tra thư mục Spam, xác nhận địa chỉ email đã nhập đúng và chờ vài phút trước khi thử đăng ký lại.",
        ],
      },
      {
        title: "Khoá học đã mua nằm ở đâu?",
        paragraphs: [
          "Sau khi thanh toán được xác nhận, khoá học sẽ xuất hiện trong mục Khoá học của tôi của đúng tài khoản đã thanh toán.",
        ],
      },
      {
        title: "Tiến độ học có được lưu tự động không?",
        paragraphs: [
          "Có. Trang học định kỳ lưu thời lượng đã xem và cập nhật trạng thái hoàn thành khi bạn đạt điều kiện của bài học.",
        ],
      },
      {
        title: "Tôi có thể học trên điện thoại không?",
        paragraphs: [
          "Có. Giao diện được tối ưu cho máy tính, máy tính bảng và điện thoại hiện đại.",
        ],
      },
      {
        title: "Làm sao để trở thành giảng viên?",
        paragraphs: [
          "Xem trang Trở thành giảng viên để biết quy trình chuẩn bị hồ sơ và nội dung khoá học.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Pháp lý",
    title: "Điều khoản dịch vụ",
    description: "Các nguyên tắc cơ bản khi sử dụng nền tảng E-Learning.",
    notice:
      "Đây là nội dung tham khảo cho phiên bản demo; cần được rà soát pháp lý trước khi vận hành thương mại.",
    sections: [
      {
        title: "Tài khoản",
        items: [
          "Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập của mình.",
          "Không sử dụng tài khoản để xâm phạm quyền của người khác hoặc phá hoại hệ thống.",
          "Thông tin hồ sơ cần chính xác khi dùng cho ghi danh và cấp chứng chỉ.",
        ],
      },
      {
        title: "Nội dung học tập",
        items: [
          "Nội dung khoá học chỉ dành cho mục đích học tập của người đã được cấp quyền.",
          "Không sao chép, phát tán hoặc bán lại tài liệu nếu chưa có sự đồng ý.",
          "Giảng viên chịu trách nhiệm về quyền sử dụng nội dung mình đăng tải.",
        ],
      },
      {
        title: "Giới hạn trách nhiệm",
        paragraphs: [
          "Nền tảng nỗ lực duy trì dịch vụ ổn định nhưng không cam kết mọi chức năng luôn không gián đoạn trong giai đoạn thử nghiệm.",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Pháp lý",
    title: "Chính sách bảo mật",
    description: "Tóm tắt cách dữ liệu tài khoản và dữ liệu học tập được sử dụng.",
    notice:
      "Đây là nội dung tham khảo cho phiên bản demo; cần được rà soát pháp lý trước khi vận hành thương mại.",
    sections: [
      {
        title: "Dữ liệu được xử lý",
        items: [
          "Thông tin tài khoản và hồ sơ do người dùng cung cấp.",
          "Dữ liệu ghi danh, tiến độ bài học và chứng chỉ.",
          "Thông tin kỹ thuật cần thiết để bảo mật và vận hành dịch vụ.",
        ],
      },
      {
        title: "Mục đích sử dụng",
        items: [
          "Xác thực tài khoản và phân quyền truy cập.",
          "Cung cấp khoá học, lưu tiến độ và cấp chứng chỉ.",
          "Phát hiện lỗi, gian lận và các hoạt động gây hại.",
        ],
      },
      {
        title: "Bảo vệ dữ liệu",
        paragraphs: [
          "Dữ liệu được giới hạn truy cập theo vai trò và quyền sở hữu. Khoá quản trị không được đưa vào mã chạy phía trình duyệt.",
        ],
      },
    ],
  },
  "refund-policy": {
    eyebrow: "Pháp lý",
    title: "Chính sách hoàn tiền",
    description: "Nguyên tắc tiếp nhận và xem xét yêu cầu hoàn tiền cho khoá học.",
    notice:
      "Đây là nội dung tham khảo cho phiên bản demo; cần được rà soát pháp lý trước khi vận hành thương mại.",
    sections: [
      {
        title: "Điều kiện xem xét",
        items: [
          "Giao dịch đã được thanh toán thành công và có mã đơn hàng hợp lệ.",
          "Yêu cầu nêu rõ lý do cùng thông tin tài khoản đã mua khoá học.",
          "Nội dung khoá học chưa bị sử dụng vượt quá giới hạn do chính sách thương mại quy định.",
        ],
      },
      {
        title: "Quy trình",
        items: [
          "Yêu cầu được đối chiếu với đơn hàng và tiến độ học.",
          "Kết quả được thông báo qua kênh liên hệ đã xác minh.",
          "Thời gian tiền về phụ thuộc vào nhà cung cấp thanh toán và ngân hàng.",
        ],
      },
      {
        title: "Giao dịch thử nghiệm",
        paragraphs: [
          "Không nhập thông tin thanh toán thật khi website đang ở chế độ demo hoặc chưa công bố kênh thanh toán chính thức.",
        ],
      },
    ],
  },
} as const satisfies Record<string, PublicPageContent>;

export type PublicPageSlug = keyof typeof PUBLIC_PAGE_CONTENT;

export function isPublicPageSlug(value: string): value is PublicPageSlug {
  return Object.hasOwn(PUBLIC_PAGE_CONTENT, value);
}
