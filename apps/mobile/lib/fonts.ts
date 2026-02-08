import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';

// Switch between 'inter', 'montserrat', 'dm-sans' to change the app font
const ACTIVE_FONT = 'dm-sans' as const;

const FONT_MAP = {
  inter: {
    regular: { name: 'Inter_400Regular', asset: Inter_400Regular },
    medium: { name: 'Inter_500Medium', asset: Inter_500Medium },
    semibold: { name: 'Inter_600SemiBold', asset: Inter_600SemiBold },
    bold: { name: 'Inter_700Bold', asset: Inter_700Bold },
    extrabold: { name: 'Inter_800ExtraBold', asset: Inter_800ExtraBold },
  },
  montserrat: {
    regular: { name: 'Montserrat_400Regular', asset: Montserrat_400Regular },
    medium: { name: 'Montserrat_500Medium', asset: Montserrat_500Medium },
    semibold: { name: 'Montserrat_600SemiBold', asset: Montserrat_600SemiBold },
    bold: { name: 'Montserrat_700Bold', asset: Montserrat_700Bold },
    extrabold: { name: 'Montserrat_800ExtraBold', asset: Montserrat_800ExtraBold },
  },
  'dm-sans': {
    regular: { name: 'DMSans_400Regular', asset: DMSans_400Regular },
    medium: { name: 'DMSans_500Medium', asset: DMSans_500Medium },
    semibold: { name: 'DMSans_600SemiBold', asset: DMSans_600SemiBold },
    bold: { name: 'DMSans_700Bold', asset: DMSans_700Bold },
    extrabold: { name: 'DMSans_800ExtraBold', asset: DMSans_800ExtraBold },
  },
} as const;

const active = FONT_MAP[ACTIVE_FONT];

export const FONTS = {
  regular: active.regular.name,
  medium: active.medium.name,
  semibold: active.semibold.name,
  bold: active.bold.name,
  extrabold: active.extrabold.name,
} as const;

export const FONT_ASSETS = {
  [active.regular.name]: active.regular.asset,
  [active.medium.name]: active.medium.asset,
  [active.semibold.name]: active.semibold.asset,
  [active.bold.name]: active.bold.asset,
  [active.extrabold.name]: active.extrabold.asset,
};
