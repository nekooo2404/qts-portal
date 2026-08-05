import WorkspaceEntry from '@/src/screens/portal/WorkspaceEntry';

const sections = [
  'soc', 'alerts', 'tickets', 'shifts', 'customers', 'assets', 'licenses',
  'contracts', 'invoices', 'documents', 'knowledge', 'integrations', 'team', 'audit',
];

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default function AdminPortalSectionPage() {
  return <WorkspaceEntry workspace="internal" />;
}
