import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import type { User } from "@shared/schema";

export default function DashboardRedirect() {
  const { data: user, isLoading } = useQuery<User>({ 
    queryKey: ["/api/auth/user"] 
  });
  
  // Show loading state while auth query resolves
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Not authenticated - redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // Authenticated - redirect based on user type
  if (user.userType === 'seller' || user.role === 'admin') {
    return <Redirect to="/seller/dashboard" />;
  }
  
  if (user.userType === 'buyer') {
    return <Redirect to="/buyer-dashboard" />;
  }
  
  // Default fallback for sellers
  return <Redirect to="/seller/dashboard" />;
}
