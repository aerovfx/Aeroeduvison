/**
 * AR Overlay Assets Configuration
 * Định nghĩa các biểu tượng AR có thể overlay lên face/head
 */

export interface ARAsset {
  id: string;
  name: string;
  icon: string;
  category: 'christmas' | 'japanese' | 'movie' | 'funny';
  type: 'hat' | 'mask' | 'accessory' | 'full-face';
  emoji: string; // Emoji preview
  description: string;
}

export const AR_ASSETS: ARAsset[] = [
  // 🎅 Christmas Category
  {
    id: 'santa-hat',
    name: 'Mũ Ông Già Noel',
    icon: '🎅',
    category: 'christmas',
    type: 'hat',
    emoji: '🎅',
    description: 'Mũ đỏ truyền thống của Santa Claus'
  },
  {
    id: 'reindeer-antlers',
    name: 'Sừng Tuần Lộc',
    icon: '🦌',
    category: 'christmas',
    type: 'accessory',
    emoji: '🦌',
    description: 'Sừng tuần lộc Rudolf với mũi đỏ'
  },
  {
    id: 'elf-hat',
    name: 'Mũ Yêu Tinh',
    icon: '🧝',
    category: 'christmas',
    type: 'hat',
    emoji: '🧝',
    description: 'Mũ nhọn xanh của yêu tinh Giáng Sinh'
  },
  {
    id: 'snowman',
    name: 'Người Tuyết',
    icon: '⛄',
    category: 'christmas',
    type: 'full-face',
    emoji: '⛄',
    description: 'Biến thành người tuyết với mũ và mũi cà rốt'
  },
  
  // 🎭 Japanese Masks
  {
    id: 'kitsune-mask',
    name: 'Mặt Nạ Cáo (Kitsune)',
    icon: '🦊',
    category: 'japanese',
    type: 'mask',
    emoji: '🦊',
    description: 'Mặt nạ cáo truyền thống Nhật Bản'
  },
  {
    id: 'oni-mask',
    name: 'Mặt Nạ Quỷ (Oni)',
    icon: '👹',
    category: 'japanese',
    type: 'mask',
    emoji: '👹',
    description: 'Mặt nạ quỷ đỏ Nhật Bản'
  },
  {
    id: 'tengu-mask',
    name: 'Mặt Nạ Tengu',
    icon: '👺',
    category: 'japanese',
    type: 'mask',
    emoji: '👺',
    description: 'Mặt nạ Tengu với mũi dài'
  },
  {
    id: 'kabuki-mask',
    name: 'Mặt Nạ Kabuki',
    icon: '🎭',
    category: 'japanese',
    type: 'mask',
    emoji: '🎭',
    description: 'Mặt nạ kịch Kabuki truyền thống'
  },
  
  // 🎬 Movie Characters
  {
    id: 'iron-man',
    name: 'Iron Man',
    icon: '🦾',
    category: 'movie',
    type: 'full-face',
    emoji: '🦸‍♂️',
    description: 'Mặt nạ Iron Man của Tony Stark'
  },
  {
    id: 'spider-man',
    name: 'Spider-Man',
    icon: '🕷️',
    category: 'movie',
    type: 'mask',
    emoji: '🕸️',
    description: 'Mặt nạ người nhện'
  },
  {
    id: 'batman',
    name: 'Batman',
    icon: '🦇',
    category: 'movie',
    type: 'mask',
    emoji: '🦇',
    description: 'Mặt nạ Batman với tai nhọn'
  },
  {
    id: 'deadpool',
    name: 'Deadpool',
    icon: '🔴',
    category: 'movie',
    type: 'mask',
    emoji: '💀',
    description: 'Mặt nạ Deadpool màu đỏ'
  },
  {
    id: 'joker',
    name: 'Joker',
    icon: '🤡',
    category: 'movie',
    type: 'full-face',
    emoji: '🃏',
    description: 'Mặt nạ Joker với nụ cười ma quái'
  },
  {
    id: 'stormtrooper',
    name: 'Stormtrooper',
    icon: '⚔️',
    category: 'movie',
    type: 'mask',
    emoji: '🎖️',
    description: 'Mũ bảo hiểm Stormtrooper từ Star Wars'
  },
  
  // 😄 Funny/Extra
  {
    id: 'pirate-hat',
    name: 'Mũ Cướp Biển',
    icon: '🏴‍☠️',
    category: 'funny',
    type: 'hat',
    emoji: '🏴‍☠️',
    description: 'Mũ cướp biển với đầu lâu'
  },
  {
    id: 'crown',
    name: 'Vương Miện',
    icon: '👑',
    category: 'funny',
    type: 'hat',
    emoji: '👑',
    description: 'Vương miện vàng sang trọng'
  },
  {
    id: 'party-hat',
    name: 'Mũ Tiệc',
    icon: '🎉',
    category: 'funny',
    type: 'hat',
    emoji: '🎊',
    description: 'Mũ nón sinh nhật đầy màu sắc'
  },
  {
    id: 'wizard-hat',
    name: 'Mũ Phù Thủy',
    icon: '🧙',
    category: 'funny',
    type: 'hat',
    emoji: '🔮',
    description: 'Mũ phù thủy với ngôi sao và trăng'
  }
];

// Helper functions
export const getAssetsByCategory = (category: ARAsset['category']) => {
  return AR_ASSETS.filter(asset => asset.category === category);
};

export const getAssetById = (id: string) => {
  return AR_ASSETS.find(asset => asset.id === id);
};

export const getAssetsByType = (type: ARAsset['type']) => {
  return AR_ASSETS.filter(asset => asset.type === type);
};

export const CATEGORY_LABELS: Record<ARAsset['category'], string> = {
  christmas: '🎄 Giáng Sinh',
  japanese: '🎭 Nhật Bản',
  movie: '🎬 Phim Ảnh',
  funny: '😄 Vui Nhộn'
};

export const TYPE_LABELS: Record<ARAsset['type'], string> = {
  hat: 'Mũ',
  mask: 'Mặt Nạ',
  accessory: 'Phụ Kiện',
  'full-face': 'Toàn Khuôn Mặt'
};

