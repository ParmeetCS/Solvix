import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';

 // Types for authentication state
 type AccountType = 'customer' | 'employee' | 'admin' | null;
 type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

 interface UserProfile {
   id: string;
   email: string;
   full_name: string | null;
   account_type: AccountType;
   role: string | null;
   department: string | null;
   is_active: boolean;
 }

 interface AuthContextType {
   status: AuthStatus;
   user: UserProfile | null;
   loading: boolean;
   login: (email: string, password: string) => Promise<void>;
   logout: () => Promise<void>;
   registerCustomer: (fullName: string, email: string, phone: string, password: string, confirmPassword: string) => Promise<void>;
   registerEmployee: (fullName: string, email: string, phone: string, employeeId: string, requestedDepartment: string, password: string, confirmPassword: string) => Promise<void>;
   forgotPassword: (email: string) => Promise<void>;
   resetPassword: (token: string, newPassword: string) => Promise<void>;
 }

 const AuthContext = createContext<AuthContextType | undefined>(undefined);

 export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) {
     throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
 };

 export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [status, setStatus] = useState<AuthStatus>('loading');
   const [user, setUser] = useState<UserProfile | null>(null);
   const [loading, setLoading] = useState(true);

   // Login function
   const login = async (email: string, password: string) => {
     setStatus('loading');
     try {
       const res = await apiClient.post('/api/auth/login', { email, password });
       const data = await res.json();

       if (data.user) {
         const userProfile: UserProfile = {
           id: data.user.id,
           email: data.user.email,
           full_name: data.user.full_name,
           account_type: data.user.account_type,
           role: data.user.role,
           department: data.user.department,
           is_active: data.user.is_active,
         };
         setUser(userProfile);
         setStatus('authenticated');
         // Store token and user in localStorage
         localStorage.setItem('solvix_token', data.token || '');
         localStorage.setItem('solvix_user', JSON.stringify(userProfile));
       } else {
         setStatus('error');
         throw new Error('Login failed: ' + (data.error || 'Unknown error'));
       }
     } catch (err: any) {
       setStatus('error');
       throw new Error(err?.message || 'Login failed');
     }
   };

   // Logout function
   const logout = async () => {
     try {
       await apiClient.post('/api/auth/logout');
       // Clear localStorage
       localStorage.removeItem('solvix_token');
       localStorage.removeItem('solvix_user');
       setUser(null);
       setStatus('unauthenticated');
     } catch (err: any) {
       // Still clear localStorage even if API call fails
       localStorage.removeItem('solvix_token');
       localStorage.removeItem('solvix_user');
       setUser(null);
       setStatus('unauthenticated');
     }
   };

   // Register Customer
   const registerCustomer = async (fullName: string, email: string, phone: string, password: string, confirmPassword: string) => {
     setStatus('loading');
     try {
       const res = await apiClient.post('/api/auth/register/customer', { fullName, email, phone, password, confirmPassword });
       const data = await res.json();

       if (data.user) {
         const userProfile: UserProfile = {
           id: data.user.id,
           email: data.user.email,
           full_name: data.user.full_name,
           account_type: 'customer',
           role: null,
           department: null,
           is_active: true,
         };
         setUser(userProfile);
         setStatus('authenticated');
         localStorage.setItem('solvix_token', data.token || '');
         localStorage.setItem('solvix_user', JSON.stringify(userProfile));
       } else {
         setStatus('error');
         throw new Error(data.error || 'Registration failed');
       }
     } catch (err: any) {
       setStatus('error');
       throw new Error(err?.message || 'Registration failed');
     }
   };

   // Register Employee
   const registerEmployee = async (fullName: string, email: string, phone: string, employeeId: string, requestedDepartment: string, password: string, confirmPassword: string) => {
     setStatus('loading');
     try {
       const res = await apiClient.post('/api/auth/register/employee', { fullName, email, phone, employeeId, requestedDepartment, password, confirmPassword });
       const data = await res.json();

       if (data.user) {
         const userProfile: UserProfile = {
           id: data.user.id,
           email: data.user.email,
           full_name: data.user.full_name,
           account_type: 'employee',
           role: null,
           department: null,
           is_active: true,
         };
         setUser(userProfile);
         setStatus('authenticated');
         localStorage.setItem('solvix_token', data.token || '');
         localStorage.setItem('solvix_user', JSON.stringify(userProfile));
       } else {
         setStatus('error');
         throw new Error(data.error || 'Employee registration failed');
       }
     } catch (err: any) {
       setStatus('error');
       throw new Error(err?.message || 'Employee registration failed');
     }
   };

   // Forgot Password
   const forgotPassword = async (email: string) => {
     setStatus('loading');
     try {
       await apiClient.post('/api/auth/forgot-password', { email });
       setStatus('success');
     } catch (err: any) {
       setStatus('error');
       throw new Error(err?.message || 'Failed to send reset link');
     }
   };

   // Reset Password
   const resetPassword = async (token: string, newPassword: string) => {
     setStatus('loading');
     try {
       await apiClient.post('/api/auth/reset-password', { token, new_password: newPassword });
       setStatus('success');
     } catch (err: any) {
       setStatus('error');
       throw new Error(err?.message || 'Failed to reset password');
     }
   };

   // Initial session check on mount
   useEffect(() => {
     const checkAuth = async () => {
       const storedToken = localStorage.getItem('solvix_token');
       const storedUser = localStorage.getItem('solvix_user');

       if (storedToken && storedUser) {
         setUser(JSON.parse(storedUser));
         setStatus('authenticated');
       } else {
         // Try to check if there's a session via the API
         try {
           const res = await apiClient.get('/api/auth/me');
           const data = await res.json();

           if (data.user) {
             setUser(data.user);
             setStatus('authenticated');
             localStorage.setItem('solvix_user', JSON.stringify(data.user));
           } else {
             setStatus('unauthenticated');
           }
         } catch (err) {
           setStatus('unauthenticated');
         }
       }

       setLoading(false);
     };

     checkAuth();
   }, []);

   return (
     <AuthContext.Provider value={{ status, user, loading, login, logout, registerCustomer, registerEmployee, forgotPassword, resetPassword }}>
       {children}
     </AuthContext.Provider>
   );
 };