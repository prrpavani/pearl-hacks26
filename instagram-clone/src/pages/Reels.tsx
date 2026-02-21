import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music, User } from "lucide-react";
import { posts } from "@/data/mockData";

const Reels = () => {
  const reel = posts[2]; // Use a post as a "reel"

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="relative w-[400px] h-[700px] rounded-lg overflow-hidden bg-ig-elevated">
        <img src={reel.image} alt="" className="w-full h-full object-cover" />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Right actions */}
        <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center">
          <button className="flex flex-col items-center gap-1">
            <Heart className="w-7 h-7 text-foreground" />
            <span className="text-xs text-foreground">{reel.likes}</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <MessageCircle className="w-7 h-7 text-foreground" />
            <span className="text-xs text-foreground">{reel.comments}</span>
          </button>
          <button><Send className="w-7 h-7 text-foreground" /></button>
          <button><Bookmark className="w-7 h-7 text-foreground" /></button>
          <button><MoreHorizontal className="w-7 h-7 text-foreground" /></button>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-3 right-16">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">{reel.username}</span>
            <button className="border border-foreground rounded px-2 py-0.5 text-xs text-foreground font-semibold">Follow</button>
          </div>
          <p className="text-sm text-foreground mb-2">{reel.caption}</p>
          <div className="flex items-center gap-1 text-xs text-foreground">
            <Music className="w-3 h-3" />
            <span>Original audio · {reel.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reels;
