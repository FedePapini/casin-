import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';

type Card = { r: string; s: string }; // rank, suit

@Component({
  selector: 'app-blackjack',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './blackjack.html',
  styleUrls: ['./blackjack.css']
})

export class BlackjackComponent {
  bet = 50;

  deck: Card[] = [];
  player: Card[] = [];
  dealer: Card[] = [];
  status = 'Imposta la puntata e premi “Nuova mano”.';
  inHand = false;
  settled = false;

  constructor(private wallet: WalletService) {}

  private newDeck(): Card[] {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const d: Card[] = [];
    for (const s of suits) for (const r of ranks) d.push({ r, s });
    // shuffle
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  private draw(): Card {
    return this.deck.pop()!;
  }

  private handValue(hand: Card[]): number {
    // A = 11 o 1
    let total = 0;
    let aces = 0;
    for (const c of hand) {
      if (c.r === 'A') { total += 11; aces++; }
      else if (['K','Q','J'].includes(c.r)) total += 10;
      else total += parseInt(c.r, 10);
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  get playerValue() { return this.handValue(this.player); }
  get dealerValue() { return this.handValue(this.dealer); }

  private isBlackjack(hand: Card[]) {
    return hand.length === 2 && this.handValue(hand) === 21;
  }

  async newHand() {
    this.status = '';
    this.settled = false;

    if (this.bet < 1) { this.status = 'Puntata non valida.'; return; }

    try {
      await this.wallet.spend(this.bet);
    } catch (e: any) {
      this.status = e?.message ?? 'Crediti insufficienti';
      return;
    }

    this.deck = this.newDeck();
    this.player = [this.draw(), this.draw()];
    this.dealer = [this.draw(), this.draw()];
    this.inHand = true;

    // check immediate blackjack
    const pBJ = this.isBlackjack(this.player);
    const dBJ = this.isBlackjack(this.dealer);

    if (pBJ || dBJ) {
      await this.finishHand();
    } else {
      this.status = 'Tocca a te: Hit o Stand?';
    }
  }

  async hit() {
    if (!this.inHand || this.settled) return;
    this.player.push(this.draw());
    if (this.playerValue > 21) {
      await this.finishHand();
    }
  }

  async stand() {
    if (!this.inHand || this.settled) return;
    await this.finishHand(true);
  }

  private async finishHand(playerStands = false) {
    // dealer plays if player stands and player not bust
    if (playerStands && this.playerValue <= 21) {
      while (this.dealerValue < 17) {
        this.dealer.push(this.draw());
      }
    }

    const p = this.playerValue;
    const d = this.dealerValue;

    const pBJ = this.isBlackjack(this.player);
    const dBJ = this.isBlackjack(this.dealer);

    let result = '';
    let payout = 0;

    if (p > 21) {
      result = 'Hai sballato. Hai perso.';
      payout = 0;
    } else if (d > 21) {
      result = 'Il banco sballa. Hai vinto!';
      payout = this.bet * 2;
    } else if (pBJ && !dBJ) {
      result = 'BLACKJACK! Paga 3:2';
      payout = this.bet + Math.floor(this.bet * 1.5);
    } else if (dBJ && !pBJ) {
      result = 'Blackjack del banco. Hai perso.';
      payout = 0;
    } else if (p > d) {
      result = 'Hai vinto!';
      payout = this.bet * 2;
    } else if (p < d) {
      result = 'Hai perso.';
      payout = 0;
    } else {
      result = 'Pareggio (push). Ti torna la puntata.';
      payout = this.bet;
    }

    if (payout > 0) await this.wallet.payout(payout);

    this.inHand = false;
    this.settled = true;
    this.status = `${result} (Tu: ${p} | Banco: ${d})`;
  }

  cardToString(c: Card) { return `${c.r}${c.s}`; }
}
