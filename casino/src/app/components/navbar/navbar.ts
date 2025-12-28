import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { Observable } from 'rxjs';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIf],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  credits$!: Observable<number>;
  user$!: Observable<User | null>;

  constructor(public auth: AuthService, public wallet: WalletService) {
    this.credits$ = this.wallet.credits$;
    this.user$ = this.auth.user$;
  }

  async recharge() {
    await this.wallet.addCredits(10000);
  }

  async logout() {
    await this.auth.logout();
  }
}
