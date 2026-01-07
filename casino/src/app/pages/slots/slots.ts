import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { WalletService } from '../../services/wallet.service';

type Sym = '🍒' | '🍋' | '🔔' | '⭐' | '💎' | '🃏'; // 🃏 = WILD

type Pos = { r: number; c: number };

type Payline = {
  id: number;
  name: string;
  path: Pos[]; // 5 posizioni (col 0..4)
};

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './slots.html',
  styleUrls: ['./slots.css']
})
export class SlotsComponent {
  bet = 20;

  // 4 righe x 5 colonne
  grid: Sym[][] = [
    ['🍒','🍋','🔔','⭐','💎'],
    ['🍋','🔔','⭐','💎','🍒'],
    ['🔔','⭐','💎','🍒','🍋'],
    ['⭐','💎','🍒','🍋','🔔'],
  ];

  msg = 'Imposta puntata e gira!';
  lastWin = 0;

  // risultati per payline
  lineWins: { line: string; symbol: Sym; count: number; win: number }[] = [];

  // Paylines (esempi classici + zig-zag)
  paylines: Payline[] = [
    { id: 1, name: 'Riga 1', path: this.rowLine(0) },
    { id: 2, name: 'Riga 2', path: this.rowLine(1) },
    { id: 3, name: 'Riga 3', path: this.rowLine(2) },
    { id: 4, name: 'Riga 4', path: this.rowLine(3) },

    { id: 5, name: 'Diagonale ↘', path: [ {r:0,c:0},{r:1,c:1},{r:2,c:2},{r:3,c:3},{r:3,c:4} ] },
    { id: 6, name: 'Diagonale ↗', path: [ {r:3,c:0},{r:2,c:1},{r:1,c:2},{r:0,c:3},{r:0,c:4} ] },

    { id: 7, name: 'ZigZag Alto', path: [ {r:0,c:0},{r:1,c:1},{r:0,c:2},{r:1,c:3},{r:0,c:4} ] },
    { id: 8, name: 'ZigZag Basso', path: [ {r:3,c:0},{r:2,c:1},{r:3,c:2},{r:2,c:3},{r:3,c:4} ] },

    { id: 9, name: 'V Centrale', path: [ {r:1,c:0},{r:0,c:1},{r:1,c:2},{r:2,c:3},{r:1,c:4} ] },
    { id: 10, name: 'W Centrale', path: [ {r:2,c:0},{r:3,c:1},{r:2,c:2},{r:1,c:3},{r:2,c:4} ] },
  ];

  // simboli (WILD incluso)
  symbols: Sym[] = ['🍒','🍋','🔔','⭐','💎','🃏'];

  constructor(private wallet: WalletService) {}

  private rowLine(r: number): Pos[] {
    return [ {r, c:0},{r, c:1},{r, c:2},{r, c:3},{r, c:4} ];
  }

  // Probabilità (WILD raro)
  private spinSym(): Sym {
    const x = Math.random();
    if (x < 0.03) return '🃏';        // 3% wild
    if (x < 0.13) return '💎';        // 10%
    if (x < 0.28) return '⭐';         // 15%
    if (x < 0.48) return '🔔';         // 20%
    if (x < 0.72) return '🍋';         // 24%
    return '🍒';                      // 28%
  }

  // "forza" simbolo (WILD non paga da solo, ma può pagare se tutta la combo è wild)
  private baseMult(sym: Sym): number {
    switch (sym) {
      case '💎': return 5.0;
      case '⭐': return 3.0;
      case '🔔': return 2.0;
      case '🍋': return 1.5;
      case '🍒': return 1.2;
      case '🃏': return 6.0; // se esce combo tutta wild, paga bene
    }
  }

  // moltiplicatore in base alla lunghezza (3,4,5)
  private lineMultiplier(sym: Sym, count: number): number {
    // base * (count-2) e un piccolo boost per 5-of-a-kind
    let mult = this.baseMult(sym) * (count - 2);
    if (count === 5) mult *= 1.25;
    return mult;
  }

  private getAt(pos: Pos): Sym {
    return this.grid[pos.r][pos.c];
  }

  /**
   * Valuta una payline:
   * - Conta da sinistra quanti simboli consecutivi matchano.
   * - WILD (🃏) sostituisce qualunque simbolo.
   * - Il simbolo “target” è il primo NON-WILD incontrato; se sono tutti wild => target=wild.
   */
  private evaluateLine(line: Payline): { symbol: Sym; count: number; mult: number } | null {
    const symbols = line.path.map(p => this.getAt(p));

    // trova il simbolo target (primo non-wild)
    let target: Sym | null = null;
    for (const s of symbols) {
      if (s !== '🃏') { target = s; break; }
    }
    if (!target) target = '🃏';

    // conta match consecutivi da sinistra: target o wild
    let count = 0;
    for (const s of symbols) {
      if (s === target || s === '🃏') count++;
      else break;
    }

    if (count < 3) return null;

    // se target non è wild ma la combo contiene wild, bonus leggero
    let mult = this.lineMultiplier(target, count);
    const wildsInCombo = symbols.slice(0, count).filter(s => s === '🃏').length;
    if (target !== '🃏' && wildsInCombo > 0) {
      mult *= (1 + 0.10 * wildsInCombo); // +10% per ogni wild nella combo
    }

    return { symbol: target, count, mult };
  }

  async spin() {
    this.msg = '';
    this.lastWin = 0;
    this.lineWins = [];

    const b = Math.floor(Number(this.bet));
    if (!Number.isFinite(b) || b < 1) {
      this.msg = 'Puntata non valida.';
      return;
    }

    try {
      await this.wallet.spend(b);
    } catch (e: any) {
      this.msg = e?.message ?? 'Crediti insufficienti';
      return;
    }

    // genera griglia 4x5
    const rows = 4, cols = 5;
    const newGrid: Sym[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Sym[] = [];
      for (let c = 0; c < cols; c++) row.push(this.spinSym());
      newGrid.push(row);
    }
    this.grid = newGrid;

    // puntata “per spin” divisa sulle linee (più linee, più possibilità)
    // Qui: ogni linea usa (bet / nLinee) come base payout
    const perLineStake = Math.max(1, Math.floor(b / this.paylines.length));

    let totalWin = 0;
    for (const line of this.paylines) {
      const res = this.evaluateLine(line);
      if (res) {
        const win = Math.floor(perLineStake * res.mult);
        totalWin += win;
        this.lineWins.push({
          line: line.name,
          symbol: res.symbol,
          count: res.count,
          win
        });
      }
    }

    if (totalWin > 0) {
      await this.wallet.payout(totalWin);
      this.lastWin = totalWin;
      this.msg = `Hai vinto! Totale +${totalWin} crediti`;
    } else {
      this.msg = 'Niente premio. Riprova!';
    }
  }
}
