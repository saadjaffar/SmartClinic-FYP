import AsyncStorage from "@react-native-async-storage/async-storage";

const CLINIC_ID_KEY = "smartclinic_clinic_id";

export async function getSelectedClinicId(): Promise<number | null> {
  const storedId = await AsyncStorage.getItem(CLINIC_ID_KEY);
  if (!storedId) {
    return null;
  }

  const clinicId = Number(storedId);
  return Number.isInteger(clinicId) && clinicId > 0
    ? clinicId
    : null;
}

export async function setSelectedClinicId(
  clinicId: number
): Promise<void> {
  if (!Number.isInteger(clinicId) || clinicId <= 0) {
    throw new Error("Clinic ID must be a positive whole number.");
  }

  await AsyncStorage.setItem(
    CLINIC_ID_KEY,
    String(clinicId)
  );
}

export async function clearSelectedClinicId(): Promise<void> {
  await AsyncStorage.removeItem(CLINIC_ID_KEY);
}
