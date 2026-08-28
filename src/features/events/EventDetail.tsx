import { useParams } from "react-router-dom";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Chi Tiết Sự Kiện #{id}</h1>
    </div>
  );
}
