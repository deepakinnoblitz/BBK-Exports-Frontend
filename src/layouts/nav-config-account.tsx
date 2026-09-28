import { FaUserTie } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { IoHomeOutline } from "react-icons/io5";

import type { AccountPopoverProps } from './components/account-popover';

// ----------------------------------------------------------------------

export const _account: AccountPopoverProps['data'] = [
  {
    label: 'Home',
    href: '/',
    icon: <IoHomeOutline size={16} />,
  },
  {
    label: 'Profile',
    href: '/user-profile',
    icon: <FaUserTie size={16} />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <IoMdSettings size={18}/>,
  }
];
