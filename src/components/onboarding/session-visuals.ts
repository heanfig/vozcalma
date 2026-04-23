import type { OnboardingType } from "./onboarding-data";

export const CARD_QUICK_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBYtm43iJ7lYu4W1UxBA6sGExqYn6P8OipXJUntPFrhGbOPuwSmkUC2Yy5HwsxoqYwzYw5hFGKSx8H4NyJRJLJCKcCRxIx37j-TsJJzA2yD4pprY9CyoVv-UMbMqueZkXciVM8OLWdDMp0MStBhVmVJwVkcnhqDZw8aX7WkDpb8XAJ_RHHhW2Wejn8-nwtYj5mgxawo1KD2tUgOIRzHly1NTYh8jyofzOfkuuunJ0_GEth3WLfAy33BWiEh6I25_N0QNZ1RCzjoIb5h";

export const CARD_DEEP_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB02yFXYu_MUGI_LSbAUxQ5Qu--XbyKLkbZcq5tFfvAEbguoEnfcy3LX75qC70Gttgdj6K67bnwRdPhcR0zxtG7wmTTs_ZmDdXfIJaXE-7ARTkNZ3g5d1YaKkp3PRXkfat1qRqTCzx-X8i6PN5EN2KQTXX8Qa6jQLK8mkCDJjwDaWInjWBcafafZggXpSIrC_IuuT1qvcQA9CkbweZEFnHhHGd-tQQIiiVXFmSzG7zpUMm5AgM_J1Z2wA1qX-q69Rz3XM8IGVvibDpW";

export interface TypeVisual {
  image: string;
  badge: string;
  title: string;
  alt: string;
}

export const TYPE_VISUALS: Record<OnboardingType, TypeVisual> = {
  quick: {
    image: CARD_QUICK_IMG,
    badge: "Inmediato",
    title: "Alivio Rápido",
    alt: "Suaves ondas de agua con luz púrpura matutina",
  },
  deep: {
    image: CARD_DEEP_IMG,
    badge: "Inmersivo",
    title: "Reprogramación Profunda",
    alt: "Bosque atmosférico al amanecer con neblina entre pinos",
  },
};
