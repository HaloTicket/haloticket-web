import { useParams } from "react-router-dom";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold">Chi tiết sự kiện</h1>
      <p className="mt-2">
        Đang hiển thị thông tin cho mã sự kiện: <strong>{id}</strong>
      </p>
    </div>
  );
}
