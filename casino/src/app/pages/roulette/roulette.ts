import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { WalletService } from '../../services/wallet.service';

type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';

interface Bet {
  type: BetType;
  value: number | string;
  amount: number;
}

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './roulette.html',
  styleUrls: ['./roulette.css']
})
export class RouletteComponent {
  betAmount = 10;
  selectedBets: Bet[] = [];
  
  spinning = false;
  currentNumber: number | null = null;
  wheelRotation = 0;
  message = 'Piazza le tue scommesse!';
  lastWin = 0;

  // Numeri in ordine sulla ruota (0-36)
  wheelNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

  // Numeri rossi europei
  redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  constructor(private wallet: WalletService, private cdr: ChangeDetectorRef) {}

  addBet(type: BetType, value: number | string) {
    // Check if same bet already exists
    const existing = this.selectedBets.find(b => b.type === type && b.value === value);
    if (existing) {
      existing.amount += this.betAmount;
    } else {
      this.selectedBets.push({ type, value, amount: this.betAmount });
    }
  }

  removeBet(index: number) {
    this.selectedBets.splice(index, 1);
  }

  getTotalBet(): number {
    return this.selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
  }

  async spin() {
    const totalBet = this.getTotalBet();
    if (totalBet <= 0) {
      this.message = '❌ Piazza almeno una scommessa!';
      return;
    }

    this.spinning = true;
    
    try {
      await this.wallet.spend(totalBet);
      
      // Simula rotazione - genera numero casuale all'inizio
      const winningNumber = Math.floor(Math.random() * 37);
      const winningIndex = this.wheelNumbers.indexOf(winningNumber);
      
      // Calcola la rotazione: parte da 0 e ruota fino al numero
      // Angolo per numero: 360 / 37 = 9.729729...
      const anglePerNumber = 360 / 37;
      const fullSpins = 10 + Math.random() * 5;
      const baseRotation = fullSpins * 360;
      // Il numero all'indice 0 è a 0°, quindi per portare il numero vincente al marker
      // devo ruotare di: baseRotation + (winningIndex * anglePerNumber)
      const finalRotation = baseRotation + (winningIndex * anglePerNumber);
      
      const duration = 3000;
      const startTime = Date.now();
      
      await new Promise((resolve) => {
        const spinInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing: ease-out per rallentare verso la fine
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          this.wheelRotation = baseRotation * easeProgress + (finalRotation - baseRotation) * easeProgress;
          this.cdr.detectChanges();
          
          if (elapsed > duration) {
            clearInterval(spinInterval);
            this.wheelRotation = finalRotation;
            this.currentNumber = winningNumber;
            this.spinning = false;
            this.cdr.detectChanges();
            resolve(null);
          }
        }, 16);
      });
      
      await this.checkWins();
      this.cdr.detectChanges();
    } catch (error: any) {
      this.spinning = false;
      this.message = '❌ ' + (error.message || 'Errore durante la scommessa');
    }
  }

  private async checkWins() {
    if (this.currentNumber === null) return;

    let totalWin = 0;

    for (const bet of this.selectedBets) {
      let won = false;
      let payout = 0;

      if (bet.type === 'number') {
        if (this.currentNumber === bet.value) {
          won = true;
          payout = bet.amount * 36; // 35:1 payout
        }
      } else if (bet.type === 'red') {
        if (this.redNumbers.includes(this.currentNumber)) {
          won = true;
          payout = bet.amount * 2;
        }
      } else if (bet.type === 'black') {
        if (this.currentNumber !== 0 && !this.redNumbers.includes(this.currentNumber)) {
          won = true;
          payout = bet.amount * 2;
        }
      } else if (bet.type === 'even') {
        if (this.currentNumber !== 0 && this.currentNumber % 2 === 0) {
          won = true;
          payout = bet.amount * 2;
        }
      } else if (bet.type === 'odd') {
        if (this.currentNumber % 2 === 1) {
          won = true;
          payout = bet.amount * 2;
        }
      } else if (bet.type === 'low') {
        if (this.currentNumber > 0 && this.currentNumber <= 18) {
          won = true;
          payout = bet.amount * 2;
        }
      } else if (bet.type === 'high') {
        if (this.currentNumber >= 19) {
          won = true;
          payout = bet.amount * 2;
        }
      }

      if (won) {
        totalWin += payout;
      }
    }

    if (totalWin > 0) {
      await this.wallet.payout(totalWin);
      this.lastWin = totalWin;
      this.message = `🎉 Hai vinto ${totalWin} crediti! (${this.currentNumber})`;
    } else {
      this.message = `😞 Hai perso! È uscito il ${this.currentNumber}`;
    }

    this.selectedBets = [];
  }

  getNumberColor(num: number): string {
    if (num === 0) return 'green';
    return this.redNumbers.includes(num) ? 'red' : 'black';
  }

  clearBets() {
    this.selectedBets = [];
    this.message = 'Scommesse cancellate!';
  }
}
