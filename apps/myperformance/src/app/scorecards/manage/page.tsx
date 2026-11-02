import ScorecardsPage from '../page';

/**
 * Dedicated admin entry point used by the sidebar/bottom navigation. The page
 * component itself guards the "Kelola Sesi" tab with the manager/admin
 * capability, so a direct visit by a Petugas shows a locked state instead of
 * admin controls.
 */
export default function ManageScorecardsPage() {
  return <ScorecardsPage initialTab="manage" />;
}
