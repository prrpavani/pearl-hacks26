import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[72px] xl:ml-[244px]">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
