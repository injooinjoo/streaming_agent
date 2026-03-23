const PLATFORM_LOGO_MAP = {
  soop: '/assets/logos/soop.png',
  chzzk: '/assets/logos/chzzk.png',
  youtube: '/assets/logos/youtube.png',
  twitch: '/assets/logos/twitch.png',
  cimi: '/assets/logos/chzzk.png',
};

const PLATFORM_ACCENT_MAP = {
  soop: '#4f8cff',
  chzzk: '#1ecb86',
  youtube: '#ff5a6a',
  twitch: '#9d72ff',
  cimi: '#ff8aa1',
};

const createArtworkDataUrl = ({ title, kicker, accent, accentSoft, shadow, grain = '18' }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" fill="none">
      <defs>
        <linearGradient id="bg" x1="120" y1="72" x2="1080" y2="828" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0B1220"/>
          <stop offset="1" stop-color="#060A12"/>
        </linearGradient>
        <linearGradient id="accentGlow" x1="221" y1="108" x2="917" y2="748" gradientUnits="userSpaceOnUse">
          <stop stop-color="${accent}" stop-opacity="0.86"/>
          <stop offset="1" stop-color="${accentSoft}" stop-opacity="0.22"/>
        </linearGradient>
        <linearGradient id="panel" x1="724" y1="92" x2="1050" y2="816" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(255,255,255,0.16)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0.02)"/>
        </linearGradient>
        <filter id="blurGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="40"/>
        </filter>
        <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <rect width="1200" height="900" fill="url(#grid)" opacity="${grain}"/>
      <circle cx="284" cy="180" r="208" fill="url(#accentGlow)" filter="url(#blurGlow)"/>
      <circle cx="924" cy="724" r="184" fill="${shadow}" opacity="0.32" filter="url(#blurGlow)"/>
      <rect x="830" y="92" width="280" height="716" rx="38" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
      <rect x="876" y="138" width="190" height="238" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)"/>
      <rect x="876" y="422" width="154" height="20" rx="10" fill="rgba(255,255,255,0.14)"/>
      <rect x="876" y="458" width="186" height="14" rx="7" fill="rgba(255,255,255,0.08)"/>
      <rect x="876" y="490" width="172" height="14" rx="7" fill="rgba(255,255,255,0.08)"/>
      <rect x="476" y="96" width="248" height="40" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)"/>
      <text x="600" y="121" text-anchor="middle" fill="#E6EDF8" font-size="17" font-family="SUIT Variable, Arial, sans-serif" letter-spacing="4">${kicker}</text>
      <text x="600" y="560" text-anchor="middle" fill="#F8FBFF" font-size="104" font-weight="700" font-family="Space Grotesk, SUIT Variable, Arial, sans-serif" letter-spacing="-5">${title}</text>
      <text x="600" y="618" text-anchor="middle" fill="rgba(226,232,240,0.78)" font-size="24" font-family="SUIT Variable, Arial, sans-serif">Streaming visual poster</text>
      <path d="M252 682C362 614 456 586 592 596C704 604 792 646 872 704" stroke="${accent}" stroke-opacity="0.9" stroke-width="18" stroke-linecap="round"/>
      <path d="M284 748C404 700 500 690 604 706" stroke="rgba(255,255,255,0.22)" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const DEFAULT_MEDIA_FALLBACK = {
  imageUrl: createArtworkDataUrl({
    title: 'LIVE',
    kicker: 'STUDIO',
    accent: '#4f8cff',
    accentSoft: '#12274b',
    shadow: '#1d4ed8',
  }),
  thumbnailUrl: createArtworkDataUrl({
    title: 'LIVE',
    kicker: 'STUDIO',
    accent: '#4f8cff',
    accentSoft: '#12274b',
    shadow: '#1d4ed8',
  }),
};

const CATEGORY_ID_MAP = {
  1: 'league',
  2: 'maple',
  3: 'sports',
  4: 'chat',
  5: 'valorant',
  6: 'dnf',
  7: 'virtual',
  8: 'battlegrounds',
};

const createCategoryMedia = ({
  kicker,
  accent,
  imageUrl,
  thumbnailUrl,
  aliases,
}) => ({
  kicker,
  accent,
  imageUrl,
  thumbnailUrl,
  aliases,
});

const CATEGORY_MEDIA_MAP = {
  league: createCategoryMedia({
    kicker: 'MOBA',
    accent: '#5b67ff',
    imageUrl: createArtworkDataUrl({
      title: 'LEAGUE',
      kicker: 'MOBA',
      accent: '#5b67ff',
      accentSoft: '#16224d',
      shadow: '#2a3eb5',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'LEAGUE',
      kicker: 'MOBA',
      accent: '#5b67ff',
      accentSoft: '#16224d',
      shadow: '#2a3eb5',
    }),
    aliases: [
      'leagueoflegends',
      'league',
      'lol',
      '\ub9ac\uadf8 \uc624\ube0c \ub808\uc804\ub4dc',
      '\ub9ac\uadf8',
      '\ub864',
    ],
  }),
  maple: createCategoryMedia({
    kicker: 'MMO',
    accent: '#f4b942',
    imageUrl: createArtworkDataUrl({
      title: 'MAPLE',
      kicker: 'MMO',
      accent: '#f4b942',
      accentSoft: '#4d3312',
      shadow: '#b96a11',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'MAPLE',
      kicker: 'MMO',
      accent: '#f4b942',
      accentSoft: '#4d3312',
      shadow: '#b96a11',
    }),
    aliases: ['maplestory', '\uba54\uc774\ud50c\uc2a4\ud1a0\ub9ac', '\uba54\uc774\ud50c'],
  }),
  sports: createCategoryMedia({
    kicker: 'Sports',
    accent: '#4fd1c5',
    imageUrl: createArtworkDataUrl({
      title: 'FC',
      kicker: 'SPORTS',
      accent: '#4fd1c5',
      accentSoft: '#123d40',
      shadow: '#0f766e',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'FC',
      kicker: 'SPORTS',
      accent: '#4fd1c5',
      accentSoft: '#123d40',
      shadow: '#0f766e',
    }),
    aliases: [
      'fc',
      'fconline',
      'easportsfc',
      'fifa',
      'fifaonline',
      'ea',
      'fc online',
      '\ud53c\ud30c',
      'fc \uc628\ub77c\uc778',
      '\ud53c\ud30c \uc628\ub77c\uc778',
    ],
  }),
  chat: createCategoryMedia({
    kicker: 'Talk',
    accent: '#ff875f',
    imageUrl: createArtworkDataUrl({
      title: 'TALK',
      kicker: 'LIVE',
      accent: '#ff875f',
      accentSoft: '#4d1f17',
      shadow: '#c2410c',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'TALK',
      kicker: 'LIVE',
      accent: '#ff875f',
      accentSoft: '#4d1f17',
      shadow: '#c2410c',
    }),
    aliases: [
      'justchatting',
      'chatting',
      'talk',
      '\uc800\uc2a4\ud2b8 \ucc44\ud305',
      '\ucc44\ud305',
      '\uc18c\ud1b5',
    ],
  }),
  valorant: createCategoryMedia({
    kicker: 'FPS',
    accent: '#ef476f',
    imageUrl: createArtworkDataUrl({
      title: 'VALO',
      kicker: 'FPS',
      accent: '#ef476f',
      accentSoft: '#4f1626',
      shadow: '#be123c',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'VALO',
      kicker: 'FPS',
      accent: '#ef476f',
      accentSoft: '#4f1626',
      shadow: '#be123c',
    }),
    aliases: ['valorant', '\ubc1c\ub85c\ub780\ud2b8'],
  }),
  dnf: createCategoryMedia({
    kicker: 'Action',
    accent: '#a855f7',
    imageUrl: createArtworkDataUrl({
      title: 'DNF',
      kicker: 'ACTION',
      accent: '#a855f7',
      accentSoft: '#31114f',
      shadow: '#7e22ce',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'DNF',
      kicker: 'ACTION',
      accent: '#a855f7',
      accentSoft: '#31114f',
      shadow: '#7e22ce',
    }),
    aliases: ['dnf', 'dungeonfighter', '\ub358\uc804\uc564\ud30c\uc774\ud130', '\ub358\ud30c'],
  }),
  battlegrounds: createCategoryMedia({
    kicker: 'Battle',
    accent: '#34d399',
    imageUrl: createArtworkDataUrl({
      title: 'PUBG',
      kicker: 'BATTLE',
      accent: '#34d399',
      accentSoft: '#12392f',
      shadow: '#047857',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'PUBG',
      kicker: 'BATTLE',
      accent: '#34d399',
      accentSoft: '#12392f',
      shadow: '#047857',
    }),
    aliases: ['pubg', 'battlegrounds', '\ubc30\ud2c0\uadf8\ub77c\uc6b4\ub4dc', '\ubc30\uadf8'],
  }),
  virtual: createCategoryMedia({
    kicker: 'Virtual',
    accent: '#ff6fd8',
    imageUrl: createArtworkDataUrl({
      title: 'VIRTUAL',
      kicker: 'LIVE',
      accent: '#ff6fd8',
      accentSoft: '#4b183d',
      shadow: '#be185d',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'VIRTUAL',
      kicker: 'LIVE',
      accent: '#ff6fd8',
      accentSoft: '#4b183d',
      shadow: '#be185d',
    }),
    aliases: ['virtual', 'vtuber', '\ubc84\uce04\uc5bc', '\ubc84\ucd94\uc5bc'],
  }),
  sudden: createCategoryMedia({
    kicker: 'Shooter',
    accent: '#22c55e',
    imageUrl: createArtworkDataUrl({
      title: 'SUDDEN',
      kicker: 'SHOOTER',
      accent: '#22c55e',
      accentSoft: '#14381d',
      shadow: '#15803d',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'SUDDEN',
      kicker: 'SHOOTER',
      accent: '#22c55e',
      accentSoft: '#14381d',
      shadow: '#15803d',
    }),
    aliases: ['suddenattack', '\uc11c\ub4e0\uc5b4\ud0dd', '\uc11c\ub4e0'],
  }),
  variety: createCategoryMedia({
    kicker: 'Variety',
    accent: '#7c5cff',
    imageUrl: createArtworkDataUrl({
      title: 'VARIETY',
      kicker: 'MIX',
      accent: '#7c5cff',
      accentSoft: '#1f1945',
      shadow: '#4338ca',
    }),
    thumbnailUrl: createArtworkDataUrl({
      title: 'VARIETY',
      kicker: 'MIX',
      accent: '#7c5cff',
      accentSoft: '#1f1945',
      shadow: '#4338ca',
    }),
    aliases: ['variety', '\uc885\ud569\uac8c\uc784', '\uba40\ud2f0\uac8c\uc784'],
  }),
};

const STREAMER_MEDIA_MAP = {
  s101: { accent: '#4f8cff' },
  s102: { accent: '#ff6fd8' },
  s103: { accent: '#4fd1c5' },
  s104: { accent: '#5b67ff' },
  s105: { accent: '#ff875f' },
  s106: { accent: '#ef476f' },
  s107: { accent: '#34d399' },
  s108: { accent: '#ff875f' },
  s109: { accent: '#ff6fd8' },
  s110: { accent: '#ff6fd8' },
  s111: { accent: '#4fd1c5' },
  s112: { accent: '#f4b942' },
  s201: { accent: '#5b67ff' },
  s202: { accent: '#ff6fd8' },
  s203: { accent: '#ef476f' },
  s204: { accent: '#ff875f' },
};

const cleanKey = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u3131-\u318e\uac00-\ud7a3]/g, '');

const splitCategoryCandidates = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitCategoryCandidates(item));
  }

  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return [];

  return normalizedValue.split(/[|,/]+/).map((item) => item.trim()).filter(Boolean);
};

const findCategoryMediaByName = (value) => {
  const cleaned = cleanKey(value);
  if (!cleaned) return null;

  return (
    Object.values(CATEGORY_MEDIA_MAP).find((entry) =>
      entry.aliases.some((alias) => {
        const normalizedAlias = cleanKey(alias);
        return (
          normalizedAlias &&
          (cleaned.includes(normalizedAlias) || normalizedAlias.includes(cleaned))
        );
      })
    ) || null
  );
};

export const getPlatformLogo = (platform) => PLATFORM_LOGO_MAP[cleanKey(platform)] || null;

export const getPlatformAccent = (platform) =>
  PLATFORM_ACCENT_MAP[cleanKey(platform)] || '#7c8aa3';

export const getInitials = (value) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '?';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

export const resolveImageCandidate = (...candidates) =>
  candidates
    .flat()
    .find((value) => typeof value === 'string' && value.trim().length);

export const getCategoryMedia = (gameIdOrName) => {
  for (const candidate of splitCategoryCandidates(gameIdOrName)) {
    const foundByName = findCategoryMediaByName(candidate);
    if (foundByName) return foundByName;
  }

  if (
    typeof gameIdOrName === 'number' ||
    (typeof gameIdOrName === 'string' && /^\d+$/.test(gameIdOrName))
  ) {
    const mappedKey = CATEGORY_ID_MAP[Number(gameIdOrName)];
    return mappedKey ? CATEGORY_MEDIA_MAP[mappedKey] || null : null;
  }

  return null;
};

const buildDicebearAvatar = (seed) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    seed || 'stream'
  )}&backgroundColor=1f2937,27364a,0f766e&textColor=ffffff`;

export const normalizeMediaEntity = (entity = {}, options = {}) => {
  const categoryMedia = getCategoryMedia([
    options.gameName,
    entity.category_name,
    entity.categoryName,
    entity.categories,
    entity.nameKr,
    entity.name_kr,
    entity.mainCategory,
    entity.gameName,
    entity.game_name,
    entity.name,
    options.label,
    options.gameId,
    entity.gameId,
    entity.categoryId,
    entity.category_id,
  ]);

  const platformKey =
    options.platform || entity.platform || entity.platformCode || entity.platformKey;
  const logoUrl = resolveImageCandidate(
    entity.logoUrl,
    entity.logo_url,
    entity.platformLogo,
    getPlatformLogo(platformKey)
  );

  const imageUrl = resolveImageCandidate(
    entity.imageUrl,
    entity.image_url,
    entity.coverUrl,
    entity.cover_url,
    entity.thumbnailUrl,
    entity.thumbnail_url,
    entity.broadcastThumbnail,
    options.imageUrl,
    categoryMedia?.imageUrl
  );

  const thumbnailUrl = resolveImageCandidate(
    entity.thumbnailUrl,
    entity.thumbnail_url,
    entity.imageUrl,
    entity.image_url,
    options.thumbnailUrl,
    categoryMedia?.thumbnailUrl,
    imageUrl
  );

  const avatarUrl = resolveImageCandidate(
    entity.avatarUrl,
    entity.avatar_url,
    entity.profile_image_url,
    entity.profileImageUrl,
    options.avatarUrl,
    buildDicebearAvatar(entity.nickname || entity.name || entity.displayName || entity.personId)
  );

  return {
    imageUrl: imageUrl || categoryMedia?.imageUrl || DEFAULT_MEDIA_FALLBACK.imageUrl,
    thumbnailUrl:
      thumbnailUrl ||
      categoryMedia?.thumbnailUrl ||
      imageUrl ||
      DEFAULT_MEDIA_FALLBACK.thumbnailUrl,
    avatarUrl,
    logoUrl,
    accent:
      entity.accent ||
      options.accent ||
      STREAMER_MEDIA_MAP[entity.personId]?.accent ||
      categoryMedia?.accent ||
      getPlatformAccent(platformKey),
    kicker: entity.kicker || options.kicker || categoryMedia?.kicker || null,
    initials: getInitials(entity.nickname || entity.name || entity.displayName || options.label),
  };
};

export const enrichViewershipStreamer = (streamer) => {
  const media = normalizeMediaEntity(streamer, {
    gameId: streamer.gameId,
    gameName: streamer.category_name || streamer.categoryName || streamer.mainCategory,
    platform: streamer.platform,
    label: streamer.name,
  });

  return {
    ...streamer,
    ...media,
    stats: [
      { label: '\uc2e4\uc2dc\uac04', value: streamer.liveViewers },
      { label: '\ud3c9\uade0', value: streamer.avgViewers },
    ],
  };
};

export const enrichViewershipCategory = (category) => {
  const media = normalizeMediaEntity(category, {
    gameId: category.gameId,
    gameName: category.nameKr || category.category_name || category.categoryName || category.name,
    label: category.nameKr || category.name,
  });

  return {
    ...category,
    ...media,
    stats: [
      { label: '\uc2dc\uccad', value: category.totalViewers },
      { label: '\ucc44\ub110', value: category.liveChannels },
    ],
  };
};
