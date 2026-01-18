import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { Home } from './pages/home/home';
import { BlackjackComponent } from './pages/blackjack/blackjack';
import { SlotsComponent } from './pages/slots/slots';
import { F1Component } from './pages/f1/f1';
import { WalletComponent } from './pages/wallet/wallet';
import { RouletteComponent } from './pages/roulette/roulette';
import { ScratchCardComponent } from './pages/scratch-card/scratch-card';

import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: '', component: Home, canActivate: [AuthGuard] },
  { path: 'wallet', component: WalletComponent, canActivate: [AuthGuard] },

  { path: 'blackjack', component: BlackjackComponent, canActivate: [AuthGuard] },
  { path: 'slots', component: SlotsComponent, canActivate: [AuthGuard] },
  { path: 'roulette', component: RouletteComponent, canActivate: [AuthGuard] },
  { path: 'scratch', component: ScratchCardComponent, canActivate: [AuthGuard] },
  { path: 'f1', component: F1Component, canActivate: [AuthGuard] },

  { path: '**', redirectTo: '' }
];
