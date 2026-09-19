import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';

import Box from '@mui/material/Box';

import { useSocket } from 'src/hooks/use-socket';
import { UnreadCountsProvider } from 'src/hooks/unread-counts-context';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import { AuthGuard } from 'src/auth/auth-guard';
import { useAuth } from 'src/auth/auth-context';
import { RolePermissionGuard } from 'src/auth/role-permission-guard';


// ----------------------------------------------------------------------

function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket(user?.email);

  return (
    <UnreadCountsProvider socket={socket}>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </UnreadCountsProvider>
  );
}

// ----------------------------------------------------------------------

export const DashboardPage = lazy(() => import('src/pages/dashboard'));

export const BlogPage = lazy(() => import('src/pages/blog'));
export const LeadsPage = lazy(() => import('src/pages/leads'));
export const LeadDetailsPage = lazy(() => import('src/pages/leads/details'));
export const UsersPage = lazy(() => import('src/pages/users'));
export const ContactPage = lazy(() => import('src/pages/contact'));
export const AccountsPage = lazy(() => import('src/pages/accounts'));
export const DealsPage = lazy(() => import('src/pages/deals'));
export const DealDetailsPage = lazy(() => import('src/pages/deals/details'));
export const EventsPage = lazy(() => import('src/pages/events'));
export const CallsPage = lazy(() => import('src/pages/calls'));
export const MeetingsPage = lazy(() => import('src/pages/meetings'));
export const ToDoPage = lazy(() => import('src/pages/todo'));
export const TaskManagerPage = lazy(() => import('src/pages/task-manager'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const InvoiceListPage = lazy(() => import('src/pages/invoice/list'));
export const InvoiceCreatePage = lazy(() => import('src/pages/invoice/new'));
export const InvoiceEditPage = lazy(() => import('src/pages/invoice/edit'));
export const InvoiceDetailsPage = lazy(() => import('src/pages/invoice/details'));
export const EstimationListPage = lazy(() => import('src/pages/estimation/list'));
export const EstimationCreatePage = lazy(() => import('src/pages/estimation/new'));
export const EstimationEditPage = lazy(() => import('src/pages/estimation/edit'));
export const EstimationDetailsPage = lazy(() => import('src/pages/estimation/details'));
export const ProposalListPage = lazy(() => import('src/pages/proposals/list'));
export const ProposalCreatePage = lazy(() => import('src/pages/proposals/new'));
export const ProposalEditPage = lazy(() => import('src/pages/proposals/edit'));
export const ProposalDetailsPage = lazy(() => import('src/pages/proposals/details'));

export const RolePermissionListPage = lazy(() => import('src/pages/role-permissions/list'));
export const RolePermissionCreatePage = lazy(() => import('src/pages/role-permissions/new'));
export const RolePermissionEditPage = lazy(() => import('src/pages/role-permissions/edit'));
export const RolePermissionDetailsPage = lazy(() => import('src/pages/role-permissions/details'));


export const EmailTemplateListPage = lazy(() => import('src/pages/email-templates/list'));
export const EmailTemplateCreatePage = lazy(() => import('src/pages/email-templates/new'));
export const EmailTemplateEditPage = lazy(() => import('src/pages/email-templates/edit'));
export const EmailTemplateDetailsPage = lazy(() => import('src/pages/email-templates/details'));

export const HRDocumentTemplateListPage = lazy(() => import('src/pages/hr-document-templates/list'));
export const HRDocumentTemplateCreatePage = lazy(() => import('src/pages/hr-document-templates/new'));
export const HRDocumentTemplateEditPage = lazy(() => import('src/pages/hr-document-templates/edit'));
export const HRDocumentTemplateDetailsPage = lazy(() => import('src/pages/hr-document-templates/details'));

export const HRDocumentGenerationListPage = lazy(() => import('src/pages/hr-document-generation/list'));
export const HRDocumentGenerationCreatePage = lazy(() => import('src/pages/hr-document-generation/new'));
export const HRDocumentGenerationEditPage = lazy(() => import('src/pages/hr-document-generation/edit'));
export const HRDocumentGenerationDetailsPage = lazy(() => import('src/pages/hr-document-generation/details'));

export const WhatsAppTemplateListPage = lazy(() => import('src/pages/whatsapp-templates/list'));
export const WhatsAppTemplateCreatePage = lazy(() => import('src/pages/whatsapp-templates/new'));
export const WhatsAppTemplateEditPage = lazy(() => import('src/pages/whatsapp-templates/edit'));
export const WhatsAppTemplateDetailsPage = lazy(() => import('src/pages/whatsapp-templates/details'));

export const MetaAppsListPage = lazy(() => import('src/pages/lead-integration/meta-apps/list'));
export const MetaAccountPage = lazy(() => import('src/pages/lead-integration/meta-account'));
export const MetaAppsCreatePage = lazy(() => import('src/pages/lead-integration/meta-apps/new'));
export const MetaAppsEditPage = lazy(() => import('src/pages/lead-integration/meta-apps/edit'));
export const MetaAppsDetailsPage = lazy(() => import('src/pages/lead-integration/meta-apps/details'));

export const MetaPagesListPage = lazy(() => import('src/pages/lead-integration/meta-pages/list'));
export const MetaPagesCreatePage = lazy(() => import('src/pages/lead-integration/meta-pages/new'));
export const MetaPagesEditPage = lazy(() => import('src/pages/lead-integration/meta-pages/edit'));
export const MetaPagesDetailsPage = lazy(() => import('src/pages/lead-integration/meta-pages/details'));

export const MetaFormsListPage = lazy(() => import('src/pages/lead-integration/meta-forms/list'));
export const MetaFormsCreatePage = lazy(() => import('src/pages/lead-integration/meta-forms/new'));
export const MetaFormsEditPage = lazy(() => import('src/pages/lead-integration/meta-forms/edit'));
export const MetaFormsDetailsPage = lazy(() => import('src/pages/lead-integration/meta-forms/details'));

export const MetaWebhookLogsPage = lazy(() => import('src/pages/lead-integration/meta-webhook-logs/list'));
export const MetaWebhookLogViewPage = lazy(() => import('src/pages/lead-integration/meta-webhook-logs/view'));
export const MetaQueuePage = lazy(() => import('src/pages/lead-integration/meta-queue/list'));
export const MetaQueueViewPage = lazy(() => import('src/pages/lead-integration/meta-queue/view'));
export const MetaLeadsPage = lazy(() => import('src/pages/lead-integration/meta-lead/list'));
export const MetaLeadsViewPage = lazy(() => import('src/pages/lead-integration/meta-lead/view'));

export const EmailCampaignListPage = lazy(() => import('src/pages/email-campaigns/list'));
export const EmailCampaignCreatePage = lazy(() => import('src/pages/email-campaigns/new'));
export const EmailCampaignEditPage = lazy(() => import('src/pages/email-campaigns/edit'));
export const EmailCampaignDetailsPage = lazy(() => import('src/pages/email-campaigns/details'));

export const WhatsAppCampaignListPage = lazy(() => import('src/pages/whatsapp-campaigns/list'));
export const WhatsAppCampaignCreatePage = lazy(() => import('src/pages/whatsapp-campaigns/new'));
export const WhatsAppCampaignEditPage = lazy(() => import('src/pages/whatsapp-campaigns/edit'));
export const WhatsAppCampaignDetailsPage = lazy(() => import('src/pages/whatsapp-campaigns/details'));

export const EmailAutomationListPage = lazy(() => import('src/pages/email-automations/list'));
export const EmailAutomationCreatePage = lazy(() => import('src/pages/email-automations/new'));
export const EmailAutomationEditPage = lazy(() => import('src/pages/email-automations/edit'));
export const EmailAutomationDetailsPage = lazy(() => import('src/pages/email-automations/details'));

export const WhatsAppAutomationListPage = lazy(() => import('src/pages/whatsapp-automations/list'));
export const WhatsAppAutomationCreatePage = lazy(() => import('src/pages/whatsapp-automations/new'));
export const WhatsAppAutomationEditPage = lazy(() => import('src/pages/whatsapp-automations/edit'));
export const WhatsAppAutomationDetailsPage = lazy(() => import('src/pages/whatsapp-automations/details'));


export const EmailSettingsPage = lazy(() => import('src/pages/email-settings'));
export const WhatsAppSettingsPage = lazy(() => import('src/pages/whatsapp-settings'));
export const ProductsPage = lazy(() => import('src/pages/products'));

export const LeadReportPage = lazy(() => import('src/pages/reports/lead'));
export const SalesTargetEntryReportPage = lazy(() => import('src/pages/reports/sales-target-entry'));
export const ContactReportPage = lazy(() => import('src/pages/reports/contact'));
export const AccountReportPage = lazy(() => import('src/pages/reports/account'));
export const CallsReportPage = lazy(() => import('src/pages/reports/calls'));
export const MeetingReportPage = lazy(() => import('src/pages/reports/meeting'));
export const PurchaseReportPage = lazy(() => import('src/pages/reports/purchase'));
export const ExpenseReportPage = lazy(() => import('src/pages/reports/expense'));
export const EstimationReportPage = lazy(() => import('src/pages/reports/estimation'));
export const InvoiceReportPage = lazy(() => import('src/pages/reports/invoice'));
export const InvoiceCollectionReportPage = lazy(() => import('src/pages/reports/invoice-collection'));
export const PurchaseCollectionReportPage = lazy(() => import('src/pages/reports/purchase-settlement-report'));
export const TimesheetReportPage = lazy(() => import('src/pages/reports/timesheet'));
export const AttendanceReportPage = lazy(() => import('src/pages/reports/attendance'));
export const LeaveAllocationReportPage = lazy(() => import('src/pages/reports/leave-allocation'));
export const DailyLogReportPage = lazy(() => import('src/pages/reports/daily-log'));
export const TaskReportPage = lazy(() => import('src/pages/reports/task-manager'));
export const SalarySlipReportPage = lazy(() => import('src/pages/reports/salary-slip'));
export const ProposalReportPage = lazy(() => import('src/pages/reports/proposal'));
export const ProspectsReportPage = lazy(() => import('src/pages/reports/prospects'));
export const EmployeePage = lazy(() => import('src/pages/employee'));
export const EmployeeDetailsPage = lazy(() => import('src/pages/employee/details'));
export const AttendancePage = lazy(() => import('src/pages/attendance'));
export const LeavesPage = lazy(() => import('src/pages/leaves'));
export const LeaveAllocationsPage = lazy(() => import('src/pages/leave-allocations'));
export const PayrollPage = lazy(() => import('src/pages/payroll'));
export const RequestsPage = lazy(() => import('src/pages/requests'));
export const AnnouncementsPage = lazy(() => import('src/pages/announcements'));
export const AssetsPage = lazy(() => import('src/pages/assets'));
export const AssetAssignmentsPage = lazy(() => import('src/pages/asset-assignments'));
export const AssetRequestsPage = lazy(() => import('src/pages/asset-requests'));
export const TimesheetsPage = lazy(() => import('src/pages/timesheets'));
export const ExpensesListPage = lazy(() => import('src/pages/expenses/list'));
export const ExpensesNewPage = lazy(() => import('src/pages/expenses/new'));
export const ExpensesEditPage = lazy(() => import('src/pages/expenses/edit'));
export const ExpensesDetailsPage = lazy(() => import('src/pages/expenses/details'));
export const WFHAttendancePage = lazy(() => import('src/pages/wfh-attendance'));
export const ImportAttendancePage = lazy(() => import('src/pages/import-attendance'));
export const HolidaysPage = lazy(() => import('src/pages/holidays'));
export const CRMExpenseTrackerPage = lazy(() => import('src/pages/crm-expense-tracker'));
export const ExpenseTrackerPage = lazy(() => import('src/pages/expense-tracker'));
export const ReimbursementClaimsPage = lazy(() => import('src/pages/reimbursement-claims'));
const RenewalTrackerPage = lazy(() => import('src/pages/renewals-tracker'));
const SalarySlipsPage = lazy(() => import('src/pages/salary-slips'));
const JobOpeningsPage = lazy(() => import('src/pages/job-openings'));
const JobApplicantsPage = lazy(() => import('src/pages/job-applicants'));
const InterviewPage = lazy(() => import('src/pages/interviews'));
export const ProfilePage = lazy(() => import('src/pages/profile'));
export const MyProfilePage = lazy(() => import('src/pages/my-profile'));
export const ChatPage = lazy(() => import('src/pages/chat'));
export const AccessDeniedPage = lazy(() => import('src/pages/access-denied'));
export const EmployeeEvaluationPage = lazy(() => import('src/pages/employee-evaluation'));
export const BadgesPage = lazy(() => import('src/pages/badges'));
export const EmployeeMonthlyAwardPage = lazy(() => import('src/pages/employee-monthly-award'));
export const EmployeeReferralsPage = lazy(() => import('src/pages/employee-referrals'));
export const RemindersPage = lazy(() => import('src/pages/reminders'));

export const PurchaseListPage = lazy(() => import('src/pages/purchase/list'));
export const PurchaseNewPage = lazy(() => import('src/pages/purchase/new'));
export const PurchaseEditPage = lazy(() => import('src/pages/purchase/edit'));
export const PurchaseDetailsPage = lazy(() => import('src/pages/purchase/details'));
export const InvoiceCollectionListPage = lazy(() => import('src/pages/invoice-collection/list'));
export const InvoiceCollectionCreatePage = lazy(() => import('src/pages/invoice-collection/new'));
export const InvoiceCollectionEditPage = lazy(() => import('src/pages/invoice-collection/edit'));
export const InvoiceCollectionDetailsPage = lazy(() => import('src/pages/invoice-collection/details'));
export const PurchaseCollectionListPage = lazy(() => import('src/pages/purchase-collection/list'));
export const PurchaseCollectionCreatePage = lazy(() => import('src/pages/purchase-collection/new'));
export const PurchaseCollectionEditPage = lazy(() => import('src/pages/purchase-collection/edit'));
export const PurchaseCollectionDetailsPage = lazy(() => import('src/pages/purchase-collection/details'));
export const UserPermissionsPage = lazy(() => import('src/pages/user-permissions'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const DailyLogPage = lazy(() => import('src/pages/daily-log'));
export const SettingsPage = lazy(() => import('src/pages/settings'));
export const DepartmentPage = lazy(() => import('src/pages/department'));
export const ProjectPage = lazy(() => import('src/pages/project'));
export const ActivityTypePage = lazy(() => import('src/pages/activity-type'));
export const ClaimTypePage = lazy(() => import('src/pages/claim-type'));
export const BankAccountPage = lazy(() => import('src/pages/bank-account'));
export const AssetCategoryPage = lazy(() => import('src/pages/asset-category'));
export const PerformanceCriteriaCategoryPage = lazy(() => import('src/pages/performance-criteria-category'));
export const DesignationPage = lazy(() => import('src/pages/designation'));
export const EmployeeTypePage = lazy(() => import('src/pages/employee-type'));
export const SalaryStructureComponentPage = lazy(() => import('src/pages/salary-structure-component'));
export const LeaveTypePage = lazy(() => import('src/pages/leave-type'));
export const HRDocumentCategoryPage = lazy(() => import('src/pages/hr-document-category'));
export const BloodGroupPage = lazy(() => import('src/pages/blood-group'));
export const LineOrderPage = lazy(() => import('src/pages/line-order'));
export const ShiftPage = lazy(() => import('src/pages/shift'));
export const BusTravelRoutePage = lazy(() => import('src/pages/bus-travel-route'));
export const LeadFromPage = lazy(() => import('src/pages/lead-from'));
export const CallStatusPage = lazy(() => import('src/pages/call-status'));
export const MeetingStatusPage = lazy(() => import('src/pages/meeting-status'));
export const EmailTemplateCategoryPage = lazy(() => import('../pages/email-template-category'));
export const WhatsAppTemplateCategoryPage = lazy(() => import('../pages/whatsapp-template-category'));
export const ServicePage = lazy(() => import('src/pages/service'));
export const ItemPage = lazy(() => import('src/pages/item'));
export const PaymentTermsPage = lazy(() => import('../pages/payment-terms'));
export const PaymentTypePage = lazy(() => import('../pages/payment-type'));
export const TaxTypesPage = lazy(() => import('src/pages/tax-types'));
export const CompanyBankAccountPage = lazy(() => import('src/pages/company-bank-account'));
export const EmployeeOverallReportPage = lazy(() => import('src/pages/employee-overall-report'));
export const SalesTargetEntryPage = lazy(() => import('src/pages/sales-target-entry'));


const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  />
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <AuthGuard>
        <DashboardLayoutWrapper>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayoutWrapper>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'leads',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="lead"><LeadsPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="lead"><LeadDetailsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'users', element: <RolePermissionGuard actionKey="users_list"><UsersPage /></RolePermissionGuard> },
      { path: 'user-permissions', element: <RolePermissionGuard actionKey="users_list"><UserPermissionsPage /></RolePermissionGuard> },
      { path: 'user-profile', element: <ProfilePage /> },
      { path: 'my-profile', element: <MyProfilePage /> },
      { path: 'chat', element: <ChatPage /> },

      { path: 'contacts', element: <RolePermissionGuard actionKey="clients"><ContactPage /></RolePermissionGuard> },
      { path: 'accounts', element: <RolePermissionGuard actionKey="company"><AccountsPage /></RolePermissionGuard> },
      { path: 'sales-target-entry', element: <RolePermissionGuard actionKey="sales_target_entry"><SalesTargetEntryPage /></RolePermissionGuard> },
      {
        path: 'deals',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="prospects"><DealsPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="prospects"><DealDetailsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'events', element: <RolePermissionGuard actionKey="events"><EventsPage /></RolePermissionGuard> },
      { path: 'calls', element: <RolePermissionGuard actionKey="events"><CallsPage /></RolePermissionGuard> },
      { path: 'meetings', element: <RolePermissionGuard actionKey="events"><MeetingsPage /></RolePermissionGuard> },
      { path: 'todo', element: <RolePermissionGuard actionKey="events"><ToDoPage /></RolePermissionGuard> },
      { path: 'task-manager', element: <TaskManagerPage /> },
      { path: 'products', element: <ProductsPage /> },
      {
        path: 'invoices',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="invoice"><InvoiceListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="invoice"><InvoiceCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="invoice"><InvoiceEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="invoice"><InvoiceDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'estimations',
        children: [
          { index: true, element: <Navigate to="/deals?tab=estimations" replace /> },
          { path: 'new', element: <RolePermissionGuard actionKey="estimation"><EstimationCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="estimation"><EstimationEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="estimation"><EstimationDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'proposals',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="proposal"><ProposalListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="proposal"><ProposalCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="proposal"><ProposalEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="proposal"><ProposalDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'role-permissions',
        children: [
          { index: true, element: <RolePermissionListPage /> },
          { path: 'new', element: <RolePermissionCreatePage /> },
          { path: ':id/edit', element: <RolePermissionEditPage /> },
          { path: ':id/view', element: <RolePermissionDetailsPage /> },
        ],
      },
      {
        path: 'email-templates',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="email_templates"><EmailTemplateListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="email_templates"><EmailTemplateCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="email_templates"><EmailTemplateEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="email_templates"><EmailTemplateDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'hr-document-templates',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="hr_document_templates"><HRDocumentTemplateListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="hr_document_templates"><HRDocumentTemplateCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="hr_document_templates"><HRDocumentTemplateEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="hr_document_templates"><HRDocumentTemplateDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'hr-document-generation',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="document_generation"><HRDocumentGenerationListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="document_generation"><HRDocumentGenerationCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="document_generation"><HRDocumentGenerationEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="document_generation"><HRDocumentGenerationDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'email-campaigns',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="email_campaigns"><EmailCampaignListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="email_campaigns"><EmailCampaignCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="email_campaigns"><EmailCampaignEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="email_campaigns"><EmailCampaignDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'whatsapp-campaigns',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="whatsapp_campaigns"><WhatsAppCampaignListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="whatsapp_campaigns"><WhatsAppCampaignCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="whatsapp_campaigns"><WhatsAppCampaignEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="whatsapp_campaigns"><WhatsAppCampaignDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'email-automations',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="email_automations"><EmailAutomationListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="email_automations"><EmailAutomationCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="email_automations"><EmailAutomationEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="email_automations"><EmailAutomationDetailsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'email-settings', element: <RolePermissionGuard actionKey="email_settings"><EmailSettingsPage /></RolePermissionGuard> },
      {
        path: 'whatsapp-templates',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="whatsapp_templates"><WhatsAppTemplateListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="whatsapp_templates"><WhatsAppTemplateCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="whatsapp_templates"><WhatsAppTemplateEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="whatsapp_templates"><WhatsAppTemplateDetailsPage /></RolePermissionGuard> },
        ],
      },
      {
        path: 'whatsapp-automation',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="whatsapp_automations"><WhatsAppAutomationListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="whatsapp_automations"><WhatsAppAutomationCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="whatsapp_automations"><WhatsAppAutomationEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="whatsapp_automations"><WhatsAppAutomationDetailsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'whatsapp-settings', element: <RolePermissionGuard actionKey="whatsapp_settings"><WhatsAppSettingsPage /></RolePermissionGuard> },
      {
        path: 'lead-integration',
        children: [
          {
            path: 'account',
            element: <RolePermissionGuard actionKey="meta_account"><MetaAccountPage /></RolePermissionGuard>,
          },
          {
            path: 'meta-apps',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="meta_apps"><MetaAppsListPage /></RolePermissionGuard> },
              { path: 'new', element: <RolePermissionGuard actionKey="meta_apps"><MetaAppsCreatePage /></RolePermissionGuard> },
              { path: ':id/edit', element: <RolePermissionGuard actionKey="meta_apps"><MetaAppsEditPage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="meta_apps"><MetaAppsDetailsPage /></RolePermissionGuard> },
            ],
          },
          {
            path: 'meta-pages',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="meta_pages"><MetaPagesListPage /></RolePermissionGuard> },
              { path: 'new', element: <RolePermissionGuard actionKey="meta_pages"><MetaPagesCreatePage /></RolePermissionGuard> },
              { path: ':id/edit', element: <RolePermissionGuard actionKey="meta_pages"><MetaPagesEditPage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="meta_pages"><MetaPagesDetailsPage /></RolePermissionGuard> },
            ],
          },
          {
            path: 'meta-forms',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="meta_forms"><MetaFormsListPage /></RolePermissionGuard> },
              { path: 'new', element: <RolePermissionGuard actionKey="meta_forms"><MetaFormsCreatePage /></RolePermissionGuard> },
              { path: ':id/edit', element: <RolePermissionGuard actionKey="meta_forms"><MetaFormsEditPage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="meta_forms"><MetaFormsDetailsPage /></RolePermissionGuard> },
            ],
          },
          {
            path: 'webhook-logs',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="webhook_logs"><MetaWebhookLogsPage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="webhook_logs"><MetaWebhookLogViewPage /></RolePermissionGuard> },
            ],
          },
          {
            path: 'meta-queue',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="meta_queue"><MetaQueuePage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="meta_queue"><MetaQueueViewPage /></RolePermissionGuard> },
            ],
          },
          {
            path: 'meta-leads',
            children: [
              { index: true, element: <RolePermissionGuard actionKey="meta_leads"><MetaLeadsPage /></RolePermissionGuard> },
              { path: ':id/view', element: <RolePermissionGuard actionKey="meta_leads"><MetaLeadsViewPage /></RolePermissionGuard> },
            ],
          },
        ],
      },
      { path: 'blog', element: <BlogPage /> },

      {
        path: 'employee',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="employee"><EmployeePage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="employee"><EmployeeDetailsPage /></RolePermissionGuard> },
        ]
      },
      { path: 'attendance', element: <RolePermissionGuard actionKey="attendance_list"><AttendancePage /></RolePermissionGuard> },
      { path: 'leaves', element: <RolePermissionGuard actionKey="leaves"><LeavesPage /></RolePermissionGuard> },
      { path: 'leave-allocations', element: <RolePermissionGuard actionKey="leaves"><LeaveAllocationsPage /></RolePermissionGuard> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'requests', element: <RolePermissionGuard actionKey="requests"><RequestsPage /></RolePermissionGuard> },
      { path: 'announcements', element: <RolePermissionGuard actionKey="announcements"><AnnouncementsPage /></RolePermissionGuard> },
      {
        path: 'asset',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="asset_list"><AssetsPage /></RolePermissionGuard> },
          { path: 'list', element: <RolePermissionGuard actionKey="asset_list"><AssetsPage /></RolePermissionGuard> },
          { path: 'assignments', element: <RolePermissionGuard actionKey="asset_assignments"><AssetAssignmentsPage /></RolePermissionGuard> },
          { path: 'requests', element: <RolePermissionGuard actionKey="asset_requests"><AssetRequestsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'timesheets', element: <RolePermissionGuard actionKey="timesheets"><TimesheetsPage /></RolePermissionGuard> },
      { path: 'wfh-attendance', element: <RolePermissionGuard actionKey="wfh_attendance"><WFHAttendancePage /></RolePermissionGuard> },
      { path: 'daily-log', element: <RolePermissionGuard actionKey="daily_log"><DailyLogPage /></RolePermissionGuard> },
      { path: 'import-attendance', element: <RolePermissionGuard actionKey="attendance_list"><ImportAttendancePage /></RolePermissionGuard> },
      { path: 'department', element: <RolePermissionGuard actionKey="master_department"><DepartmentPage /></RolePermissionGuard> },
      { path: 'project', element: <RolePermissionGuard actionKey="master_project"><ProjectPage /></RolePermissionGuard> },
      { path: 'activity-type', element: <RolePermissionGuard actionKey="master_activity_type"><ActivityTypePage /></RolePermissionGuard> },
      { path: 'claim-type', element: <RolePermissionGuard actionKey="master_claim_type"><ClaimTypePage /></RolePermissionGuard> },
      { path: 'bank-account', element: <RolePermissionGuard actionKey="master_bank_account"><BankAccountPage /></RolePermissionGuard> },
      { path: 'asset-category', element: <RolePermissionGuard actionKey="master_asset_category"><AssetCategoryPage /></RolePermissionGuard> },
      { path: 'performance-criteria-category', element: <RolePermissionGuard actionKey="master_criteria_category"><PerformanceCriteriaCategoryPage /></RolePermissionGuard> },
      { path: 'designation', element: <RolePermissionGuard actionKey="master_designation"><DesignationPage /></RolePermissionGuard> },
      { path: 'employee-type', element: <RolePermissionGuard actionKey="master_employee_type"><EmployeeTypePage /></RolePermissionGuard> },
      { path: 'salary-structure-component', element: <RolePermissionGuard actionKey="master_salary_component"><SalaryStructureComponentPage /></RolePermissionGuard> },
      { path: 'leave-type', element: <RolePermissionGuard actionKey="master_leave_type"><LeaveTypePage /></RolePermissionGuard> },
      { path: 'blood-group', element: <RolePermissionGuard actionKey="master_blood_group"><BloodGroupPage /></RolePermissionGuard> },
      { path: 'line-order', element: <RolePermissionGuard actionKey="master_line_order"><LineOrderPage /></RolePermissionGuard> },
      { path: 'shift', element: <RolePermissionGuard actionKey="master_shift"><ShiftPage /></RolePermissionGuard> },
      { path: 'bus-travel-route', element: <RolePermissionGuard actionKey="master_bus_travel_route"><BusTravelRoutePage /></RolePermissionGuard> },
      { path: 'hr-document-category', element: <HRDocumentCategoryPage /> },
      { path: 'master/lead-from', element: <RolePermissionGuard actionKey="master_lead_from"><LeadFromPage /></RolePermissionGuard> },
      { path: 'master/call-status', element: <RolePermissionGuard actionKey="master_call_status"><CallStatusPage /></RolePermissionGuard> },
      { path: 'master/meeting-status', element: <RolePermissionGuard actionKey="master_meeting_status"><MeetingStatusPage /></RolePermissionGuard> },
      { path: 'master/email-template-category', element: <RolePermissionGuard actionKey="master_email_template_category"><EmailTemplateCategoryPage /></RolePermissionGuard> },
      { path: 'master/whatsapp-template-category', element: <RolePermissionGuard actionKey="master_whatsapp_template_category"><WhatsAppTemplateCategoryPage /></RolePermissionGuard> },
      { path: 'master/service', element: <RolePermissionGuard actionKey="master_service"><ServicePage /></RolePermissionGuard> },
      { path: 'master/item', element: <RolePermissionGuard actionKey="master_item"><ItemPage /></RolePermissionGuard> },
      { path: 'master/payment-terms', element: <RolePermissionGuard actionKey="master_payment_terms"><PaymentTermsPage /></RolePermissionGuard> },
      { path: 'master/payment-type', element: <RolePermissionGuard actionKey="master_payment_type"><PaymentTypePage /></RolePermissionGuard> },
      { path: 'master/tax-types', element: <RolePermissionGuard actionKey="master_tax_types"><TaxTypesPage /></RolePermissionGuard> },
      { path: 'master/company-bank-account', element: <RolePermissionGuard actionKey="master_company_bank_account"><CompanyBankAccountPage /></RolePermissionGuard> },
      { path: 'employee-overall-report', element: <RolePermissionGuard actionKey="report_employee_overall"><EmployeeOverallReportPage /></RolePermissionGuard> },
      { path: 'timesheet-reports', element: <RolePermissionGuard actionKey="report_timesheet"><TimesheetReportPage /></RolePermissionGuard> },
      {
        path: 'expenses',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="expense_tracker"><ExpensesListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="expense_tracker"><ExpensesNewPage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="expense_tracker"><ExpensesEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="expense_tracker"><ExpensesDetailsPage /></RolePermissionGuard> },
        ],
      },
      { path: 'crm-expense-tracker', element: <RolePermissionGuard actionKey="crm_expenses"><CRMExpenseTrackerPage /></RolePermissionGuard> },
      { path: 'expense-tracker', element: <RolePermissionGuard actionKey="expense_tracker"><ExpenseTrackerPage /></RolePermissionGuard> },
      { path: 'holidays', element: <RolePermissionGuard actionKey="holidays"><HolidaysPage /></RolePermissionGuard> },
      { path: 'reimbursement-claims', element: <RolePermissionGuard actionKey="reimbursement_claims"><ReimbursementClaimsPage /></RolePermissionGuard> },
      { path: 'renewals-tracker', element: <RenewalTrackerPage /> },
      { path: 'salary-slips', element: <RolePermissionGuard actionKey="salary_slips"><SalarySlipsPage /></RolePermissionGuard> },
      { path: 'job-openings', element: <RolePermissionGuard actionKey="job_openings"><JobOpeningsPage /></RolePermissionGuard> },
      { path: 'job-applicants', element: <RolePermissionGuard actionKey="job_applicants"><JobApplicantsPage /></RolePermissionGuard> },
      { path: 'interviews', element: <RolePermissionGuard actionKey="interviews"><InterviewPage /></RolePermissionGuard> },
      { path: 'employee-referrals', element: <RolePermissionGuard actionKey="employee_referrals"><EmployeeReferralsPage /></RolePermissionGuard> },
      {
        path: 'purchase',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="purchase"><PurchaseListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="purchase"><PurchaseNewPage /></RolePermissionGuard> },
          { path: 'edit/:id', element: <RolePermissionGuard actionKey="purchase"><PurchaseEditPage /></RolePermissionGuard> },
          { path: ':id', element: <RolePermissionGuard actionKey="purchase"><PurchaseDetailsPage /></RolePermissionGuard> },
        ],
      },

      {
        path: 'invoice-collections',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="invoice_collection"><InvoiceCollectionListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="invoice_collection"><InvoiceCollectionCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="invoice_collection"><InvoiceCollectionEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="invoice_collection"><InvoiceCollectionDetailsPage /></RolePermissionGuard> },
        ],
      },

      {
        path: 'purchase-collections',
        children: [
          { index: true, element: <RolePermissionGuard actionKey="purchase_collection"><PurchaseCollectionListPage /></RolePermissionGuard> },
          { path: 'new', element: <RolePermissionGuard actionKey="purchase_collection"><PurchaseCollectionCreatePage /></RolePermissionGuard> },
          { path: ':id/edit', element: <RolePermissionGuard actionKey="purchase_collection"><PurchaseCollectionEditPage /></RolePermissionGuard> },
          { path: ':id/view', element: <RolePermissionGuard actionKey="purchase_collection"><PurchaseCollectionDetailsPage /></RolePermissionGuard> },
        ],
      },

      {
        path: 'reports',
        children: [
          { path: 'lead', element: <RolePermissionGuard actionKey="report_lead"><LeadReportPage /></RolePermissionGuard> },
          { path: 'sales-target-entry', element: <RolePermissionGuard actionKey="report_sales_target_entry"><SalesTargetEntryReportPage /></RolePermissionGuard> },
          { path: 'contact', element: <RolePermissionGuard actionKey="report_clients"><ContactReportPage /></RolePermissionGuard> },
          { path: 'account', element: <RolePermissionGuard actionKey="report_company"><AccountReportPage /></RolePermissionGuard> },
          { path: 'calls', element: <RolePermissionGuard actionKey="report_calls"><CallsReportPage /></RolePermissionGuard> },
          { path: 'meeting', element: <RolePermissionGuard actionKey="report_meeting"><MeetingReportPage /></RolePermissionGuard> },
          { path: 'purchase', element: <RolePermissionGuard actionKey="report_purchase"><PurchaseReportPage /></RolePermissionGuard> },
          { path: 'expense', element: <RolePermissionGuard actionKey="report_expense"><ExpenseReportPage /></RolePermissionGuard> },
          { path: 'estimation', element: <RolePermissionGuard actionKey="report_estimation"><EstimationReportPage /></RolePermissionGuard> },
          { path: 'invoice', element: <RolePermissionGuard actionKey="report_invoice"><InvoiceReportPage /></RolePermissionGuard> },
          { path: 'invoice-collection', element: <RolePermissionGuard actionKey="report_invoice_collection"><InvoiceCollectionReportPage /></RolePermissionGuard> },
          { path: 'purchase-settlement', element: <RolePermissionGuard actionKey="report_purchase_settlement"><PurchaseCollectionReportPage /></RolePermissionGuard> },
          { path: 'timesheet', element: <RolePermissionGuard actionKey="report_timesheet"><TimesheetReportPage /></RolePermissionGuard> },
          { path: 'attendance', element: <RolePermissionGuard actionKey="report_attendance"><AttendanceReportPage /></RolePermissionGuard> },
          { path: 'leave-allocation', element: <RolePermissionGuard actionKey="report_leave_allocation"><LeaveAllocationReportPage /></RolePermissionGuard> },
          { path: 'daily-log', element: <RolePermissionGuard actionKey="report_daily_log"><DailyLogReportPage /></RolePermissionGuard> },
          { path: 'task-manager', element: <RolePermissionGuard actionKey="report_task"><TaskReportPage /></RolePermissionGuard> },
          { path: 'salary-slip', element: <RolePermissionGuard actionKey="report_salary_slip"><SalarySlipReportPage /></RolePermissionGuard> },
          { path: 'proposal', element: <RolePermissionGuard actionKey="report_proposal"><ProposalReportPage /></RolePermissionGuard> },
          { path: 'prospects', element: <RolePermissionGuard actionKey="report_prospects"><ProspectsReportPage /></RolePermissionGuard> },
        ],
      },
      { path: 'employee-evaluation', element: <RolePermissionGuard actionKey="employee_evaluation"><EmployeeEvaluationPage /></RolePermissionGuard> },
      { path: 'badges', element: <RolePermissionGuard actionKey="badges"><BadgesPage /></RolePermissionGuard> },
      { path: 'employee-monthly-award', element: <RolePermissionGuard actionKey="employee_monthly_award"><EmployeeMonthlyAwardPage /></RolePermissionGuard> },
      { path: 'reminders', element: <RolePermissionGuard actionKey="reminders"><RemindersPage /></RolePermissionGuard> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: 'access-denied',
    element: (
      <Suspense fallback={renderFallback()}>
        <AccessDeniedPage />
      </Suspense>
    ),
  },
  { path: '404', element: <Page404 /> },
  { path: '*', element: <Page404 /> },
];
