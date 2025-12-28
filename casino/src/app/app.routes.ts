import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { Home } from './pages/home/home';
import { BlackjackComponent } from './pages/blackjack/blackjack';
import { SlotsComponent } from './pages/slots/slots';
import { F1Component } from './pages/f1/f1';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: Home, canActivate: [AuthGuard] },
  { path: 'blackjack', component: BlackjackComponent, canActivate: [AuthGuard] },
  { path: 'slots', component: SlotsComponent, canActivate: [AuthGuard] },
  { path: 'f1', component: F1Component, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
