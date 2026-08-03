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
}

const CLIENT_NAVIGATION: PortalNavigationItem[] = [
  { icon: Gauge, label: 'Tổng quan', path: '/client/overview' },
  { icon: ShieldAlert, label: 'Cảnh báo', path: '/client/alerts', roles: ['client_admin', 'client_viewer', 'technical'] },
  { icon: Tickets, label: 'Ticket hỗ trợ', path: '/client/tickets' },
  { icon: Server, label: 'Tài sản', path: '/client/assets', roles: ['client_admin', 'client_viewer', 'technical'] },
  { icon: KeyRound, label: 'Giấy phép', path: '/client/licenses', roles: ['client_admin', 'client_viewer', 'technical'] },
  { icon: ClipboardList, label: 'Hợp đồng', path: '/client/contracts' },
  { icon: ReceiptText, label: 'Hóa đơn', path: '/client/invoices' },
  { icon: FileText, label: 'Tài liệu', path: '/client/documents' },
  { icon: BookOpen, label: 'Tri thức', path: '/client/knowledge' },
  { icon: Users, label: 'Thành viên', path: '/client/team', roles: ['client_admin'] },
  { icon: FileClock, label: 'Audit log', path: '/client/audit', roles: ['client_admin', 'client_viewer', 'technical'] },
];

const INTERNAL_NAVIGATION: PortalNavigationItem[] = [
  { icon: Gauge, label: 'SOC tổng quan', path: '/admin/soc' },
  { icon: ShieldAlert, label: 'Cảnh báo', path: '/admin/alerts' },
  { icon: Tickets, label: 'Điều phối ticket', path: '/admin/tickets' },
  { icon: Building2, label: 'Khách hàng', path: '/admin/customers' },
  { icon: Server, label: 'Tài sản', path: '/admin/assets' },
  { icon: KeyRound, label: 'Giấy phép', path: '/admin/licenses' },
  { icon: ClipboardList, label: 'Hợp đồng', path: '/admin/contracts', roles: ['account_manager', 'qts_admin'] },
  { icon: ReceiptText, label: 'Hóa đơn', path: '/admin/invoices', roles: ['account_manager', 'qts_admin'] },
  { icon: FileText, label: 'Tài liệu', path: '/admin/documents' },
  { icon: BookOpen, label: 'Tri thức', path: '/admin/knowledge' },
  { icon: Boxes, label: 'Tích hợp', path: '/admin/integrations', roles: ['soc_l2', 'soc_l3', 'account_manager', 'qts_admin'] },
  { icon: Users, label: 'Thành viên', path: '/admin/team', roles: ['account_manager', 'qts_admin'] },
  { icon: ClipboardList, label: 'Ca trực SOC', path: '/admin/shifts' },
  { icon: FileClock, label: 'Audit log', path: '/admin/audit' },
];

export function navigationFor(session: PortalSession): PortalNavigationItem[] {
  const source = session.authorization.workspace === 'client' ? CLIENT_NAVIGATION : INTERNAL_NAVIGATION;
  return source.filter((item) => !item.roles || item.roles.includes(session.authorization.role));
}
