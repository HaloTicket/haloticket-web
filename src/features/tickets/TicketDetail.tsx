import { useParams } from "react-router-dom";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Trang Chi Tiết Vé #{id}</h1>
    </div>
  );
}
