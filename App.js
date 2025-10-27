import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import SurahListScreen from './src/screens/SurahListScreen';
import SurahDetailScreen from './src/screens/SurahDetailScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import DoaListScreen from './src/screens/DoaListScreen';
import DoaDetailScreen from './src/screens/DoaDetailScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Menu Utama' }} />
          <Stack.Screen name="SurahList" component={SurahListScreen} options={{ title: 'Daftar Surat' }} />
          <Stack.Screen name="SurahDetail" component={SurahDetailScreen} options={{ title: 'Detail Surat' }} />
          <Stack.Screen name="Tafsir" component={TafsirScreen} options={{ title: 'Tafsir Surat' }} />
          <Stack.Screen name="DoaList" component={DoaListScreen} options={{ title: 'Daftar Doa' }} />
          <Stack.Screen name="DoaDetail" component={DoaDetailScreen} options={{ title: 'Detail Doa' }} />
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
