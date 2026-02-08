// Switch between 'inter', 'montserrat', 'dm-sans' to change the app font
// Keep in sync with lib/fonts.ts ACTIVE_FONT
const ACTIVE_FONT = 'dm-sans';

const FONT_MAP = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
  montserrat: {
    regular: 'Montserrat_400Regular',
    medium: 'Montserrat_500Medium',
    semibold: 'Montserrat_600SemiBold',
    bold: 'Montserrat_700Bold',
    extrabold: 'Montserrat_800ExtraBold',
  },
  'dm-sans': {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
    extrabold: 'DMSans_800ExtraBold',
  },
};

module.exports = FONT_MAP[ACTIVE_FONT];
