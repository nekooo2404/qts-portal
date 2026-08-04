import { permanentRedirect } from 'next/navigation';

export default function LegacyResourcesRedirect() {
  permanentRedirect('/tin-tuc/');
}
