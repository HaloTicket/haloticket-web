import { useParams } from "react-router-dom";

export default function SelectTicket() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Trang Chọn Vé #{id}</h1>
    </div>
  );
}
