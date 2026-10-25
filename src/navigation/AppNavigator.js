// Navigation layout (Stage 2):
//
//   Root stack
//   ├── Tabs  (top navigation bar, like the website template)
//   │   ├── Home          -> landing page: hero, search, packages, pricing, how it works
//   │   ├── Destinations  -> destination grid + search + filters
//   │   ├── Packages      -> Smart Trip Matcher (train budget slider)
//   │   ├── Buddies       -> Travel Buddy Finder
//   │   └── MyTrips       -> wishlist + trip planner
//   └── Details  (pushed on top of the tabs, reachable from every page)

import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Easing } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import DestinationsScreen from '../screens/DestinationsScreen';
import DetailsScreen from '../screens/DetailsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import MatcherScreen from '../screens/MatcherScreen';
import BuddyScreen from '../screens/BuddyScreen';
import TopNav from './TopNav';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();

// Shared, subtle fade-and-slide between tabs (cinematic easing)
const TAB_TRANSITION = {
  transitionSpec: {
    animation: 'timing',
    config: { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) },
  },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, -0.4, 0, 0.4, 1], outputRange: [0, 0, 1, 0, 0] }),
      transform: [
        { translateY: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-14, 0, 18] }) },
      ],
    },
  }),
};
const Tab = createBottomTabNavigator();

// Menu entries: label + [active icon, inactive icon] (Ionicons, used in the mobile drawer)
const NAV_ITEMS = {
  Home: { label: 'Home', icon: ['home', 'home-outline'] },
  Destinations: { label: 'Destinations', icon: ['compass', 'compass-outline'] },
  Packages: { label: 'Packages', icon: ['sparkles', 'sparkles-outline'] },
  Buddies: { label: 'Buddies', icon: ['people', 'people-outline'] },
  MyTrips: { label: 'My Trips', icon: ['heart', 'heart-outline'] },
};

function Tabs() {
  const { ids } = useWishlist();

  return (
    <Tab.Navigator
      // Navigation bar on TOP, drawn by our own TopNav component
      tabBar={(props) => <TopNav {...props} items={NAV_ITEMS} />}
      screenOptions={{ headerShown: false, tabBarPosition: 'top', ...TAB_TRANSITION }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Destinations" component={DestinationsScreen} />
      <Tab.Screen name="Packages" component={MatcherScreen} options={{ title: 'Trip Matcher' }} />
      <Tab.Screen name="Buddies" component={BuddyScreen} options={{ title: 'Travel Buddies' }} />
      <Tab.Screen
        name="MyTrips"
        component={WishlistScreen}
        options={{ title: 'My Trips', tabBarBadge: ids.length > 0 ? ids.length : undefined }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  // React Navigation also needs to know the colours (screen background, etc.)
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.tabBar,
      text: colors.ink,
      border: colors.line,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="Details"
          component={DetailsScreen}
          // With a hero flight the screen fades in under the flying image;
          // otherwise it slides in normally.
          options={({ route }) => ({ animation: route.params?.hero ? 'fade' : 'slide_from_right' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
