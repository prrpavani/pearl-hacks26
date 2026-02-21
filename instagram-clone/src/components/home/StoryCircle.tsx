import { Plus, User } from "lucide-react";

interface StoryCircleProps {
  username: string;
  isYou?: boolean;
}

const StoryCircle = ({ username, isYou }: StoryCircleProps) => {
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
      <div className={`relative w-16 h-16 rounded-full ${isYou ? "" : "p-[2px]"}`}
        style={!isYou ? { background: "var(--ig-story-gradient)" } : undefined}
      >
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center p-[2px]">
          <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
        {isYou && (
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs text-foreground truncate w-16 text-center">
        {isYou ? "Your story" : username}
      </span>
    </div>
  );
};

export default StoryCircle;
