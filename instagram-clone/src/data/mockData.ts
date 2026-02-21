import post1 from "@/assets/post1.jpg";
import post2 from "@/assets/post2.jpg";
import post3 from "@/assets/post3.jpg";
import post4 from "@/assets/post4.jpg";
import post5 from "@/assets/post5.jpg";
import post6 from "@/assets/post6.jpg";

export const stories = [
  { id: 1, username: "your_story", avatar: "", isYou: true },
  { id: 2, username: "alex.photo", avatar: "" },
  { id: 3, username: "sarah_travels", avatar: "" },
  { id: 4, username: "chef.marco", avatar: "" },
  { id: 5, username: "urban_lens", avatar: "" },
  { id: 6, username: "beach.life", avatar: "" },
  { id: 7, username: "arch.daily", avatar: "" },
  { id: 8, username: "designhub", avatar: "" },
];

export const posts = [
  {
    id: 1,
    username: "alex.photo",
    avatar: "",
    image: post1,
    caption: "Golden hour never disappoints 🌅",
    likes: 1243,
    comments: 42,
    timeAgo: "2h",
  },
  {
    id: 2,
    username: "chef.marco",
    avatar: "",
    image: post2,
    caption: "Perfect morning starts with the perfect cup ☕",
    likes: 892,
    comments: 31,
    timeAgo: "4h",
  },
  {
    id: 3,
    username: "urban_lens",
    avatar: "",
    image: post3,
    caption: "City lights, city nights 🌃",
    likes: 2104,
    comments: 87,
    timeAgo: "6h",
  },
  {
    id: 4,
    username: "chef.marco",
    avatar: "",
    image: post4,
    caption: "Fresh pasta, simple ingredients, incredible flavors 🍝",
    likes: 3421,
    comments: 156,
    timeAgo: "8h",
  },
  {
    id: 5,
    username: "sarah_travels",
    avatar: "",
    image: post5,
    caption: "Paradise found 🏝️",
    likes: 5672,
    comments: 234,
    timeAgo: "12h",
  },
  {
    id: 6,
    username: "arch.daily",
    avatar: "",
    image: post6,
    caption: "Lines and reflections ✨",
    likes: 1890,
    comments: 67,
    timeAgo: "1d",
  },
];

export const exploreImages = [post1, post2, post3, post4, post5, post6, post1, post2, post3, post4, post5, post6];

export const suggestions = [
  { username: "design.daily", name: "Design Daily", followers: "12.4K" },
  { username: "foodie.world", name: "Foodie World", followers: "8.2K" },
  { username: "travel.more", name: "Travel More", followers: "24.1K" },
  { username: "fit.life", name: "Fit Life", followers: "5.7K" },
  { username: "art.vision", name: "Art Vision", followers: "18.9K" },
];
