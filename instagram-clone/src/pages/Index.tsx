import StoryCircle from "@/components/home/StoryCircle";
import PostCard from "@/components/home/PostCard";
import { stories, posts, suggestions } from "@/data/mockData";
import { User } from "lucide-react";

const Index = () => {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[630px] py-6">
        {/* Stories */}
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 mb-2 border-b border-border scrollbar-hide">
          {stories.map((story) => (
            <StoryCircle key={story.id} username={story.username} isYou={story.isYou} />
          ))}
        </div>

        {/* Posts */}
        <div className="px-0">
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>

      {/* Right sidebar - suggestions (hidden on smaller screens) */}
      <div className="hidden lg:block w-[320px] pl-16 pt-8 flex-shrink-0">
        {/* Current user */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">remalik2026</p>
            <p className="text-sm text-muted-foreground">Rameez Malik</p>
          </div>
          <button className="text-xs font-semibold text-primary hover:text-foreground">Switch</button>
        </div>

        {/* Suggestions */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-muted-foreground">Suggested for you</span>
          <button className="text-xs font-semibold text-foreground hover:text-muted-foreground">See All</button>
        </div>
        {suggestions.map((s) => (
          <div key={s.username} className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{s.username}</p>
              <p className="text-xs text-muted-foreground">Followed by {s.followers} others</p>
            </div>
            <button className="text-xs font-semibold text-primary hover:text-foreground">Follow</button>
          </div>
        ))}

        <p className="text-xs text-muted-foreground mt-6">
          © 2026 Instagram Clone
        </p>
      </div>
    </div>
  );
};

export default Index;
