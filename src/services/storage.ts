import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readValue(key: string) {
  return AsyncStorage.getItem(key);
}

export async function writeValue(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
}

export async function removeValue(key: string) {
  await AsyncStorage.removeItem(key);
}
