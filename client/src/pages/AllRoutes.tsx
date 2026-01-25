// client/src/routes/allroutes.tsx
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import HomePage from "./HomePage";
import ThreadPage from "./ThreadPage";
import TasksPage from "./TasksPage";
import SearchPage from "./SearchPage";
import SettingsPage from "./SettingsPage";
import NotFoundPage from "./NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "thread/:threadId", element: <ThreadPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
