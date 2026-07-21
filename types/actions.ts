/** Kết quả trả về từ server action cho form — chỉ set khi có lỗi, thành công thì action tự redirect hoặc không trả gì. */
export type ActionResult = {
  error: string;
} | void;
