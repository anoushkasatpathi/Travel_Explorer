// Home (landing page) built from the "Travel Around The World" template:
// hero → search card → feature tiles → popular packages → pricing guides →
// how it works → stats & tip → footer.

import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import HeroBanner from '../home/HeroBanner';
import SearchWidget from '../home/SearchWidget';
import { FeatureTiles, Footer, HowItWorks, PopularPackages, PricingPlans, StatsBand } from '../home/Sections';
import { useThemedStyles } from '../context/ThemeContext';

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  const wide = width >= 900;
  const pad = wide ? 40 : 16;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
      <HeroBanner width={width} onExplore={() => navigation.navigate('Destinations', { t: Date.now() })} />

      <View style={[styles.container, { paddingHorizontal: pad }]}>
        <View style={[styles.searchWrap, { marginTop: wide ? -118 : -96 }]}>
          <SearchWidget width={width} navigation={navigation} />
        </View>

        <View style={styles.block}>
          <FeatureTiles width={width} navigation={navigation} />
        </View>
        <View style={styles.block}>
          <PopularPackages width={width} navigation={navigation} />
        </View>
        <View style={styles.block}>
          <PricingPlans width={width} navigation={navigation} />
        </View>
        <View style={styles.block}>
          <HowItWorks width={width} />
        </View>
        <View style={styles.block}>
          <StatsBand width={width} />
        </View>
      </View>

      <Footer navigation={navigation} />
    </ScrollView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    container: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
    searchWrap: { zIndex: 5 },
    block: { marginTop: 26 },
  });
