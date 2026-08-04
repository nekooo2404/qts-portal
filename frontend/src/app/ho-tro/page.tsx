import { permanentRedirect } from 'next/navigation';

export default function LegacySupportRedirect() {
  permanentRedirect('/lien-he/');
}
