import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, User } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  username: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

const PostCard = ({ username, image, caption, likes, comments, timeAgo }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const likeCount = liked ? likes + 1 : likes;

  return (
    <article className="border-b border-border pb-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">{username}</span>
          <span className="text-sm text-muted-foreground">• {timeAgo}</span>
        </div>
        <MoreHorizontal className="w-5 h-5 text-foreground cursor-pointer" />
      </div>

      {/* Image */}
      <div className="rounded-sm overflow-hidden mb-3">
        <img src={image} alt={caption} className="w-full aspect-square object-cover" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-4">
          <Heart
            className={`w-6 h-6 cursor-pointer transition-colors ${liked ? "fill-red-500 text-red-500" : "text-foreground hover:text-muted-foreground"}`}
            onClick={() => setLiked(!liked)}
          />
          <MessageCircle className="w-6 h-6 text-foreground cursor-pointer hover:text-muted-foreground" />
          <Send className="w-6 h-6 text-foreground cursor-pointer hover:text-muted-foreground" />
        </div>
        <Bookmark
          className={`w-6 h-6 cursor-pointer transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground hover:text-muted-foreground"}`}
          onClick={() => setSaved(!saved)}
        />
      </div>

      {/* Likes */}
      <p className="text-sm font-semibold text-foreground px-1 mb-1">
        {likeCount.toLocaleString()} likes
      </p>

      {/* Caption */}
      <p className="text-sm text-foreground px-1">
        <span className="font-semibold">{username}</span>{" "}
        {caption}
      </p>

      {/* Comments link */}
      <p className="text-sm text-muted-foreground px-1 mt-1 cursor-pointer">
        View all {comments} comments
      </p>
    </article>
  );
};

export default PostCard;
