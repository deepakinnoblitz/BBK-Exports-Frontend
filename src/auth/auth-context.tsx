import { useState, useEffect, useContext, createContext } from 'react';

import { getCurrentUserInfo } from 'src/api/auth';

type UserType = {
  name: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  full_name: string;
  username: string;
  email: string;
  time_zone?: string;
  user_image?: string;
  roles: string[];
  role_profile_name?: string;
  allowed_modules: string[];
  employee?: string;
  employee_name?: string;
  last_login?: string;
  user_status?: string;
  has_crm_permission?: boolean;
  permissions?: {
    custom_permissions_assigned: boolean;
    frontend_role: string | null;
    menus: { [key: string]: boolean };
    menu_mapping: { [key: string]: string };
    actions: {
      [key: string]: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        export: boolean;
        import: boolean;
      };
    };
  };
};

type AuthContextType = {
  user: UserType | null;
  loading: boolean;
  setUser: (u: UserType | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.pathname.includes('/sign-in')) {
      setLoading(false);
      return;
    }

    getCurrentUserInfo()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);