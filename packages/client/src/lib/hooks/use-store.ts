import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CreateForm } from "@/src/pages/dashboard/envelope/create/types";

interface OnboardingForm {
	firstName: string;
	lastName: string;
	pin: string;
	hasOnboarded: boolean;
	selectedSignature?: string;
	image?: string;
}

interface SidebarState {
	isOpen: boolean;
	expandedItems: string[];
	lastClickedMenu?: string;
}

interface StorePersist {
	createForm: CreateForm | null;
	setCreateForm: (form: CreateForm) => void;
	clearCreateForm: () => void;

	onboardingForm: OnboardingForm;
	setOnboardingForm: (form: OnboardingForm) => void;
	clearOnboardingForm: () => void;

	sidebar: SidebarState;
	setSidebar: (sidebar: Partial<SidebarState>) => void;
}

export const useStorePersist = create<StorePersist>()(
	persist(
		(set) => ({
			createForm: null,
			setCreateForm: (form: CreateForm) => set({ createForm: form }),
			clearCreateForm: () => set({ createForm: null }),

			onboardingForm: {
				firstName: "",
				lastName: "",
				pin: "",
				hasOnboarded: false,
				selectedSignature: undefined,
				image:
					"https://cdn.dribbble.com/userupload/32112291/file/original-4d4ef0e9749c47c0e20c93e61583233c.jpg?resize=400x0",
			},
			setOnboardingForm: (form: OnboardingForm) =>
				set({ onboardingForm: form }),
			clearOnboardingForm: () =>
				set({
					onboardingForm: {
						firstName: "",
						lastName: "",
						pin: "",
						hasOnboarded: false,
						selectedSignature: undefined,
						image:
							"https://cdn.dribbble.com/userupload/32112291/file/original-4d4ef0e9749c47c0e20c93e61583233c.jpg?resize=400x0",
					},
				}),

			sidebar: {
				isOpen: false,
				expandedItems: [],
				lastClickedMenu: undefined,
			},
			setSidebar: (updates: Partial<SidebarState>) =>
				set((state) => ({
					sidebar: { ...state.sidebar, ...updates },
				})),
		}),
		{ name: "zustand" },
	),
);
