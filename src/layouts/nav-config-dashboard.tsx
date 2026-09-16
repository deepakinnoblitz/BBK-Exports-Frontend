import { CgNotes } from "react-icons/cg";
import { GoTasklist } from "react-icons/go";
import { RxCalendar } from "react-icons/rx";
import { PiMoneyWavy } from "react-icons/pi";
import { BiPurchaseTag } from "react-icons/bi";
import { IoHomeOutline } from "react-icons/io5";
import { IoMdFolderOpen } from "react-icons/io";
import { FiList, FiUserPlus } from "react-icons/fi";
import { HiOutlineCreditCard } from "react-icons/hi2";
import { TbReport, TbTargetArrow } from "react-icons/tb";
import { FaMeta, FaLink, FaBuildingUser } from "react-icons/fa6";
import { BsFillBellFill, BsCalendar4Range } from "react-icons/bs";
import { FaTasks, FaWhatsapp, FaHandshake } from "react-icons/fa";
import { MdContacts, MdOutlineLaptopWindows } from "react-icons/md";
import { HiOutlineSpeakerphone, HiOutlineDocumentText } from "react-icons/hi";
import { RiAppsLine, RiUserAddLine, RiMailSendLine, RiCalendarScheduleLine  } from "react-icons/ri";
import { LuUsersRound, LuCalendarCheck2, LuFileSpreadsheet, LuUserRoundSearch } from "react-icons/lu";

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------


export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
  children?: {
    title: string;
    path: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
    children?: {
      title: string;
      path: string;
      icon?: React.ReactNode;
      info?: React.ReactNode;
    }[];
  }[];
};


// ----------------------  HR NavBar ---------------------------------------------------
export const hrNavData = [
  {
    title: 'HR Dashboard',
    path: '/',
    icon: <IoHomeOutline size={18} />,
  },
  /*
  {
    title: 'Task Manager',
    path: '/task-manager?view=all',
    icon: <FaTasks size={18} />,
  },
  */
  {
    title: 'Employee Records',
    path: '/employee',
    icon: <LuUsersRound size={18} />,
    children: [
      { title: 'Employee List', path: '/employee' },
      { title: 'Users List', path: '/users' },
    ],
  },
  {
    title: 'Attendance Records',
    path: '/attendance',
    icon: <RxCalendar size={18} />,
    children: [
      { title: 'Attendance List', path: '/attendance' },
      // { title: 'Daily Log', path: '/daily-log' },
      // { title: 'WFH Attendance', path: '/wfh-attendance' }
    ],
  },
  {
    title: 'Leaves Records',
    path: '/leaves',
    icon: <RiAppsLine size={18} />,
    children: [
      { title: 'Leave Application', path: '/leaves' },
      { title: 'Leave Allocate', path: '/leave-allocations' },
    ],
  },
  /*
  {
    title: 'Request List',
    path: '/requests',
    icon: <FiList size={18} />,
  },
  */
  /*
  {
    title: 'Timesheets',
    path: '/timesheets',
    icon: <LuFileSpreadsheet size={18} />,
  },
  */
  {
    title: 'Salary Slips',
    path: '/salary-slips',
    icon: <PiMoneyWavy size={18} />,
  },
  /*
  {
    title: 'Timesheets',
    path: '/timesheets',
    icon: <TbReport size={18} />,
  },
  */
  {
    title: 'Holidays List',
    path: '/holidays',
    icon: <GoTasklist size={22} />,
  },
  /*
  {
    title: 'Announcements',
    path: '/announcements',
    icon: <HiOutlineSpeakerphone size={18} />,
  },
  */
  {
    title: 'Asset Records',
    path: '/asset',
    icon: <MdOutlineLaptopWindows size={18} />,
    children: [
      { title: 'Asset List', path: '/asset/list' },
      { title: 'Asset Assignments', path: '/asset/assignments' },
      { title: 'Asset Requests', path: '/asset/requests' },
    ],
  },
  {
    title: 'Expenses',
    path: '/expenses',
    icon: <HiOutlineCreditCard size={18} />,
    children: [
      { title: 'Company Expenses', path: '/expense-tracker' },
      { title: 'Reimbursement Claim List', path: '/reimbursement-claims' },
    ],
  },
  /*
  {
    title: 'Employee Performance',
    path: '/employee-evaluation',
    icon: <LuUsersRound size={18} />,
    children: [
      { title: 'Employee Evaluation', path: '/employee-evaluation' },
      { title: 'Badges', path: '/badges' },
      { title: 'Employee Monthly Award', path: '/employee-monthly-award' },
    ],
  },
  */
  {
    title: 'Recruitment',
    path: '/job-openings',
    icon: <LuUserRoundSearch size={18} />,
    children: [
      { title: 'Job Opening List', path: '/job-openings' },
      { title: 'Job Applicant List', path: '/job-applicants' },
      // { title: 'Interview List', path: '/interviews' },
      { title: 'Employee Referral List', path: '/employee-referrals?view=hr' },
    ],
  },
  {
    title: 'Document Generator',
    path: '/hr-document-templates',
    icon: <HiOutlineDocumentText size={18} />,
    children: [
      { title: 'Document Templates', path: '/hr-document-templates' },
      { title: 'Document Generation', path: '/hr-document-generation' },
    ],
  },
  {
    title: 'Report',
    path: '/reports',
    icon: <CgNotes size={20} />,
    children: [
      { title: 'Attendance Report', path: '/reports/attendance' },
      // { title: 'Daily Log Report', path: '/reports/daily-log' },
      // { title: 'Task Report', path: '/reports/task-manager' },
      // { title: 'Timesheet Report', path: '/timesheet-reports' },
      { title: 'Leave Allocation Report', path: '/reports/leave-allocation' },
      { title: 'Employee Overall Report', path: '/employee-overall-report' },
      { title: 'Salary Slip Report', path: '/reports/salary-slip' },
    ],
  },
  {
    title: 'Masters',
    path: '/department',
    icon: <IoMdFolderOpen size={22} />,
    children: [
      { title: 'Department', path: '/department' },
      { title: 'Project', path: '/project' },
      { title: 'Activity Type', path: '/activity-type' },
      { title: 'Claim Type', path: '/claim-type' },
      { title: 'Bank Account', path: '/bank-account' },
      { title: 'Asset Category', path: '/asset-category' },
      { title: 'Criteria Category', path: '/performance-criteria-category' },
      { title: 'Designation', path: '/designation' },
      { title: 'Blood Group', path: '/blood-group' },
      { title: 'Salary Component', path: '/salary-structure-component' },
      { title: 'Leave Type', path: '/leave-type' },
      { title: 'HR Document Category', path: '/hr-document-category' },
    ],
  },
  /*
  {
    title: 'Reminders',
    path: '/reminders',
    icon: <BsFillBellFill size={18} />,
  }
  */
];


// ----------------------  Employee NavBar ---------------------------------------------------
export const employeeNavData = [
  {
    title: 'Employee Dashboard',
    path: '/',
    icon: <IoHomeOutline size={18} />
  },
  {
    title: 'My Profile',
    path: '/my-profile',
    icon: <LuUsersRound size={18} />,
  },
  /*
  {
    title: 'My Tasks',
    path: '/task-manager?view=mine',
    icon: <GoTasklist size={22} />,
  },
  */
  {
    title: 'My Attendance',
    path: '/attendance',
    icon: <RiCalendarScheduleLine size={18} />,
  },
  /*
  {
    title: 'My Daily Log',
    path: '/daily-log',
    icon: <RxCalendar size={18} />
  },
  */
  {
    title: 'My Leave Application',
    path: '/leaves',
    icon: <RiAppsLine size={18} />,
  },
  /*
  {
    title: 'My Request List',
    path: '/requests',
    icon: <FiList size={18} />,
  },
  */
  /*
  {
    title: 'My Timesheet',
    path: '/timesheets',
    icon: <LuFileSpreadsheet size={18} />,
  },
  */
  /*
  {
    title: 'My WFH Attendance',
    path: '/wfh-attendance',
    icon: <LuCalendarCheck2 size={18} />,
  },
  */
  {
    title: 'My Salary Slip',
    path: '/salary-slips',
    icon: <PiMoneyWavy size={18} />,
  },
  {
    title: 'My Reimbursement Claim',
    path: '/reimbursement-claims',
    icon: <CgNotes size={18} />,
  },
  {
    title: 'My Assets',
    path: '/asset',
    icon: <MdOutlineLaptopWindows size={18} />,
    children: [
      { title: 'My Asset List', path: '/asset/assignments' },
      { title: 'My Asset Requests', path: '/asset/requests' },
    ],
  },
  {
    title: 'Refer a Friend',
    path: '/employee-referrals',
    icon: <FiUserPlus size={18} />,
  },
  {
    title: 'Report',
    path: '/reports',
    icon: <CgNotes size={20} />,
    children: [
      { title: 'My Attendance Report', path: '/reports/attendance' },
      // { title: 'My Daily Log Report', path: '/reports/daily-log' },
      // { title: 'My Timesheet Report', path: '/timesheet-reports' },
    ],
  },
];

// ----------------------  CRM and Sales NavBar ---------------------------------------------------
export const crmAndSalesNavData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <IoHomeOutline size={18} />,
  },
  {
    title: 'Leads',
    path: '/leads',
    icon: <RiUserAddLine size={20} />,
  },
  {
    title: 'Clients',
    path: '/contacts',
    icon: <MdContacts size={20} />,
  },
  {
    title: 'Company',
    path: '/accounts',
    icon: <FaBuildingUser size={20} />,
  },
  {
    title: 'Proposal',
    path: '/proposals',
    icon: <RiMailSendLine size={22} />,
  },
  {
    title: 'Prospects',
    path: '/deals',
    icon: <FaHandshake size={22} />,
  },
  {
    title: 'Purchases',
    path: '/purchase',
    icon: <BiPurchaseTag size={22} />,
  },
  {
    title: 'Sales Target Entry',
    path: '/sales-target-entry',
    icon: <TbTargetArrow size={22} />,
  },
  {
    title: 'CRM Expense Tracker',
    path: '/crm-expense-tracker',
    icon: <HiOutlineCreditCard size={22} />,
  },
  {
    title: 'Calendar',
    path: '/events',
    icon: <BsCalendar4Range size={18} />
    ,
  },
  {
    title: 'Mail Automation',
    path: '/email-templates',
    icon: <RiMailSendLine size={22} />,
    children: [
      { title: 'Email Templates', path: '/email-templates' },
      { title: 'Email Campaigns', path: '/email-campaigns' },
      { title: 'Email Automations', path: '/email-automations' },
      { title: 'Email Settings', path: '/email-settings' },
    ],
  },
  {
    title: 'WhatsApp Automation',
    path: '/whatsapp-templates',
    icon: <FaWhatsapp size={22} />,
    children: [
      { title: 'WhatsApp Templates', path: '/whatsapp-templates' },
      { title: 'WhatsApp Campaigns', path: '/whatsapp-campaigns' },
      { title: 'WhatsApp Automations', path: '/whatsapp-automation' },
      { title: 'WhatsApp Settings', path: '/whatsapp-settings' },
    ],
  },
  {
    title: 'Lead Integration',
    path: '/lead-integration/meta-apps',
    icon: <FaLink size={22} />,
    children: [
      {
        title: 'Meta Integration',
        path: '/lead-integration/account',
        icon: <FaMeta size={18} />,
        children: [
          { title: 'Connect Account', path: '/lead-integration/account' },
          { title: 'Meta Apps', path: '/lead-integration/meta-apps' },
          { title: 'Meta Pages', path: '/lead-integration/meta-pages' },
          { title: 'Meta Forms', path: '/lead-integration/meta-forms' },
          { title: 'Meta Leads', path: '/lead-integration/meta-leads' },
          { title: 'Webhook Logs', path: '/lead-integration/webhook-logs' },
          { title: 'Meta Queue', path: '/lead-integration/meta-queue' },
        ]
      }
    ],
  },
  {
    title: 'Masters',
    path: '/master',
    icon: <IoMdFolderOpen size={22} />,
    children: [
      { title: 'Lead From', path: '/master/lead-from' },
      { title: 'Service', path: '/master/service' },
      { title: 'Item', path: '/master/item' },
      { title: 'Payment Terms', path: '/master/payment-terms' },
      { title: 'Payment Type', path: '/master/payment-type' },
      { title: 'Tax Types', path: '/master/tax-types' },
      { title: 'Company Bank Account', path: '/master/company-bank-account' },
      { title: 'Call Status', path: '/master/call-status' },
      { title: 'Meeting Status', path: '/master/meeting-status' },
      { title: 'Email Template Category', path: '/master/email-template-category' },
      { title: 'WhatsApp Template Category', path: '/master/whatsapp-template-category' },
    ],
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: <TbReport size={22} />,
    children: [
      { title: 'Lead Report', path: '/reports/lead' },
      { title: 'Clients Report', path: '/reports/contact' },
      { title: 'Company Report', path: '/reports/account' },
      { title: 'Calls Report', path: '/reports/calls' },
      { title: 'Meeting Report', path: '/reports/meeting' },
      { title: 'Proposal Report', path: '/reports/proposal' },
      { title: 'Prospects Report', path: '/reports/prospects' },
      { title: 'Estimation Report', path: '/reports/estimation' },
      { title: 'Invoice Report', path: '/reports/invoice' },
      { title: 'Purchase Report', path: '/reports/purchase' },
      { title: 'Sales Target Entry Report', path: '/reports/sales-target-entry' },
      { title: 'Invoice Collection Summary', path: '/reports/invoice-collection' },
      { title: 'Purchase Settlement Report', path: '/reports/purchase-settlement' }
    ]
  }
];

export const commonNavData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <Iconify icon={"solar:widget-5-bold-duotone" as any} />,
  },
];


// Helper function to check if user has any valid role
export function hasValidRole(roles: string[] = []): boolean {
  if (roles.includes('Administrator')) {
    return true;
  }

  const validRolePatterns = ['HR', 'Employee', 'Sales', 'CRM User', 'CRM And Sales'];
  const hasValid = roles.some((role) => {
    const matches = validRolePatterns.includes(role);
    return matches;
  });
  return hasValid;
}

export function getNavData(user: any = null, view?: 'HR' | 'CRM', settings?: any) {
  const roles: string[] = user?.roles || [];
  const mergedNav: NavItem[] = [];
  const seenPaths = new Set<string>();

  const filterItem = (item: NavItem): NavItem | null => {
    // Check permission for current item
    if (user?.permissions?.custom_permissions_assigned) {
      const getFormattedKey = (title: string) => {
        const lower = title.trim().toLowerCase();
        if (lower === 'connect account') return 'meta_account';
        if (lower === 'company expenses') return 'expense_tracker';
        if (lower === 'expense tracker') return 'crm_expenses';
        if (lower === 'expenses') return 'expense_tracker'; // HR parent fallback
        if (lower === 'document generator') return 'hr_document_templates'; // HR parent fallback
        if (lower === 'document templates') return 'hr_document_templates';
        if (lower === 'document generation') return 'document_generation';
        if (lower === 'asset list' || lower === 'my asset list') return 'asset_list';
        if (lower === 'asset assignments') return 'asset_assignments';
        if (lower === 'asset requests' || lower === 'my asset requests') return 'asset_requests';
        if (lower === 'reimbursement claim list' || lower === 'my reimbursement claim') return 'reimbursement_claims';
        if (lower === 'employee evaluation') return 'employee_evaluation';
        if (lower === 'badges') return 'badges';
        if (lower === 'employee monthly award') return 'employee_monthly_award';
        if (lower === 'job opening list') return 'job_openings';
        if (lower === 'job applicant list') return 'job_applicants';
        if (lower === 'interview list') return 'interviews';
        if (lower === 'employee referral list' || lower === 'refer a friend') return 'employee_referrals';
        if (lower === 'attendance list' || lower === 'my attendance') return 'attendance_list';
        if (lower === 'daily log' || lower === 'my daily log') return 'daily_log';
        if (lower === 'wfh attendance' || lower === 'my wfh attendance') return 'wfh_attendance';
        if (lower === 'sales target entry') return 'sales_target_entry';
        if (lower === 'calendar') return 'events';
        return lower.replace(/\s+/g, '_');
      };

      const moduleKey = getFormattedKey(item.title || '');
      const menuMapping = user?.permissions?.menu_mapping || {};
      const checkKey = menuMapping[moduleKey] || moduleKey;

      const menus = user?.permissions?.menus || {};
      const actions = user?.permissions?.actions || {};

      // If explicitly set menu to false or action view to false, block it
      const isMenuFalse = menus[moduleKey] === false || menus[checkKey] === false;
      const isActionFalse = (actions[moduleKey] && actions[moduleKey].view === false) || (actions[checkKey] && actions[checkKey].view === false);

      if (isMenuFalse || isActionFalse) {
        return null;
      }
    }

    // Clone item
    const itemClone: NavItem = {
      ...item,
      ...(item.children && {
        children: item.children.map((child: any) => ({ ...child })),
      }),
    };

    // Filter children recursively
    if (itemClone.children) {
      itemClone.children = itemClone.children
        .map((child: any) => {
          if ((child.title === 'Attendance List' || child.title === 'My Attendance') && settings?.show_attendance_list === 0) return null;
          if ((child.title === 'Daily Log' || child.title === 'My Daily Log' || child.title === 'My Activity Log') && settings?.show_daily_log === 0) return null;
          if ((child.title === 'Attendance Report' || child.title === 'My Attendance Report') && settings?.show_attendance_report === 0) return null;
          if ((child.title === 'Daily Log Report' || child.title === 'My Daily Log Report') && settings?.show_daily_log_report === 0) return null;

          return filterItem(child);
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (itemClone.children.length === 0) return null;
    }

    // Top level settings check
    if ((itemClone.title === 'Attendance List' || itemClone.title === 'My Attendance') && settings?.show_attendance_list === 0) return null;
    if ((itemClone.title === 'Daily Log' || itemClone.title === 'My Daily Log' || itemClone.title === 'My Activity Log') && settings?.show_daily_log === 0) return null;
    if ((itemClone.title === 'Attendance Report' || itemClone.title === 'My Attendance Report') && settings?.show_attendance_report === 0) return null;
    if ((itemClone.title === 'Daily Log Report' || itemClone.title === 'My Daily Log Report') && settings?.show_daily_log_report === 0) return null;

    return itemClone;
  };

  const addItems = (data: NavItem[]) => {
    data.forEach((item) => {
      const filtered = filterItem(item);
      if (!filtered) return;

      if (!seenPaths.has(filtered.path)) {
        mergedNav.push(filtered);
        seenPaths.add(filtered.path);
      } else {
        const existingItem = mergedNav.find((i) => i.path === filtered.path);
        if (existingItem && filtered.children && existingItem.children) {
          const childPaths = new Set(existingItem.children.map((c) => c.path));
          filtered.children.forEach((child) => {
            if (!childPaths.has(child.path)) {
              existingItem.children!.push({ ...child });
            }
          });
        }
      }
    });
  };

  // Check if user has valid access
  const hasAccess = hasValidRole(roles);

  // If no valid role, return empty navigation with no access flag
  if (!hasAccess) {
    return { hasAccess: false, navData: [] };
  }

  // If Administrator, show view-specific navigation or EVERYTHING
  const isAdmin = roles.some(role => ['administrator', 'system manager'].includes(role.toLowerCase()));

  if (isAdmin) {
    if (view === 'HR') {
      addItems(hrNavData);
    } else if (view === 'CRM') {
      addItems(crmAndSalesNavData);
    } else {
      addItems(hrNavData);
      addItems(employeeNavData);
      addItems(crmAndSalesNavData);
    }
    return { hasAccess: true, navData: mergedNav };
  }

  let hasCustomRole = false;
  const hasRole = (pattern: string) => roles.some(role => role.toLowerCase() === pattern.toLowerCase());

  const hasHR = hasRole('HR');
  const hasSalesOrCRM = hasRole('Sales') || hasRole('CRM User') || hasRole('CRM And Sales');

  if (view === 'HR' && hasHR) {
    let filteredHrNav = hrNavData;
    if (!hasRole('Task Manager')) {
      filteredHrNav = hrNavData.filter(
        (item) => item.title !== 'Task Manager' && item.title !== 'Employee Evaluation'
      );
    }
    addItems(filteredHrNav);
    hasCustomRole = true;
  } else if (view === 'CRM' && hasSalesOrCRM) {
    addItems(crmAndSalesNavData);
    hasCustomRole = true;
  } else {
    // Default logic (merged or first available)
    if (hasHR) {
      let filteredHrNav = hrNavData;
      if (!hasRole('Task Manager')) {
        filteredHrNav = hrNavData.filter(
          (item) => item.title !== 'Task Manager' && item.title !== 'Employee Evaluation'
        );
      }
      addItems(filteredHrNav);
      hasCustomRole = true;
    }

    if (hasRole('Employee')) {
      const processedEmployeeNav = [...employeeNavData];
      if (hasRole('Task Manager')) {
        const taskManagerItem = hrNavData.find((item) => item.title === 'Task Manager');
        if (taskManagerItem) {
          processedEmployeeNav.splice(1, 0, taskManagerItem);
        }
      }
      addItems(processedEmployeeNav);
      hasCustomRole = true;
    }

    if (hasRole('CRM And Sales')) {
      addItems(crmAndSalesNavData);
      hasCustomRole = true;
    }
  }

  if (!hasCustomRole) {
    return { hasAccess: true, navData: commonNavData };
  }

  return { hasAccess: true, navData: mergedNav };
}
