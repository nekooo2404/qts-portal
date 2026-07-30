import { ContactPanel } from '../components/ContactPanel';
import { OperationsFlow } from '../components/OperationsFlow';
import { SecurityMap } from '../components/SecurityMap';
import { ServiceLedger } from '../components/ServiceLedger';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { TrustResources } from '../components/TrustResources';

export default function MarketingPortal() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <SiteHeader />
      <main id="main-content">
        <SecurityMap />
        <ServiceLedger />
        <OperationsFlow />
        <TrustResources />
        <ContactPanel />
      </main>
      <SiteFooter />
    </>
  );
}
