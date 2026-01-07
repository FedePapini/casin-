import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.css']
})
export class WalletComponent {
  private wallet = inject(WalletService);

  credits$ = this.wallet.credits$;

  amount = 1000;
  msg = '';

  async add() {
    this.msg = '';
    const n = Number(this.amount);

    if (!Number.isFinite(n) || n <= 0) {
      this.msg = 'Inserisci un importo valido (> 0).';
      return;
    }

    try {
      await this.wallet.addCredits(Math.floor(n));
      this.msg = `Ricarica effettuata: +${Math.floor(n)} crediti.`;
    } catch (e: any) {
      this.msg = e?.message ?? 'Errore durante la ricarica.';
    }
  }
}
