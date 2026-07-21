import type { CourseCurriculumSection, CourseReview } from "@/features/courses/types";

/** Nội dung chi tiết theo course id — tách riêng khỏi services.ts cho dễ đọc. */
export const COURSE_DETAILS: Record<
  string,
  {
    longDescription: string;
    objectives: string[];
    requirements: string[];
    curriculum: CourseCurriculumSection[];
  }
> = {
  "course-1": {
    longDescription:
      "Khoá học đưa bạn từ nền tảng React đến việc xây dựng một ứng dụng full-stack hoàn chỉnh bằng Next.js App Router và TypeScript. Bạn sẽ thực hành xây dựng tính năng xác thực, cơ sở dữ liệu và triển khai sản phẩm thực tế lên production với Supabase và Vercel.",
    objectives: [
      "Xây dựng ứng dụng full-stack với Next.js App Router",
      "Viết code an toàn, dễ bảo trì với TypeScript",
      "Tích hợp xác thực và cơ sở dữ liệu với Supabase",
      "Triển khai ứng dụng lên production với Vercel",
    ],
    requirements: [
      "Đã biết HTML, CSS, JavaScript cơ bản",
      "Có kiến thức nền tảng về React",
      "Máy tính cài sẵn Node.js",
    ],
    curriculum: [
      {
        id: "c1-s1",
        title: "Làm quen với Next.js App Router",
        lessons: [
          {
            id: "c1-s1-l1",
            title: "Giới thiệu Next.js và App Router",
            durationMinutes: 10,
            isPreview: true,
            resources: [
              { id: "c1-s1-l1-r1", name: "Slide bài giảng - Giới thiệu Next.js", fileLabel: "PDF · 1.8 MB" },
            ],
          },
          {
            id: "c1-s1-l2",
            title: "Routing và Layouts",
            durationMinutes: 15,
            resources: [
              { id: "c1-s1-l2-r1", name: "Source code - Routing demo", fileLabel: "ZIP · 640 KB" },
            ],
          },
          { id: "c1-s1-l3", title: "Server Components vs Client Components", durationMinutes: 18 },
        ],
      },
      {
        id: "c1-s2",
        title: "TypeScript trong dự án thực tế",
        lessons: [
          { id: "c1-s2-l1", title: "Kiểu dữ liệu và Interface", durationMinutes: 12 },
          { id: "c1-s2-l2", title: "Generic và Utility Types", durationMinutes: 16 },
          { id: "c1-s2-l3", title: "Type-safe API với Zod", durationMinutes: 14 },
        ],
      },
      {
        id: "c1-s3",
        title: "Kết nối Supabase",
        lessons: [
          {
            id: "c1-s3-l1",
            title: "Thiết lập Supabase Auth",
            durationMinutes: 20,
            resources: [
              { id: "c1-s3-l1-r1", name: "Cheat sheet - Supabase Auth", fileLabel: "PDF · 620 KB" },
              { id: "c1-s3-l1-r2", name: "Source code - Auth setup", fileLabel: "ZIP · 1.1 MB" },
            ],
          },
          { id: "c1-s3-l2", title: "Truy vấn dữ liệu với Row Level Security", durationMinutes: 22 },
          { id: "c1-s3-l3", title: "Upload file lên Supabase Storage", durationMinutes: 15 },
        ],
      },
      {
        id: "c1-s4",
        title: "Triển khai sản phẩm",
        lessons: [
          { id: "c1-s4-l1", title: "Tối ưu hiệu năng", durationMinutes: 14 },
          { id: "c1-s4-l2", title: "Deploy lên Vercel", durationMinutes: 10 },
        ],
      },
    ],
  },
  "course-2": {
    longDescription:
      "Khoá học nhập môn Python dành cho người chưa từng lập trình, đi từ cú pháp cơ bản đến các dự án nhỏ thực tế như xử lý file, tự động hoá tác vụ và làm việc với dữ liệu. Phù hợp cho người muốn chuyển ngành hoặc bổ sung kỹ năng lập trình.",
    objectives: [
      "Nắm vững cú pháp và tư duy lập trình Python",
      "Làm việc với danh sách, dictionary và hàm",
      "Xử lý file và dữ liệu văn bản cơ bản",
      "Tự xây dựng các script tự động hoá đơn giản",
    ],
    requirements: ["Không yêu cầu kiến thức lập trình trước đó", "Máy tính cài sẵn Python 3"],
    curriculum: [
      {
        id: "c2-s1",
        title: "Nhập môn Python",
        lessons: [
          {
            id: "c2-s1-l1",
            title: "Cài đặt môi trường và chạy chương trình đầu tiên",
            durationMinutes: 8,
            isPreview: true,
          },
          { id: "c2-s1-l2", title: "Biến, kiểu dữ liệu và toán tử", durationMinutes: 14 },
          { id: "c2-s1-l3", title: "Câu lệnh điều kiện và vòng lặp", durationMinutes: 16 },
        ],
      },
      {
        id: "c2-s2",
        title: "Cấu trúc dữ liệu và hàm",
        lessons: [
          { id: "c2-s2-l1", title: "List, Tuple và Dictionary", durationMinutes: 18 },
          { id: "c2-s2-l2", title: "Viết hàm và tái sử dụng code", durationMinutes: 15 },
          { id: "c2-s2-l3", title: "Xử lý lỗi với try/except", durationMinutes: 12 },
        ],
      },
      {
        id: "c2-s3",
        title: "Dự án thực hành",
        lessons: [
          { id: "c2-s3-l1", title: "Đọc/ghi file CSV", durationMinutes: 16 },
          { id: "c2-s3-l2", title: "Script tự động đổi tên hàng loạt file", durationMinutes: 14 },
          { id: "c2-s3-l3", title: "Tổng kết và định hướng học tiếp", durationMinutes: 8 },
        ],
      },
    ],
  },
  "course-3": {
    longDescription:
      "Học toàn bộ quy trình thiết kế sản phẩm số: nghiên cứu người dùng, wireframe, thiết kế giao diện và dựng prototype tương tác bằng Figma. Kết thúc khoá học bạn sẽ có một portfolio hoàn chỉnh để ứng tuyển vị trí UI/UX Designer.",
    objectives: [
      "Thực hiện nghiên cứu và phỏng vấn người dùng cơ bản",
      "Dựng wireframe và user flow rõ ràng",
      "Thiết kế UI nhất quán với design system",
      "Tạo prototype tương tác và bàn giao cho developer",
    ],
    requirements: [
      "Có gu thẩm mỹ cơ bản, không cần biết vẽ",
      "Máy tính cài đặt được Figma (miễn phí)",
    ],
    curriculum: [
      {
        id: "c3-s1",
        title: "Nghiên cứu người dùng",
        lessons: [
          {
            id: "c3-s1-l1",
            title: "Tổng quan quy trình UX Design",
            durationMinutes: 12,
            isPreview: true,
          },
          { id: "c3-s1-l2", title: "Phỏng vấn và khảo sát người dùng", durationMinutes: 16 },
          { id: "c3-s1-l3", title: "Xây dựng persona và user journey", durationMinutes: 14 },
        ],
      },
      {
        id: "c3-s2",
        title: "Wireframe và cấu trúc thông tin",
        lessons: [
          {
            id: "c3-s2-l1",
            title: "Sketch ý tưởng và low-fidelity wireframe",
            durationMinutes: 15,
          },
          { id: "c3-s2-l2", title: "Information Architecture", durationMinutes: 13 },
        ],
      },
      {
        id: "c3-s3",
        title: "Thiết kế UI với Figma",
        lessons: [
          { id: "c3-s3-l1", title: "Component và Auto Layout", durationMinutes: 20 },
          { id: "c3-s3-l2", title: "Xây dựng Design System", durationMinutes: 22 },
          { id: "c3-s3-l3", title: "Thiết kế responsive", durationMinutes: 16 },
        ],
      },
      {
        id: "c3-s4",
        title: "Prototype và bàn giao",
        lessons: [
          { id: "c3-s4-l1", title: "Tạo prototype tương tác", durationMinutes: 18 },
          { id: "c3-s4-l2", title: "Bàn giao design cho developer", durationMinutes: 12 },
        ],
      },
    ],
  },
  "course-4": {
    longDescription:
      "Khoá học tổng hợp các kỹ năng Digital Marketing cần thiết năm 2026: SEO, quảng cáo Facebook/Google Ads, email marketing và xây dựng thương hiệu cá nhân trên mạng xã hội. Có bài tập thực hành trên chiến dịch thật.",
    objectives: [
      "Lập kế hoạch chiến dịch digital marketing tổng thể",
      "Chạy quảng cáo Facebook Ads và Google Ads cơ bản",
      "Xây dựng chiến dịch email marketing hiệu quả",
      "Đo lường và tối ưu hiệu suất chiến dịch",
    ],
    requirements: [
      "Có hiểu biết cơ bản về mạng xã hội",
      "Nên có sẵn một sản phẩm/dịch vụ để thực hành",
    ],
    curriculum: [
      {
        id: "c4-s1",
        title: "Nền tảng Digital Marketing",
        lessons: [
          {
            id: "c4-s1-l1",
            title: "Tổng quan hệ sinh thái digital marketing",
            durationMinutes: 12,
            isPreview: true,
          },
          { id: "c4-s1-l2", title: "Xác định chân dung khách hàng mục tiêu", durationMinutes: 14 },
        ],
      },
      {
        id: "c4-s2",
        title: "Quảng cáo trả phí",
        lessons: [
          { id: "c4-s2-l1", title: "Thiết lập chiến dịch Facebook Ads", durationMinutes: 20 },
          { id: "c4-s2-l2", title: "Google Ads: Search và Display", durationMinutes: 18 },
          { id: "c4-s2-l3", title: "Tối ưu ngân sách và target", durationMinutes: 15 },
        ],
      },
      {
        id: "c4-s3",
        title: "Email marketing & thương hiệu cá nhân",
        lessons: [
          { id: "c4-s3-l1", title: "Xây dựng chuỗi email tự động", durationMinutes: 16 },
          {
            id: "c4-s3-l2",
            title: "Xây dựng thương hiệu cá nhân trên social",
            durationMinutes: 14,
          },
        ],
      },
    ],
  },
  "course-5": {
    longDescription:
      "Rèn luyện khả năng giao tiếp tiếng Anh trong môi trường công sở: họp hành, thuyết trình, email và đàm phán với đối tác nước ngoài. Tập trung vào phản xạ thực tế thay vì ngữ pháp hàn lâm.",
    objectives: [
      "Tự tin giao tiếp trong các cuộc họp bằng tiếng Anh",
      "Thuyết trình rõ ràng, mạch lạc trước khách hàng",
      "Viết email công việc chuyên nghiệp",
      "Đàm phán và xử lý tình huống với đối tác quốc tế",
    ],
    requirements: ["Trình độ tiếng Anh tối thiểu A2-B1", "Sẵn sàng luyện nói và ghi âm bài tập"],
    curriculum: [
      {
        id: "c5-s1",
        title: "Giao tiếp trong cuộc họp",
        lessons: [
          {
            id: "c5-s1-l1",
            title: "Mẫu câu mở đầu và điều phối cuộc họp",
            durationMinutes: 14,
            isPreview: true,
          },
          { id: "c5-s1-l2", title: "Đưa ra ý kiến và phản biện lịch sự", durationMinutes: 16 },
        ],
      },
      {
        id: "c5-s2",
        title: "Thuyết trình chuyên nghiệp",
        lessons: [
          { id: "c5-s2-l1", title: "Cấu trúc một bài thuyết trình", durationMinutes: 18 },
          { id: "c5-s2-l2", title: "Xử lý câu hỏi từ khán giả", durationMinutes: 15 },
        ],
      },
      {
        id: "c5-s3",
        title: "Email và văn bản công việc",
        lessons: [
          { id: "c5-s3-l1", title: "Viết email theo từng ngữ cảnh", durationMinutes: 12 },
          { id: "c5-s3-l2", title: "Ngôn ngữ trang trọng vs thân mật", durationMinutes: 10 },
        ],
      },
      {
        id: "c5-s4",
        title: "Đàm phán với đối tác",
        lessons: [
          { id: "c5-s4-l1", title: "Chiến thuật đàm phán cơ bản", durationMinutes: 20 },
          { id: "c5-s4-l2", title: "Luyện tập tình huống thực tế", durationMinutes: 22 },
        ],
      },
    ],
  },
  "course-6": {
    longDescription:
      "Áp dụng phương pháp Lean Startup để xác thực ý tưởng kinh doanh nhanh chóng với chi phí thấp nhất. Học cách xây dựng MVP, thu thập phản hồi khách hàng và xoay trục (pivot) khi cần thiết.",
    objectives: [
      "Xác thực ý tưởng kinh doanh trước khi đầu tư lớn",
      "Xây dựng MVP (Minimum Viable Product)",
      "Thiết lập vòng lặp Build - Measure - Learn",
      "Ra quyết định pivot hoặc persevere dựa trên dữ liệu",
    ],
    requirements: [
      "Có sẵn một ý tưởng kinh doanh muốn thử nghiệm",
      "Không yêu cầu kinh nghiệm khởi nghiệp trước đó",
    ],
    curriculum: [
      {
        id: "c6-s1",
        title: "Tư duy Lean Startup",
        lessons: [
          {
            id: "c6-s1-l1",
            title: "Vì sao startup thất bại",
            durationMinutes: 10,
            isPreview: true,
          },
          { id: "c6-s1-l2", title: "Business Model Canvas", durationMinutes: 16 },
        ],
      },
      {
        id: "c6-s2",
        title: "Xây dựng và kiểm chứng MVP",
        lessons: [
          { id: "c6-s2-l1", title: "Thiết kế thử nghiệm giả định", durationMinutes: 14 },
          { id: "c6-s2-l2", title: "Xây dựng MVP tối giản", durationMinutes: 18 },
        ],
      },
      {
        id: "c6-s3",
        title: "Đo lường và tăng trưởng",
        lessons: [
          { id: "c6-s3-l1", title: "Chỉ số then chốt (metrics) cho startup", durationMinutes: 15 },
          { id: "c6-s3-l2", title: "Pivot hay Persevere?", durationMinutes: 12 },
        ],
      },
    ],
  },
  "course-7": {
    longDescription:
      "Phát triển năng lực lãnh đạo thông qua các tình huống quản lý thực tế: giao việc, phản hồi, xử lý xung đột và xây dựng văn hoá đội nhóm gắn kết trong môi trường làm việc hiện đại.",
    objectives: [
      "Xây dựng phong cách lãnh đạo phù hợp với bản thân",
      "Giao việc và uỷ quyền hiệu quả",
      "Đưa phản hồi mang tính xây dựng",
      "Xử lý xung đột trong đội nhóm",
    ],
    requirements: [
      "Đang hoặc sắp đảm nhận vai trò quản lý",
      "Sẵn sàng chia sẻ tình huống thực tế của bản thân",
    ],
    curriculum: [
      {
        id: "c7-s1",
        title: "Nền tảng lãnh đạo",
        lessons: [
          {
            id: "c7-s1-l1",
            title: "Phong cách lãnh đạo và tự nhận thức",
            durationMinutes: 14,
            isPreview: true,
          },
          { id: "c7-s1-l2", title: "Từ chuyên gia đến quản lý", durationMinutes: 12 },
        ],
      },
      {
        id: "c7-s2",
        title: "Quản lý đội nhóm hằng ngày",
        lessons: [
          { id: "c7-s2-l1", title: "Giao việc và uỷ quyền", durationMinutes: 16 },
          { id: "c7-s2-l2", title: "1-1 hiệu quả và đưa phản hồi", durationMinutes: 18 },
        ],
      },
      {
        id: "c7-s3",
        title: "Xây dựng văn hoá đội nhóm",
        lessons: [
          { id: "c7-s3-l1", title: "Xử lý xung đột trong nhóm", durationMinutes: 15 },
          { id: "c7-s3-l2", title: "Xây dựng văn hoá tin cậy", durationMinutes: 13 },
        ],
      },
    ],
  },
  "course-8": {
    longDescription:
      "Xây dựng ứng dụng di động cho cả iOS và Android từ một codebase duy nhất với React Native và Expo. Khoá học đi từ setup dự án đến publish ứng dụng lên App Store và Google Play.",
    objectives: [
      "Xây dựng UI di động với React Native",
      "Quản lý điều hướng (navigation) đa màn hình",
      "Kết nối API và lưu trữ dữ liệu local",
      "Đóng gói và publish app lên store",
    ],
    requirements: ["Đã biết React cơ bản", "Có kiến thức JavaScript/TypeScript"],
    curriculum: [
      {
        id: "c8-s1",
        title: "Bắt đầu với React Native & Expo",
        lessons: [
          {
            id: "c8-s1-l1",
            title: "Thiết lập môi trường Expo",
            durationMinutes: 12,
            isPreview: true,
          },
          { id: "c8-s1-l2", title: "Component và Style cơ bản", durationMinutes: 16 },
        ],
      },
      {
        id: "c8-s2",
        title: "Điều hướng và trạng thái",
        lessons: [
          { id: "c8-s2-l1", title: "React Navigation: Stack & Tab", durationMinutes: 18 },
          { id: "c8-s2-l2", title: "Quản lý state với Zustand", durationMinutes: 15 },
        ],
      },
      {
        id: "c8-s3",
        title: "Kết nối dữ liệu",
        lessons: [
          { id: "c8-s3-l1", title: "Gọi API và xử lý loading/error", durationMinutes: 16 },
          { id: "c8-s3-l2", title: "Lưu trữ dữ liệu local", durationMinutes: 14 },
        ],
      },
      {
        id: "c8-s4",
        title: "Publish ứng dụng",
        lessons: [
          { id: "c8-s4-l1", title: "Build với EAS", durationMinutes: 15 },
          { id: "c8-s4-l2", title: "Nộp app lên App Store & Google Play", durationMinutes: 18 },
        ],
      },
    ],
  },
  "course-9": {
    longDescription:
      "Làm quen với nhiếp ảnh và dựng phim cơ bản: cách sử dụng máy ảnh/điện thoại, nguyên tắc bố cục, ánh sáng và dựng video đơn giản bằng phần mềm miễn phí. Phù hợp cho người mới bắt đầu.",
    objectives: [
      "Hiểu và điều chỉnh các thông số cơ bản của máy ảnh",
      "Áp dụng nguyên tắc bố cục và ánh sáng",
      "Dựng video cơ bản với phần mềm miễn phí",
      "Xây dựng phong cách cá nhân trong nhiếp ảnh",
    ],
    requirements: ["Có máy ảnh hoặc điện thoại có camera", "Không yêu cầu kinh nghiệm trước đó"],
    curriculum: [
      {
        id: "c9-s1",
        title: "Nền tảng nhiếp ảnh",
        lessons: [
          {
            id: "c9-s1-l1",
            title: "Làm quen với máy ảnh/điện thoại",
            durationMinutes: 10,
            isPreview: true,
          },
          { id: "c9-s1-l2", title: "Bố cục và quy tắc 1/3", durationMinutes: 12 },
          { id: "c9-s1-l3", title: "Ánh sáng tự nhiên và nhân tạo", durationMinutes: 14 },
        ],
      },
      {
        id: "c9-s2",
        title: "Dựng phim cơ bản",
        lessons: [
          { id: "c9-s2-l1", title: "Làm quen phần mềm dựng phim miễn phí", durationMinutes: 15 },
          { id: "c9-s2-l2", title: "Cắt ghép và chuyển cảnh", durationMinutes: 13 },
          { id: "c9-s2-l3", title: "Thêm nhạc và hiệu ứng cơ bản", durationMinutes: 11 },
        ],
      },
    ],
  },
  "course-10": {
    longDescription:
      "Học cách tối ưu website để lên top Google từ cơ bản đến nâng cao: nghiên cứu từ khoá, SEO onpage, offpage và các yếu tố kỹ thuật ảnh hưởng đến thứ hạng tìm kiếm.",
    objectives: [
      "Nghiên cứu và lựa chọn từ khoá hiệu quả",
      "Tối ưu SEO onpage cho website",
      "Xây dựng chiến lược backlink an toàn",
      "Khắc phục các lỗi SEO kỹ thuật phổ biến",
    ],
    requirements: [
      "Có sẵn một website để thực hành (không bắt buộc)",
      "Biết sử dụng máy tính cơ bản",
    ],
    curriculum: [
      {
        id: "c10-s1",
        title: "Nghiên cứu từ khoá",
        lessons: [
          {
            id: "c10-s1-l1",
            title: "Công cụ nghiên cứu từ khoá miễn phí",
            durationMinutes: 12,
            isPreview: true,
          },
          { id: "c10-s1-l2", title: "Phân tích ý định tìm kiếm", durationMinutes: 10 },
        ],
      },
      {
        id: "c10-s2",
        title: "SEO Onpage",
        lessons: [
          { id: "c10-s2-l1", title: "Tối ưu tiêu đề, thẻ meta", durationMinutes: 14 },
          { id: "c10-s2-l2", title: "Cấu trúc nội dung chuẩn SEO", durationMinutes: 16 },
        ],
      },
      {
        id: "c10-s3",
        title: "SEO Offpage & kỹ thuật",
        lessons: [
          { id: "c10-s3-l1", title: "Chiến lược xây dựng backlink", durationMinutes: 15 },
          { id: "c10-s3-l2", title: "Tối ưu tốc độ và Core Web Vitals", durationMinutes: 13 },
        ],
      },
    ],
  },
};

export const COURSE_REVIEWS: Record<string, CourseReview[]> = {
  "course-1": [
    {
      id: "c1-r1",
      studentName: "Hoàng Gia Bảo",
      avatarUrl: null,
      rating: 5,
      content:
        "Khoá học rất thực tế, phần tích hợp Supabase giúp mình hiểu rõ RLS mà trước giờ chỉ đọc docs.",
      createdAt: "2026-06-10",
    },
    {
      id: "c1-r2",
      studentName: "Trần Quốc Đạt",
      avatarUrl: null,
      rating: 4,
      content:
        "Nội dung chất lượng, hơi nhanh ở phần TypeScript generic nhưng tổng thể rất đáng học.",
      createdAt: "2026-05-22",
    },
  ],
  "course-2": [
    {
      id: "c2-r1",
      studentName: "Ngô Thuỳ Dương",
      avatarUrl: null,
      rating: 5,
      content: "Giảng viên giải thích dễ hiểu, bài tập vừa sức cho người mới bắt đầu như mình.",
      createdAt: "2026-04-18",
    },
    {
      id: "c2-r2",
      studentName: "Bùi Văn Hùng",
      avatarUrl: null,
      rating: 5,
      content: "Học xong tự viết được script xử lý file cho công việc, rất thực dụng.",
      createdAt: "2026-03-30",
    },
  ],
  "course-3": [
    {
      id: "c3-r1",
      studentName: "Trịnh Bảo Long",
      avatarUrl: null,
      rating: 4,
      content: "Phần Design System khá chi tiết, mình đã áp dụng được ngay cho dự án công ty.",
      createdAt: "2026-06-01",
    },
    {
      id: "c3-r2",
      studentName: "Đinh Khánh Vy",
      avatarUrl: null,
      rating: 5,
      content: "Sau khoá học mình tự tin làm portfolio để apply vị trí UI/UX Designer.",
      createdAt: "2026-05-12",
    },
  ],
  "course-4": [
    {
      id: "c4-r1",
      studentName: "Phạm Thế Anh",
      avatarUrl: null,
      rating: 4,
      content: "Kiến thức bao quát, phần Facebook Ads rất chi tiết và cập nhật.",
      createdAt: "2026-06-15",
    },
    {
      id: "c4-r2",
      studentName: "Lý Thu Trang",
      avatarUrl: null,
      rating: 5,
      content: "Áp dụng ngay cho shop online của mình, đơn hàng tăng rõ rệt sau 1 tháng.",
      createdAt: "2026-05-28",
    },
  ],
  "course-5": [
    {
      id: "c5-r1",
      studentName: "Phan Yến Nhi",
      avatarUrl: null,
      rating: 5,
      content: "Tự tin thuyết trình bằng tiếng Anh trước khách hàng nước ngoài sau 2 tháng học.",
      createdAt: "2026-06-08",
    },
    {
      id: "c5-r2",
      studentName: "Vương Đức Anh",
      avatarUrl: null,
      rating: 4,
      content: "Phần luyện đàm phán rất sát thực tế công việc, giảng viên phản hồi tận tình.",
      createdAt: "2026-04-25",
    },
  ],
  "course-6": [
    {
      id: "c6-r1",
      studentName: "Đỗ Minh Tâm",
      avatarUrl: null,
      rating: 4,
      content: "Giúp mình tránh được nhiều sai lầm khi mới bắt đầu khởi nghiệp.",
      createdAt: "2026-05-19",
    },
    {
      id: "c6-r2",
      studentName: "Nguyễn Hải Yến",
      avatarUrl: null,
      rating: 5,
      content: "Bài học về MVP thực sự thay đổi cách mình tiếp cận sản phẩm.",
      createdAt: "2026-04-02",
    },
  ],
  "course-7": [
    {
      id: "c7-r1",
      studentName: "Lâm Bích Ngọc",
      avatarUrl: null,
      rating: 4,
      content: "Nhiều tình huống thực tế, giúp mình tự tin hơn khi quản lý team 8 người.",
      createdAt: "2026-06-20",
    },
    {
      id: "c7-r2",
      studentName: "Trương Công Minh",
      avatarUrl: null,
      rating: 5,
      content: "Phần xử lý xung đột rất hữu ích, áp dụng được ngay tuần sau khi học.",
      createdAt: "2026-05-05",
    },
  ],
  "course-8": [
    {
      id: "c8-r1",
      studentName: "Đặng Gia Huy",
      avatarUrl: null,
      rating: 5,
      content: "Từ chưa biết gì về mobile, giờ mình đã tự publish được app lên Google Play.",
      createdAt: "2026-06-25",
    },
    {
      id: "c8-r2",
      studentName: "Nguyễn Thảo Vy",
      avatarUrl: null,
      rating: 5,
      content: "Giảng viên Khôi dạy rất tận tâm, code demo rõ ràng dễ theo.",
      createdAt: "2026-06-02",
    },
  ],
  "course-9": [
    {
      id: "c9-r1",
      studentName: "Hồ Anh Thư",
      avatarUrl: null,
      rating: 4,
      content: "Khoá học miễn phí mà chất lượng vượt mong đợi, học xong chụp ảnh đẹp hơn hẳn.",
      createdAt: "2026-05-14",
    },
    {
      id: "c9-r2",
      studentName: "Vũ Nhật Nam",
      avatarUrl: null,
      rating: 4,
      content: "Phần dựng phim ngắn gọn, dễ áp dụng ngay cả với người mới.",
      createdAt: "2026-04-10",
    },
  ],
  "course-10": [
    {
      id: "c10-r1",
      studentName: "Đặng Minh Quân",
      avatarUrl: null,
      rating: 5,
      content: "Áp dụng ngay cho website công ty, tăng traffic tự nhiên hơn 40% sau 3 tháng.",
      createdAt: "2026-06-18",
    },
    {
      id: "c10-r2",
      studentName: "Ngô Bảo Trâm",
      avatarUrl: null,
      rating: 4,
      content: "Kiến thức được sắp xếp logic, dễ theo dõi kể cả với người mới học SEO.",
      createdAt: "2026-05-01",
    },
  ],
};
