// client/src/lib/presets.js
// ─────────────────────────────────────────────────────────────
// Preset question banks — each has a question + 4 options with photos
// Photos are from Unsplash (free, no API key needed)
// ─────────────────────────────────────────────────────────────

export const PRESET_SETS = [
  {
    id: "drink",
    label: "Favourite Drink",
    emoji: "🥤",
    question: "What is {name}'s favourite drink?",
    bgPhoto: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&q=80",
    bgColor: "rgba(0, 60, 100, 0.5)",
    options: [
      { label: "Tea",    photo: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=75" },
      { label: "Beer",   photo: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=75" },
      { label: "Soda",   photo: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=75" },
      { label: "Juice",  photo: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=75" },
    ],
  },
  {
    id: "subject",
    label: "Favourite Subject",
    emoji: "📚",
    question: "What is {name}'s favourite subject?",
    bgPhoto: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80",
    bgColor: "rgba(20, 60, 20, 0.5)",
    options: [
      { label: "English",  photo: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&q=75" },
      { label: "Maths",    photo: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=75" },
      { label: "Science",  photo: "https://images.unsplash.com/photo-1532094349884-543559c5f185?w=600&q=75" },
      { label: "Art",      photo: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=600&q=75" },
    ],
  },
  {
    id: "cake",
    label: "Favourite Cake Flavour",
    emoji: "🎂",
    question: "What is {name}'s favourite cake flavour?",
    bgPhoto: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900&q=80",
    bgColor: "rgba(120, 40, 60, 0.45)",
    options: [
      { label: "Chocolate", photo: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=75" },
      { label: "Vanilla",   photo: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=75" },
      { label: "Strawberry",photo: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=75" },
      { label: "Red Velvet",photo: "https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=600&q=75" },
    ],
  },
  {
    id: "sport",
    label: "Favourite Sport",
    emoji: "⚽",
    question: "What is {name}'s favourite sport?",
    bgPhoto: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
    bgColor: "rgba(10, 60, 10, 0.5)",
    options: [
      { label: "Football",   photo: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=75" },
      { label: "Basketball", photo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=75" },
      { label: "Tennis",     photo: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=75" },
      { label: "Swimming",   photo: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=75" },
    ],
  },
  {
    id: "house",
    label: "Dream House Style",
    emoji: "🏠",
    question: "What is {name}'s dream house style?",
    bgPhoto: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=900&q=80",
    bgColor: "rgba(60, 40, 10, 0.45)",
    options: [
      { label: "Modern",      photo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=75" },
      { label: "Traditional", photo: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=75" },
      { label: "Villa",       photo: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=75" },
      { label: "Penthouse",   photo: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=75" },
    ],
  },
  {
    id: "car",
    label: "Favourite Car Brand",
    emoji: "🚗",
    question: "What is {name}'s favourite car brand?",
    bgPhoto: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=80",
    bgColor: "rgba(10, 10, 40, 0.5)",
    options: [
      { label: "Honda",   photo: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&q=75" },
      { label: "Toyota",  photo: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=75" },
      { label: "Benz",    photo: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=75" },
      { label: "BMW",     photo: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=75" },
    ],
  },
  {
    id: "movie",
    label: "Favourite Movie Genre",
    emoji: "🎬",
    question: "What is {name}'s favourite movie genre?",
    bgPhoto: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&q=80",
    bgColor: "rgba(60, 0, 60, 0.5)",
    options: [
      { label: "Action",  photo: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&q=75" },
      { label: "Comedy",  photo: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=600&q=75" },
      { label: "Horror",  photo: "https://images.unsplash.com/photo-1560109947-543149eceb16?w=600&q=75" },
      { label: "Romance", photo: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=75" },
    ],
  },
  {
    id: "music",
    label: "Favourite Music Genre",
    emoji: "🎵",
    question: "What is {name}'s favourite music genre?",
    bgPhoto: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&q=80",
    bgColor: "rgba(80, 0, 80, 0.45)",
    options: [
      { label: "Afrobeats", photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=75" },
      { label: "Hip-Hop",   photo: "https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=600&q=75" },
      { label: "R&B",       photo: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=75" },
      { label: "Pop",       photo: "https://images.unsplash.com/photo-1501386761578-eaa54b22f8c5?w=600&q=75" },
    ],
  },
];

// Unsplash search URL builder for custom question options
// Used when creator adds a custom option — we auto-fetch a relevant photo
export function getUnsplashPhoto(query) {
  // Use Unsplash source API — returns a relevant photo for the keyword, no API key needed
  const encoded = encodeURIComponent(query.toLowerCase().trim());
  return `https://source.unsplash.com/600x800/?${encoded}`;
}
