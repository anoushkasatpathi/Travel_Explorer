// Fonts used by the landing page (loaded in App.js with expo-font).
// If they fail to load, React Native silently falls back to the system font.
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

export const FONT_ASSETS = {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  DancingScript_700Bold,
  BebasNeue_400Regular,
};

export const fonts = {
  heading: 'Montserrat_800ExtraBold',
  black: 'Montserrat_900Black',
  bold: 'Montserrat_700Bold',
  semi: 'Montserrat_600SemiBold',
  script: 'DancingScript_700Bold',
  // bold condensed display face for the giant destination titles
  display: 'BebasNeue_400Regular',
};
