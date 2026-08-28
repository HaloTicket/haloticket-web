import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Trang Chủ / Sự Kiện Nổi Bật</h1>
      <Link
        to={PATHS.EVENT_DETAIL("EVT-101")}
        className="text-brand-600 dark:text-brand-400 underline font-medium"
      >
        Xem chi tiết sự kiện EVT-101
      </Link>
    </div>
  );
}
