import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { WalletService } from '../../services/wallet.service';

interface Card {
  value: number;
  revealed: boolean;
  scratching: boolean;
  matched: boolean;
}

@Component({
  selector: 'app-scratch-card',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './scratch-card.html',
  styleUrls: ['./scratch-card.css']
})
export class ScratchCardComponent {
  betAmount = 10;
  cards: Card[] = [];
  gameActive = false;
  gameEnded = false;
  message = 'Seleziona l\'importo e clicca "Nuova Carta"';
  lastWin = 0;

  get allCardsRevealed(): boolean {
    return this.cards.length > 0 && this.cards.every(c => c.revealed);
  }

  constructor(private wallet: WalletService, private cdr: ChangeDetectorRef) {
    this.initNewGame();
  }

  initNewGame() {
    this.cards = [];
    this.gameActive = false;
    this.lastWin = 0;
    this.message = 'Seleziona l\'importo e clicca "Nuova Carta"';
  }

  async newCard() {
    if (this.betAmount <= 0) {
      this.message = '❌ Importo non valido!';
      return;
    }

    try {
      await this.wallet.spend(this.betAmount);
      
      // Genera 25 numeri casuali (1-99) per più varietà
      this.cards = [];
      for (let i = 0; i < 25; i++) {
        this.cards.push({
          value: Math.floor(Math.random() * 99) + 1,
          revealed: false,
          scratching: false,
          matched: false
        });
      }
      
      this.gameActive = true;
      this.message = '🎫 Gratta tutte le carte per rivelare i numeri!';
      this.cdr.detectChanges();
    } catch (error: any) {
      this.message = '❌ ' + (error.message || 'Crediti insufficienti');
    }
  }

  scratchCard(index: number) {
    if (!this.gameActive || this.cards[index].revealed) return;

    const card = this.cards[index];
    card.scratching = true;
    this.cdr.detectChanges();

    // Simulazione di grattamento
    setTimeout(() => {
      card.revealed = true;
      card.scratching = false;
      
      // Evidenzia i numeri uguali
      const matchingCards = this.cards.filter((c, i) => c.revealed && c.value === card.value && i !== index);
      if (matchingCards.length > 0) {
        card.matched = true;
        matchingCards.forEach(c => c.matched = true);
        
        // Conta quante carte restano da rivelare PRIMA di rivelare questa
        const unrevealdCards = this.cards.filter(c => !c.revealed).length;
        
        // Non rimuovere l'evidenziazione se questa è l'ultima carta da rivelare
        if (unrevealdCards > 0) {
          // Rimuovi l'evidenziazione dopo 1.5 secondi SOLO se il gioco non è finito
          setTimeout(() => {
            if (!this.gameEnded) {
              card.matched = false;
              matchingCards.forEach(c => c.matched = false);
              this.cdr.detectChanges();
            }
          }, 1500);
        }
      }
      
      this.cdr.detectChanges();
      
      // Controlla se tutte le carte sono state rivelate
      if (this.cards.every(c => c.revealed)) {
        setTimeout(() => this.checkWin(), 300);
      }
    }, 300);
  }

  private async checkWin() {
    this.gameActive = false;
    this.gameEnded = true;
    const values = this.cards.map(c => c.value);

    // Pattern vincenti con 5x5 (25 carte)
    let won = false;
    let winType = '';
    let multiplier = 0;
    let winningNumber = -1;

    // Conta le occorrenze di ogni numero
    const occurrences = this.countAllOccurrences(values);
    const maxCount = Math.max(...occurrences.values());

    // 1. Cinque uguali
    if (maxCount === 5) {
      won = true;
      winType = 'JACKPOT! Cinque numeri uguali!';
      multiplier = 50;
      winningNumber = Array.from(occurrences.entries()).find(([_, count]) => count === 5)?.[0] || -1;
    }
    // 2. Quattro uguali
    else if (maxCount === 4) {
      won = true;
      winType = 'Quattro numeri uguali!';
      multiplier = 20;
      winningNumber = Array.from(occurrences.entries()).find(([_, count]) => count === 4)?.[0] || -1;
    }
    // 3. Tre uguali
    else if (maxCount === 3) {
      won = true;
      winType = 'Tre numeri uguali!';
      multiplier = 8;
      winningNumber = Array.from(occurrences.entries()).find(([_, count]) => count === 3)?.[0] || -1;
    }
    // 4. Due uguali
    else if (maxCount === 2) {
      won = true;
      winType = 'Due numeri uguali!';
      multiplier = 2;
      winningNumber = Array.from(occurrences.entries()).find(([_, count]) => count === 2)?.[0] || -1;
    }

    // Evidenzia i numeri vincenti
    if (won && winningNumber !== -1) {
      this.cards.forEach(card => {
        if (card.value === winningNumber) {
          card.matched = true;
        }
      });
    }

    if (won) {
      const payout = this.betAmount * multiplier;
      await this.wallet.payout(payout);
      this.lastWin = payout;
      this.message = `🎉 ${winType} Hai vinto ${payout} crediti!`;
    } else {
      this.message = `😞 Nessun premio! Riprovate!`;
    }

    this.cdr.detectChanges();
  }

  private countAllOccurrences(values: number[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const val of values) {
      counts.set(val, (counts.get(val) || 0) + 1);
    }
    return counts;
  }

  getCardColor(value: number): string {
    // Generazione dinamica di colori basata sul numero
    const colorPalette = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
      '#a29bfe', '#fd79a8', '#fdcb6e', '#27ae60', '#e74c3c',
      '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
      '#c0392b', '#16a085', '#8e44ad', '#d35400', '#95a5a6',
      '#34495e', '#e67e22', '#2980b9', '#16a085', '#d35400'
    ];
    return colorPalette[(value - 1) % colorPalette.length];
  }

  endGame() {
    this.gameActive = false;
    this.gameEnded = false;
    this.cards = [];
    this.lastWin = 0;
    this.message = 'Gioco terminato! Seleziona un nuovo importo per giocare.';
    this.cdr.detectChanges();
  }
}
