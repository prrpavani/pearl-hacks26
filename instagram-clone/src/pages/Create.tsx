import { Image, Film, LayoutGrid } from "lucide-react";

const Create = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-[500px] bg-ig-elevated rounded-xl overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-center">
          <h3 className="text-base font-semibold text-foreground">Create new post</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-8">
          <div className="flex gap-2 mb-4">
            <Image className="w-16 h-16 text-muted-foreground" strokeWidth={1} />
            <Film className="w-16 h-16 text-muted-foreground" strokeWidth={1} />
          </div>
          <p className="text-xl text-foreground mb-4">Drag photos and videos here</p>
          <button className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Select from computer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Create;
