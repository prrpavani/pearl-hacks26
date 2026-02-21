import { Heart, User } from "lucide-react";
import { posts } from "@/data/mockData";

const notifications = [
  { username: "alex.photo", action: "liked your photo.", time: "2h", type: "like" as const },
  { username: "sarah_travels", action: "started following you.", time: "4h", type: "follow" as const },
  { username: "chef.marco", action: "commented: Amazing shot! 🔥", time: "6h", type: "comment" as const },
  { username: "urban_lens", action: "liked your photo.", time: "1d", type: "like" as const },
  { username: "arch.daily", action: "mentioned you in a comment.", time: "2d", type: "comment" as const },
  { username: "beach.life", action: "started following you.", time: "3d", type: "follow" as const },
];

const Notifications = () => {
  return (
    <div className="max-w-[600px] mx-auto px-5 pt-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Notifications</h2>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">This week</h3>
        {notifications.map((n, i) => (
          <div key={i} className="flex items-center gap-3 py-2 hover:bg-ig-hover rounded-lg px-2 cursor-pointer">
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-foreground flex-1">
              <span className="font-semibold">{n.username}</span>{" "}{n.action}
              <span className="text-muted-foreground"> {n.time}</span>
            </p>
            {n.type === "follow" && (
              <button className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-lg">
                Follow
              </button>
            )}
            {n.type === "like" && (
              <div className="w-10 h-10 overflow-hidden rounded">
                <img src={posts[0].image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
