import api from "./axios";

export async function getOnboardingChecklist() {
  const { data } = await api.get("/onboarding");
  return data;
}

export async function markOnboardingStepComplete(step) {
  const { data } = await api.patch("/onboarding/step", { step });
  return data;
}
