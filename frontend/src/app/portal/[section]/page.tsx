import WorkspaceEntry from '@/src/screens/portal/WorkspaceEntry';

const sections = [
  'overview', 'alerts', 'tickets', 'assets', 'licenses', 'contracts',
  'invoices', 'documents', 'knowledge', 'team', 'audit',
];

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default function ClientPortalSectionPage() {
  return <WorkspaceEntry workspace="client" />;
}
