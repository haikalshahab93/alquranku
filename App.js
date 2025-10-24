import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import SurahListScreen from './src/screens/SurahListScreen';
import SurahDetailScreen from './src/screens/SurahDetailScreen';
import TafsirScreen from './src/screens/TafsirScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="SurahList" component={SurahListScreen} options={{ title: 'Daftar Surat' }} />
          <Stack.Screen name="SurahDetail" component={SurahDetailScreen} options={{ title: 'Detail Surat' }} />
          <Stack.Screen name="Tafsir" component={TafsirScreen} options={{ title: 'Tafsir Surat' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
