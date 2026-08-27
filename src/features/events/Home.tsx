import { Link } from "react-router-dom";
import { PATHS } from "../../routes/paths";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Sự kiện nổi bật</h1>
      <Link
        to={PATHS.EVENT_DETAIL("EVT-123")}
        className="text-blue-500 underline"
      >
        Xem chi tiết sự kiện EVT-123
      </Link>
    </div>
  );
}
