import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Compass,
  Film,
  Send,
  Heart,
  PlusSquare,
  User,
  Menu,
  DollarSign,
  Instagram,
} from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/reels", icon: Film, label: "Reels" },
  { to: "/messages", icon: Send, label: "Messages" },
  { to: "/notifications", icon: Heart, label: "Notifications" },
  { to: "/create", icon: PlusSquare, label: "Create" },
  { to: "/profile", icon: User, label: "Profile" },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-[72px] xl:w-[244px] border-r border-border bg-background flex flex-col justify-between py-6 px-3 z-50">
      {/* Logo */}
      <div className="mb-6 px-3 pt-4 pb-4">
        <Instagram className="w-6 h-6 xl:hidden text-foreground" />
        <span className="hidden xl:block text-foreground text-xl font-semibold tracking-tight">
          Instagram
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors hover:bg-ig-hover group ${
                isActive ? "font-bold" : ""
              }`}
            >
              <item.icon
                className="w-6 h-6 text-foreground flex-shrink-0"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className="hidden xl:block text-foreground text-base">
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* Earn tab */}
        <NavLink
          to="/earn"
          className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors hover:bg-ig-hover group ${
            location.pathname === "/earn" ? "font-bold" : ""
          }`}
        >
          <DollarSign
            className="w-6 h-6 text-ig-earn flex-shrink-0"
            strokeWidth={location.pathname === "/earn" ? 2.5 : 1.5}
          />
          <span className="hidden xl:block text-ig-earn text-base">
            Earn
          </span>
        </NavLink>
      </nav>

      {/* Bottom items */}
      <div className="flex flex-col gap-1 mt-4">
        <button className="flex items-center gap-4 px-3 py-3 rounded-lg transition-colors hover:bg-ig-hover w-full">
          <Menu className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          <span className="hidden xl:block text-foreground text-base">More</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
