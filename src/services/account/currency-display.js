const NATION_CP_COLUMNS = {
  0: 'sandoria_cp',
  1: 'bastok_cp',
  2: 'windurst_cp',
};

const GENERAL_CURRENCIES = [
  { key: 'conquest_points', label: 'Conquest Points', nationCp: true },
  { key: 'imperial_standing', label: 'Imperial Standing', column: 'imperial_standing' },
  { key: 'allied_notes', label: 'Allied Notes', column: 'allied_notes' },
  { key: 'leujaoam_assault_point', label: 'Leujaoam Assault Points', column: 'leujaoam_assault_point' },
  { key: 'mamool_assault_point', label: 'Mamool Assault Points', column: 'mamool_assault_point' },
  { key: 'lebros_assault_point', label: 'Lebros Assault Points', column: 'lebros_assault_point' },
  { key: 'periqia_assault_point', label: 'Periqia Assault Points', column: 'periqia_assault_point' },
  { key: 'ilrusi_assault_point', label: 'Ilrusi Assault Points', column: 'ilrusi_assault_point' },
  { key: 'nyzul_isle_assault_point', label: 'Nyzul Isle Assault Points', column: 'nyzul_isle_assault_point' },
  { key: 'zeni_point', label: 'Zeni Points', column: 'zeni_point' },
  { key: 'therion_ichor', label: 'Therion Ichor', column: 'therion_ichor' },
  { key: 'beastman_seal', label: 'Beastman Seals', column: 'beastman_seal' },
  { key: 'kindred_seal', label: 'Kindred Seals', column: 'kindred_seal' },
  { key: 'cruor', label: 'Cruor', column: 'cruor' },
  { key: 'id_tags', label: 'ID Tags', column: 'id_tags' },
  { key: 'traverser_stones', label: 'Traverser Stones', column: 'traverser_stones' },
];

const CRYSTAL_CURRENCIES = [
  { key: 'fire_crystals', label: 'Fire Crystals', column: 'fire_crystals' },
  { key: 'ice_crystals', label: 'Ice Crystals', column: 'ice_crystals' },
  { key: 'wind_crystals', label: 'Wind Crystals', column: 'wind_crystals' },
  { key: 'earth_crystals', label: 'Earth Crystals', column: 'earth_crystals' },
  { key: 'lightning_crystals', label: 'Lightning Crystals', column: 'lightning_crystals' },
  { key: 'water_crystals', label: 'Water Crystals', column: 'water_crystals' },
  { key: 'light_crystals', label: 'Light Crystals', column: 'light_crystals' },
  { key: 'dark_crystals', label: 'Dark Crystals', column: 'dark_crystals' },
];

const GP_CURRENCIES = [
  { key: 'guild_fishing', label: 'Fishing GP', column: 'guild_fishing' },
  { key: 'guild_woodworking', label: 'Woodworking GP', column: 'guild_woodworking' },
  { key: 'guild_smithing', label: 'Smithing GP', column: 'guild_smithing' },
  { key: 'guild_goldsmithing', label: 'Goldsmithing GP', column: 'guild_goldsmithing' },
  { key: 'guild_weaving', label: 'Weaving GP', column: 'guild_weaving' },
  { key: 'guild_leathercraft', label: 'Leathercraft GP', column: 'guild_leathercraft' },
  { key: 'guild_bonecraft', label: 'Bonecraft GP', column: 'guild_bonecraft' },
  { key: 'guild_alchemy', label: 'Alchemy GP', column: 'guild_alchemy' },
  { key: 'guild_cooking', label: 'Cooking GP', column: 'guild_cooking' },
];

export const CHAR_POINTS_COLUMNS = [
  ...Object.values(NATION_CP_COLUMNS),
  ...GENERAL_CURRENCIES.filter((entry) => entry.column).map((entry) => entry.column),
  ...CRYSTAL_CURRENCIES.map((entry) => entry.column),
  ...GP_CURRENCIES.map((entry) => entry.column),
];

function readCurrencyValue(pointsRow, entry, nationId) {
  if (entry.nationCp) {
    const column = NATION_CP_COLUMNS[nationId];
    if (!column) {
      return 0;
    }
    return Number(pointsRow?.[column] ?? 0);
  }

  return Number(pointsRow?.[entry.column] ?? 0);
}

function mapCurrencyItems(pointsRow, nationId, entries) {
  return entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: readCurrencyValue(pointsRow, entry, nationId),
  }));
}

export function buildProfileCurrencies(pointsRow, nationId) {
  return [
    {
      key: 'general',
      label: null,
      items: mapCurrencyItems(pointsRow, nationId, GENERAL_CURRENCIES),
    },
    {
      key: 'crafting',
      label: 'Crafting',
      groups: [
        {
          key: 'crystals',
          label: 'Crystals',
          items: mapCurrencyItems(pointsRow, nationId, CRYSTAL_CURRENCIES),
        },
        {
          key: 'gp',
          label: 'GP',
          items: mapCurrencyItems(pointsRow, nationId, GP_CURRENCIES),
        },
      ],
    },
  ];
}
