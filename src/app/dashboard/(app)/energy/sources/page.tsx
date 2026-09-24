import { redirect } from 'next/navigation';

/**
 * Sources no longer have a page of their own: they live inside the installation
 * their asset belongs to. Both views plotted the same sites, and a source is the
 * energy side of an asset rather than a separate thing.
 *
 * The redirect keeps old links and bookmarks working.
 */
export default function EnergySourcesPage() {
  redirect('/dashboard/assets');
}
