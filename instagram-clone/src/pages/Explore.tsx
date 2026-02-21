import { exploreImages } from "@/data/mockData";
import { Search } from "lucide-react";

const Explore = () => {
  return (
    <div className="max-w-[935px] mx-auto px-5 pt-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-ig-elevated text-foreground text-sm rounded-lg pl-10 pr-4 py-2.5 placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1 pb-8">
        {exploreImages.map((img, i) => (
          <div
            key={i}
            className={`cursor-pointer overflow-hidden ${
              i % 5 === 2 ? "row-span-2" : ""
            }`}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover hover:opacity-80 transition-opacity"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Explore;
