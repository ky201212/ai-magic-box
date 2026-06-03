export type ProfileAvatarPreset = {
  id: string;
  name: string;
  url: string;
  accentColor: string;
  description: string;
};

export const PROFILE_AVATAR_PRESETS: ProfileAvatarPreset[] = [
  {
    id: "rocket-captain",
    name: "火箭队长",
    url: "/profile-avatars/avatar-rocket-captain.png",
    accentColor: "#7b72ff",
    description: "戴着航天头盔，胸前有小火箭徽章。",
  },
  {
    id: "robot-inventor",
    name: "机甲发明家",
    url: "/profile-avatars/avatar-robot-inventor.png",
    accentColor: "#4db8d8",
    description: "蓝绿色的小机器人，手里拿着修理工具。",
  },
  {
    id: "planet-explorer",
    name: "星球探险家",
    url: "/profile-avatars/avatar-planet-explorer.png",
    accentColor: "#9a70f6",
    description: "紫金配色的宇航服，带着笑脸星球徽章。",
  },
  {
    id: "paint-artist",
    name: "灵感画家",
    url: "/profile-avatars/avatar-paint-artist.png",
    accentColor: "#48c6c4",
    description: "拿着画笔和调色盘，适合爱绘画的小创作者。",
  },
  {
    id: "music-creator",
    name: "音乐能量师",
    url: "/profile-avatars/avatar-music-creator.png",
    accentColor: "#ff6ea8",
    description: "戴着大耳机，氛围感很强的音乐创作者。",
  },
  {
    id: "code-wizard",
    name: "代码魔法师",
    url: "/profile-avatars/avatar-code-wizard.png",
    accentColor: "#4f7cff",
    description: "穿着代码斗篷，适合喜欢编程的小魔法师。",
  },
];

const avatarPresetUrlSet = new Set(
  PROFILE_AVATAR_PRESETS.map((preset) => preset.url),
);

export function getDefaultProfileAvatarPreset() {
  return PROFILE_AVATAR_PRESETS[0];
}

export function getProfileAvatarPresetByUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  return PROFILE_AVATAR_PRESETS.find((preset) => preset.url === url) ?? null;
}

export function isProfileAvatarPresetUrl(url: string | null | undefined) {
  return Boolean(url && avatarPresetUrlSet.has(url));
}
