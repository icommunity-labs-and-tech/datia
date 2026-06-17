'use client';

import BoxStretched from './BoxStretched';
// import { usePathname } from 'next/navigation';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import { Stack } from 'react-bootstrap';
import Link from 'next/link';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LogoutButton from './logout';
// import { useRouter } from 'next/navigation';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { useTutorialContext } from '@/lib/tutorial/TutorialProvider';
import { TOUR_IDS, sidebarTour } from '@/lib/tutorial/tutorialConfig';

export default function PageHeader() {
  const t = useTranslations('header');
  const tAccessibility = useTranslations('accessibility');
  const { resetTour, startTour } = useTutorialContext();

  const handleShowTutorial = () => {
    // Resetear el tour del sidebar para poder mostrarlo de nuevo
    resetTour(TOUR_IDS.SIDEBAR_TOUR);
    // Iniciar el tour después de un pequeño delay para asegurar que los elementos estén renderizados
    setTimeout(() => {
      startTour(TOUR_IDS.SIDEBAR_TOUR, sidebarTour, { allowClose: true });
    }, 300);
  };
  
  return (
    <BoxStretched>
      <Stack direction="horizontal" className="w-100 justify-content-between align-items-center">
        <button
          type="button"
          className="btn btn-link p-0 me-2 d-md-none"
          title={t('openMenu')}
          aria-label={t('openMenu')}
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('sidebar:toggle'));
            } catch (error) {
              console.error('Error dispatching sidebar toggle event:', error);
            }
          }}
        >
          <i className="bi bi-list fs-4" />
        </button>
        <div className="d-none d-md-block">
          <Breadcrumbs />
        </div>

        <div className="d-flex align-items-center gap-3">
          <LanguageSwitcher />
          <Link href="/dashboard/profile" className="text-dark" title={tAccessibility('profile')}>
            <i className="bi bi-person-circle fs-5" />
          </Link>
          <button
            type="button"
            className="btn btn-link p-0 text-dark"
            title="Mostrar tutorial"
            aria-label="Mostrar tutorial"
            onClick={handleShowTutorial}
          >
            <i className="bi bi-question-circle fs-5" />
          </button>
          <LogoutButton />
        </div>
      </Stack>
    </BoxStretched>
  );
}

function Breadcrumbs() {
  const { segments, loading } = useBreadcrumbs();
  const t = useTranslations('breadcrumbs');

  if (loading) {
    return (
      <Breadcrumb>
        <Breadcrumb.Item>
          <span className="text-muted">{t('loading')}</span>
        </Breadcrumb.Item>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      {segments.map((segment) => {
        return segment.isLast ? (
          <Breadcrumb.Item key={segment.id} active>
            {segment.label}
          </Breadcrumb.Item>
        ) : (
          <li key={segment.id} className="breadcrumb-item">
            <Link href={segment.href} className="text-decoration-none">
              {segment.label}
            </Link>
          </li>
        );
      })}
    </Breadcrumb>
  );
}
