import { Settings, Grid3X3, Bookmark, UserSquare, Plus, User, Camera } from "lucide-react";
import { useState } from "react";
import { posts } from "@/data/mockData";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "tagged">("posts");

  return (
    <div className="max-w-[935px] mx-auto px-5 pt-8">
      {/* Profile header */}
      <div className="flex gap-8 mb-10">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-[150px] h-[150px] rounded-full bg-secondary flex items-center justify-center relative">
            <User className="w-16 h-16 text-muted-foreground" />
            <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-ig-elevated border-2 border-background flex items-center justify-center cursor-pointer">
              <Camera className="w-4 h-4 text-foreground" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 pt-2">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-xl text-foreground">remalik2026</h1>
            <Settings className="w-6 h-6 text-foreground cursor-pointer" />
          </div>

          <div className="flex gap-2 mb-4">
            <button className="px-6 py-1.5 bg-secondary text-foreground text-sm font-semibold rounded-lg hover:bg-ig-hover transition-colors">
              Edit profile
            </button>
            <button className="px-6 py-1.5 bg-secondary text-foreground text-sm font-semibold rounded-lg hover:bg-ig-hover transition-colors">
              View archive
            </button>
          </div>

          <div className="flex gap-8 mb-4">
            <span className="text-base text-foreground"><strong>0</strong> posts</span>
            <span className="text-base text-foreground cursor-pointer"><strong>0</strong> followers</span>
            <span className="text-base text-foreground cursor-pointer"><strong>0</strong> following</span>
          </div>

          <p className="text-sm font-semibold text-foreground">Rameez Malik</p>
        </div>
      </div>

      {/* Story highlights */}
      <div className="flex gap-4 mb-10">
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="w-[77px] h-[77px] rounded-full border-2 border-border flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <span className="text-xs text-foreground">New</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border flex justify-center gap-16">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-1 py-3 text-xs font-semibold tracking-wider uppercase border-t transition-colors ${
            activeTab === "posts"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Grid3X3 className="w-3 h-3" /> Posts
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-1 py-3 text-xs font-semibold tracking-wider uppercase border-t transition-colors ${
            activeTab === "saved"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Bookmark className="w-3 h-3" /> Saved
        </button>
        <button
          onClick={() => setActiveTab("tagged")}
          className={`flex items-center gap-1 py-3 text-xs font-semibold tracking-wider uppercase border-t transition-colors ${
            activeTab === "tagged"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <UserSquare className="w-3 h-3" /> Tagged
        </button>
      </div>

      {/* Grid */}
      {activeTab === "posts" && (
        <div className="grid grid-cols-3 gap-1 mt-1 pb-8">
          {posts.map((post) => (
            <div key={post.id} className="aspect-square cursor-pointer overflow-hidden group relative">
              <img src={post.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                <span className="text-foreground font-semibold flex items-center gap-1">❤️ {post.likes}</span>
                <span className="text-foreground font-semibold flex items-center gap-1">💬 {post.comments}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="flex flex-col items-center py-16">
          <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No saved posts yet</p>
        </div>
      )}

      {activeTab === "tagged" && (
        <div className="flex flex-col items-center py-16">
          <UserSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tagged posts yet</p>
        </div>
      )}
    </div>
  );
};

export default Profile;
