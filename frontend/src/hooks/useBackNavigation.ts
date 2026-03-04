import { useRouter } from "next/navigation";

interface UseBackNavigationOptions {
  defaultPath: string;
  defaultLabel?: string;
}

export function useBackNavigation({
  defaultPath,
  defaultLabel,
}: UseBackNavigationOptions) {
  const router = useRouter();

  const handleBack = () => {
    // In Next.js, we can check history length, but realistically
    // we often just try back or push the default path.
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else {
      router.push(defaultPath);
    }
  };

  const getBackLabel = () => {
    return defaultLabel || "Back";
  };

  return {
    handleBack,
    backLabel: getBackLabel(),
  };
}
