import { createBrowserRouter } from "react-router-dom";
import { PATHS } from "./paths";
import MainLayout from "@/layouts/MainLayout";
import Home from "@/features/events/Home";
import EventDetail from "@/features/events/EventDetail";

export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MainLayout />, // wrap pages in a common layout with a header and footer
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/events/:id", // declare the original parameter.
        element: <EventDetail />,
      },
    ],
  },
  {
    path: PATHS.LOGIN,
    element: <div>Trang Đăng nhập</div>, // wrap with AuthLayout
  },
]);
