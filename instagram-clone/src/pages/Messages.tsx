import { Edit, User } from "lucide-react";

const conversations = [
  { username: "alex.photo", lastMsg: "Loved your latest shot! 📸", time: "2h" },
  { username: "sarah_travels", lastMsg: "Are you coming to the trip?", time: "5h" },
  { username: "chef.marco", lastMsg: "Recipe sent! 🍝", time: "1d" },
  { username: "urban_lens", lastMsg: "Collab soon?", time: "2d" },
  { username: "arch.daily", lastMsg: "Check out this building", time: "3d" },
];

const Messages = () => {
  return (
    <div className="flex h-screen">
      {/* Left - conversation list */}
      <div className="w-[350px] border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-xl font-bold text-foreground">remalik2026</h2>
          <Edit className="w-5 h-5 text-foreground cursor-pointer" />
        </div>

        <div className="flex gap-4 px-5 mb-3">
          <button className="text-sm font-semibold text-foreground bg-secondary px-4 py-1.5 rounded-lg">Primary</button>
          <button className="text-sm text-muted-foreground px-4 py-1.5 rounded-lg hover:bg-ig-hover">General</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div key={c.username} className="flex items-center gap-3 px-5 py-3 hover:bg-ig-hover cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{c.username}</p>
                <p className="text-sm text-muted-foreground truncate">{c.lastMsg} · {c.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right - empty state */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <Edit className="w-10 h-10 text-foreground" />
        </div>
        <h3 className="text-xl text-foreground mb-1">Your messages</h3>
        <p className="text-sm text-muted-foreground mb-4">Send a message to start a chat.</p>
        <button className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          Send message
        </button>
      </div>
    </div>
  );
};

export default Messages;
