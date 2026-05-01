import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AtsCheck } from './pages/ats-check/ats-check';
import { JdCheck } from './pages/jd-check/jd-check';
import { Results } from './pages/results/results';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'ats-check',
    component: AtsCheck
  },
  {
    path: 'jd-check',
    component: JdCheck
  },
  {
    path: 'results',
    component: Results
  },
  {
    path: '**',
    redirectTo: ''
  }
];
