import gradientPresetsImport from '../../assets/presets.json';

export interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
  type: 'gradient' | 'color';
  category?: 'classic' | 'disney' | 'marvel' | 'hollywood';
}

export const defaultGradients: GradientPreset[] = gradientPresetsImport as GradientPreset[];

export const curatedMeshPalettes = [
  { name: 'Sunset', colors: ['#ff5f6d', '#ffc371', '#ff7e5f', '#feb47b'] },
  { name: 'Ocean', colors: ['#00c6ff', '#0072ff', '#0a2540', '#00d2ff'] },
  { name: 'Neon', colors: ['#f72585', '#7209b7', '#3f37c9', '#4cc9f0'] },
  { name: 'Forest', colors: ['#11998e', '#38ef7d', '#134e5e', '#71b280'] },
  { name: 'Aurora', colors: ['#0575e6', '#00f260', '#0f2027', '#203a43'] }
];

export const solidPresets = [
  { id: 'white', name: 'White', color: '#ffffff', type: 'color' as const },
  { id: 'black', name: 'Black', color: '#090d16', type: 'color' as const },
  { id: 'slate', name: 'Slate', color: '#475569', type: 'color' as const },
  { id: 'indigo', name: 'Indigo', color: '#6366f1', type: 'color' as const },
  { id: 'emerald', name: 'Emerald', color: '#10b981', type: 'color' as const },
  { id: 'rose', name: 'Rose', color: '#f43f5e', type: 'color' as const },
  { id: 'amber', name: 'Amber', color: '#f59e0b', type: 'color' as const },
  { id: 'sky', name: 'Sky', color: '#0ea5e9', type: 'color' as const },
];

export const disneyHollywoodGradients: GradientPreset[] = [
  // FANTASY & ANIMATION THEMES (Inspired by classics)
  {
    id: 'playtime-clouds',
    name: 'Playtime Clouds',
    gradient: 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 60%, #ffdf00 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'fjord-ice',
    name: 'Fjord Ice Castle',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 35%, #0284c7 70%, #0369a1 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'savannah-sunset',
    name: 'Savannah Sunset',
    gradient: 'linear-gradient(135deg, #1a0500 0%, #8b0000 35%, #ff4500 70%, #ffd700 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'arabian-nightfall',
    name: 'Arabian Nightfall',
    gradient: 'linear-gradient(135deg, #0b132b 0%, #1c2541 30%, #5bc0be 70%, #fdf0cd 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'mermaid-lagoon',
    name: 'Mermaid Lagoon',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 35%, #f43f5e 75%, #ca8a04 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'enchanted-ballroom',
    name: 'Enchanted Ballroom',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #ca8a04 80%, #fef08a 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'polynesian-voyage',
    name: 'Polynesian Voyage',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0d9488 40%, #10b981 70%, #fef08a 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'floating-lanterns',
    name: 'Floating Lanterns',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #581c87 40%, #c084fc 75%, #fde047 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'memories-marigold',
    name: 'Day of Memories',
    gradient: 'linear-gradient(135deg, #ff007f 0%, #7b2cbf 40%, #ff8c00 80%, #ffd700 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'scare-floor',
    name: 'Scare Floor Teal & Lime',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #84cc16 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'reef-explorer',
    name: 'Reef Explorer',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #ff781f 80%, #ffffff 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'island-ohana',
    name: 'Hawaiian Island Ohana',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #ef4444 50%, #22c55e 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'grecian-hero',
    name: 'Zero to Grecian Hero',
    gradient: 'linear-gradient(135deg, #2e0854 0%, #e05a47 50%, #fdf0cd 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'balloon-flight',
    name: 'Adventure Balloon Flight',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #3b82f6 50%, #10b981 75%, #38bdf8 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'blossom-reflection',
    name: 'Blossom Reflection',
    gradient: 'linear-gradient(135deg, #fda4af 0%, #f43f5e 35%, #0f766e 70%, #ca8a04 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'midnight-slipper',
    name: 'Midnight Slipper',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #38bdf8 50%, #c084fc 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'core-memories',
    name: 'Core Memories',
    gradient: 'linear-gradient(135deg, #facc15 0%, #3b82f6 30%, #ef4444 60%, #a855f7 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'space-ecology',
    name: 'Rusty Space Ecology',
    gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 40%, #065f46 80%, #f8fafc 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'astral-jazz',
    name: 'Astral Jazz',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 35%, #c084fc 70%, #f472b6 100%)',
    type: 'gradient',
    category: 'disney'
  },
  {
    id: 'sugar-rush',
    name: 'Sugar Rush Arcade',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 40%, #10b981 85%, #facc15 100%)',
    type: 'gradient',
    category: 'disney'
  },

  // HEROIC COMICS THEMES
  {
    id: 'reactor-core',
    name: 'Reactor Core Red & Gold',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 45%, #eab308 100%)',
    type: 'gradient',
    category: 'marvel'
  },
  {
    id: 'vibranium-royal',
    name: 'Vibranium Royal Purple',
    gradient: 'linear-gradient(135deg, #1e0030 0%, #5d0c8c 50%, #ca8a04 100%)',
    type: 'gradient',
    category: 'marvel'
  },
  {
    id: 'multiverse-neon',
    name: 'Multiverse Neon Spray',
    gradient: 'linear-gradient(135deg, #ff007f 0%, #7b2cbf 50%, #00f5d4 100%)',
    type: 'gradient',
    category: 'marvel'
  },
  {
    id: 'hero-alliance',
    name: 'Hero Alliance Assembly',
    gradient: 'linear-gradient(135deg, #000c24 0%, #0b3c5d 50%, #328cc1 100%)',
    type: 'gradient',
    category: 'marvel'
  },
  {
    id: 'voltage-surge',
    name: 'High-Voltage Surge',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 50%, #00f260 100%)',
    type: 'gradient',
    category: 'marvel'
  },

  // CINEMATIC & GOLDEN GLAMOUR
  {
    id: 'bubblegum-dollhouse',
    name: 'Bubblegum Dollhouse',
    gradient: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 50%, #fecfef 100%)',
    type: 'gradient',
    category: 'hollywood'
  },
  {
    id: 'red-carpet-gold',
    name: 'Red Carpet Gold',
    gradient: 'linear-gradient(135deg, #111111 0%, #3a301d 30%, #c5a059 70%, #fdf0cd 100%)',
    type: 'gradient',
    category: 'hollywood'
  },
  {
    id: 'space-saber',
    name: 'Deep Space Saber',
    gradient: 'linear-gradient(135deg, #020024 0%, #090979 35%, #00d4ff 100%)',
    type: 'gradient',
    category: 'hollywood'
  },
  {
    id: 'vintage-cinema',
    name: 'Vintage Cinema Glamour',
    gradient: 'linear-gradient(135deg, #b82e1f 0%, #e05a47 50%, #fcdcd4 100%)',
    type: 'gradient',
    category: 'hollywood'
  }
];

export interface MeshPalette {
  name: string;
  colors: string[];
  category: 'disney' | 'marvel' | 'hollywood';
}

export const disneyHollywoodMeshPalettes: MeshPalette[] = [
  // FANTASY & ANIMATION MESH PALETTES
  {
    name: 'Playtime Toys',
    colors: ['#38bdf8', '#facc15', '#ef4444', '#84cc16'],
    category: 'disney'
  },
  {
    name: 'Fjord Ice Castle',
    colors: ['#e0f2fe', '#7dd3fc', '#0284c7', '#a855f7'],
    category: 'disney'
  },
  {
    name: 'Savannah Dusk',
    colors: ['#7c2d12', '#ea580c', '#facc15', '#b45309'],
    category: 'disney'
  },
  {
    name: 'Desert Wonders',
    colors: ['#3b0764', '#0d9488', '#0ea5e9', '#ca8a04'],
    category: 'disney'
  },
  {
    name: 'Ocean Reef Lagoon',
    colors: ['#0f766e', '#06b6d4', '#f43f5e', '#ec4899'],
    category: 'disney'
  },
  {
    name: 'Golden Flower Lanterns',
    colors: ['#2e1065', '#6b21a8', '#c084fc', '#facc15'],
    category: 'disney'
  },
  {
    name: 'Memories Marigold',
    colors: ['#db2777', '#7c3aed', '#ea580c', '#eab308'],
    category: 'disney'
  },
  {
    name: 'Monstrous Teal',
    colors: ['#0891b2', '#7c3aed', '#a3e635', '#4d7c0f'],
    category: 'disney'
  },
  
  // HEROIC COMICS MESH PALETTES
  {
    name: 'Reactor Core',
    colors: ['#b91c1c', '#ea580c', '#eab308', '#1e293b'],
    category: 'marvel'
  },
  {
    name: 'Vibranium Purple',
    colors: ['#1e0030', '#5d0c8c', '#ca8a04', '#0f172a'],
    category: 'marvel'
  },
  {
    name: 'Multiverse Neon',
    colors: ['#ff007f', '#00f5d4', '#7b2cbf', '#f15bb5'],
    category: 'marvel'
  },
  {
    name: 'Thunder Storm',
    colors: ['#0284c7', '#eab308', '#ef4444', '#475569'],
    category: 'marvel'
  },

  // CINEMATIC MESH PALETTES
  {
    name: 'Bubblegum Dollhouse',
    colors: ['#ff758c', '#ff7eb3', '#fecfef', '#a5f3fc'],
    category: 'hollywood'
  },
  {
    name: 'Cinema Glamour',
    colors: ['#b91c1c', '#fdf0cd', '#c5a059', '#111111'],
    category: 'hollywood'
  },
  {
    name: 'Galactic Saber',
    colors: ['#030712', '#1d4ed8', '#06b6d4', '#ec4899'],
    category: 'hollywood'
  }
];
