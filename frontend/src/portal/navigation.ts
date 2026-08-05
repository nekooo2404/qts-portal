import {
  BookOpen, Boxes, Building2, ClipboardList, FileClock, FileText, Gauge,
  KeyRound, ReceiptText, Server, ShieldAlert, Tickets, Users,
  type LucideIcon,
} from 'lucide-react';

import type { PortalSession } from '../auth/types';

export interface PortalNavigationItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: string[];
  section: string;
}

const CLIENT_NAVIGATION: PortalNavigationItem[] = [
  { icon: Gauge, label: 'Tổng quan', path: '/portal/overview', section: 'Tổng quan' },
  { icon: Tickets, label: 'Ticket', path: '/portal/tickets', section: 'Vận hành' },
  { icon: ShieldAlert, label: 'Cảnh báo', path: '/portal/alerts', roles: ['client_admin', 'client_viewer', 'technical'], section: 'Vận hành' },
  { icon: Server, label: 'Tài sản', path: '/portal/assets', roles: ['client_admin', 'client_viewer', 'technical'], section: 'Vận hành' },
  { icon: KeyRound, label: 'License', path: '/portal/licenses', roles: ['client_admin', 'client_viewer', 'technical'], section: 'Hồ sơ dịch vụ' },
  { icon: ClipboardList, label: 'Hợp đồng', path: '/portal/contracts', section: 'Hồ sơ dịch vụ' },
  { icon: ReceiptText, label: 'Hóa đơn', path: '/portal/invoices', section: 'Hồ sơ dịch vụ' },
  { icon: FileText, label: 'Tài liệu', path: '/portal/documents', section: 'Hồ sơ dịch vụ' },
  { icon: BookOpen, label: 'Tri thức', path: '/portal/knowledge', section: 'Hồ sơ dịch vụ' },
  { icon: Users, label: 'Thành viên', path: '/portal/team', roles: ['client_admin'], section: 'Tổ chức' },
  { icon: FileClock, label: 'Nhật ký hoạt động', path: '/portal/audit', roles: ['client_admin', 'client_viewer', 'technical'], section: 'Tổ chức' },
];

const INTERNAL_NAVIGATION: PortalNavigationItem[] = [
  { icon: Gauge, label: 'Trung tâm điều hành', path: '/admin/soc', section: 'Điều hành' },
  { icon: ShieldAlert, label: 'Cảnh báo', path: '/admin/alerts', section: 'Điều hành' },
  { icon: Tickets, label: 'Điều phối ticket', path: '/admin/tickets', section: 'Điều hành' },
  { icon: ClipboardList, label: 'Ca trực SOC', path: '/admin/shifts', section: 'Điều hành' },
  { icon: Building2, label: 'Khách hàng', path: '/admin/customers', section: 'Khách hàng' },
  { icon: Server, label: 'Tài sản', path: '/admin/assets', section: 'Khách hàng' },
  { icon: KeyRound, label: 'Giấy phép', path: '/admin/licenses', section: 'Khách hàng' },
  { icon: ClipboardList, label: 'Hợp đồng', path: '/admin/contracts', roles: ['account_manager', 'qts_admin'], section: 'Khách hàng' },
  { icon: ReceiptText, label: 'Hóa đơn', path: '/admin/invoices', roles: ['account_manager', 'qts_admin'], section: 'Khách hàng' },
  { icon: FileText, label: 'Tài liệu', path: '/admin/documents', section: 'Nền tảng' },
  { icon: BookOpen, label: 'Tri thức', path: '/admin/knowledge', section: 'Nền tảng' },
  { icon: Boxes, label: 'Tích hợp', path: '/admin/integrations', roles: ['soc_l2', 'soc_l3', 'account_manager', 'qts_admin'], section: 'Nền tảng' },
  { icon: Users, label: 'Thành viên', path: '/admin/team', roles: ['account_manager', 'qts_admin'], section: 'Nền tảng' },
  { icon: FileClock, label: 'Audit log', path: '/admin/audit', section: 'Nền tảng' },
];

export function navigationFor(session: PortalSession): PortalNavigationItem[] {
  const source = session.authorization.workspace === 'client' ? CLIENT_NAVIGATION : INTERNAL_NAVIGATION;
  return source.filter((item) => !item.roles || item.roles.includes(session.authorization.role));
}
