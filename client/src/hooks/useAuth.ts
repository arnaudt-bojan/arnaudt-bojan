import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000, // Consider data fresh for 60 seconds to prevent aggressive refetching
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable to prevent interference with unsaved form state
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
