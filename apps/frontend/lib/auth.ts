/**
 * Authentication utilities for the frontend
 */

/**
 * Logout the current user
 * Makes a POST request to the backend's /api/auth/logout endpoint
 * @returns Promise<boolean> - true if logout was successful, false otherwise
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}
