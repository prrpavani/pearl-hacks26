import { Search } from "lucide-react";
import { exploreImages } from "@/data/mockData";

const SearchPage = () => {
  return (
    <div className="max-w-[935px] mx-auto px-5 pt-6">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-ig-elevated text-foreground text-sm rounded-lg pl-10 pr-4 py-2.5 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
      </div>

      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground mb-3">Recent</h3>
        <p className="text-sm text-muted-foreground">No recent searches.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 pb-8">
        {exploreImages.slice(0, 9).map((img, i) => (
          <div key={i} className="aspect-square cursor-pointer overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
