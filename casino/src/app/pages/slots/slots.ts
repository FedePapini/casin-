import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { CommonModule } from '@angular/common';

type Symbol = '🍒'|'🍋'|'🔔'|'⭐'|'💎';

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './slots.html',
  styleUrls: ['./slots.css']
})

export class SlotsComponent {
  bet = 20;
  reels: Symbol[] = ['🍒','🍒','🍒'];
  msg = 'Imposta puntata e gira!';
  lastWin = 0;

  symbols: Symbol[] = ['🍒','🍋','🔔','⭐','💎'];

  constructor(private wallet: WalletService) {}

  private spinOne(): Symbol {
    const i = Math.floor(Math.random() * this.symbols.length);
    return this.symbols[i];
  }

  private payoutMultiplier(a: Symbol, b: Symbol, c: Symbol): number {
    // regole semplici
    if (a === b && b === c) {
      if (a === '💎') return 10;
      if (a === '⭐') return 6;
      if (a === '🔔') return 4;
      if (a === '🍋') return 3;
      return 2; // 🍒
    }
    // 2 uguali: piccolo premio
    if (a === b || b === c || a === c) return 1; // restituisce la puntata (push)
    return 0;
  }

  async spin() {
    this.msg = '';
    this.lastWin = 0;

    if (this.bet < 1) { this.msg = 'Puntata non valida.'; return; }

    try {
      await this.wallet.spend(this.bet);
    } catch (e: any) {
      this.msg = e?.message ?? 'Crediti insufficienti';
      return;
    }

    const a = this.spinOne();
    const b = this.spinOne();
    const c = this.spinOne();
    this.reels = [a,b,c];

    const mult = this.payoutMultiplier(a,b,c);
    const win = this.bet * mult;

    if (win > 0) {
      await this.wallet.payout(win);
      this.lastWin = win;
      this.msg = mult === 1 ? '2 uguali! Push: ti torna la puntata.' : `Hai vinto x${mult}!`;
    } else {
      this.msg = 'Niente premio. Riprova!';
    }
  }
}
