import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { CommonModule } from '@angular/common';

type TrackKey = 'monza'|'monaco'|'silverstone';
type DriverKey = 'ver'|'ham'|'lec'|'nor'|'alo'|'pia'|'tsu'|'str'|'sai'|'alb'|'rus'|'ant';

type Driver = {
  key: DriverKey;
  name: string;
  car: string;
  stats: { speed: number; handling: number; consistency: number }; // 0..100
};

type Track = {
  key: TrackKey;
  name: string;
  weights: { speed: number; handling: number; consistency: number }; // somma ~ 1
  variance: number; // quanto conta il caso
};

@Component({
  selector: 'app-f1',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './f1.html',
  styleUrls: ['./f1.css']
})

export class F1Component {
  bet = 50;

  tracks: Track[] = [
    { key: 'monza', name: 'Monza (alta velocità)', weights: { speed: 0.55, handling: 0.20, consistency: 0.25 }, variance: 18 },
    { key: 'monaco', name: 'Monaco (stretta/tecnica)', weights: { speed: 0.20, handling: 0.55, consistency: 0.25 }, variance: 14 },
    { key: 'silverstone', name: 'Silverstone (bilanciata)', weights: { speed: 0.35, handling: 0.35, consistency: 0.30 }, variance: 16 }
  ];

  drivers: Driver[] = [
    { key: 'ver', name: 'Verstappen', car: 'Red Bull', stats: { speed: 89, handling: 88, consistency: 88 } },
    { key: 'ham', name: 'Hamilton', car: 'Ferrari', stats: { speed: 89, handling: 86, consistency: 90 } },
    { key: 'lec', name: 'Leclerc', car: 'Ferrari', stats: { speed: 89, handling: 88, consistency: 85 } },
    { key: 'nor', name: 'Norris', car: 'McLaren', stats: { speed: 90, handling: 85, consistency: 80 } },
    { key: 'alo', name: 'Alonso', car: 'Aston Martin', stats: { speed: 85, handling: 86, consistency: 85 } },
    { key: 'pia', name: 'Piastri', car: 'McLaren', stats: { speed: 90, handling: 87, consistency: 83 } },
    { key: 'tsu', name: 'Tsunoda', car: 'Red Bull', stats: { speed: 89, handling: 80, consistency: 78 } },
    { key: 'str', name: 'Stroll', car: 'Aston Martin', stats: { speed: 85, handling: 76, consistency: 78 } },
    { key: 'sai', name: 'Sainz', car: 'Williams', stats: { speed: 87, handling: 87, consistency: 82 } },
    { key: 'alb', name: 'Albon', car: 'Williams', stats: { speed: 87, handling: 82, consistency: 76 } },
    { key: 'rus', name: 'Russell', car: 'Mercedes', stats: { speed: 89, handling: 87, consistency: 84 } },
    { key: 'ant', name: 'Antonelli', car: 'Mercedes', stats: { speed: 89, handling: 82, consistency: 78 } },

  ];

  selectedTrack: TrackKey = 'monza';
  selectedDriver: DriverKey = 'ver';

  resultMsg = 'Scegli pista e pilota, poi “Avvia gara”.';
  standings: { name: string; score: number }[] = [];
  win = 0;

  constructor(private wallet: WalletService) {}

  private randn(): number {
    // random approx normale [-1..1] mediamente
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  }

  private expectedScore(d: Driver, t: Track): number {
    const s = d.stats;
    return s.speed * t.weights.speed + s.handling * t.weights.handling + s.consistency * t.weights.consistency;
  }

  private oddsMultiplier(chosenExpected: number, allExpected: number[]): number {
    // payout “tipo quote”: più sei sfavorito più paghi
    const sum = allExpected.reduce((a,b)=>a+b,0);
    const p = chosenExpected / sum; // probabilità grezza
    // house edge virtuale piccola
    const edge = 0.90;
    const mult = (1 / Math.max(0.05, p)) * edge;
    // clamp
    return Math.min(8, Math.max(1.2, mult));
  }

  async race() {
    this.resultMsg = '';
    this.standings = [];
    this.win = 0;

    if (this.bet < 1) { this.resultMsg = 'Puntata non valida.'; return; }

    try {
      await this.wallet.spend(this.bet);
    } catch (e: any) {
      this.resultMsg = e?.message ?? 'Crediti insufficienti';
      return;
    }

    const track = this.tracks.find(t => t.key === this.selectedTrack)!;
    const expectedAll = this.drivers.map(d => this.expectedScore(d, track));

    // simula “gara”
    const scored = this.drivers.map((d, i) => {
      const base = expectedAll[i];
      const random = this.randn() * track.variance;
      // consistenza riduce il “casino”
      const stability = (100 - d.stats.consistency) / 100; // 0..1
      const score = base + random * (0.6 + stability);
      return { name: `${d.name} (${d.car})`, key: d.key, score: Math.round(score * 10) / 10, expected: base };
    });

    scored.sort((a,b)=>b.score - a.score);
    this.standings = scored.map(x => ({ name: x.name, score: x.score }));

    const winner = scored[0];
    const chosen = scored.find(x => x.key === this.selectedDriver)!;

    if (winner.key === this.selectedDriver) {
      const mult = this.oddsMultiplier(chosen.expected, expectedAll);
      const payout = Math.floor(this.bet * mult);
      await this.wallet.payout(payout);
      this.win = payout;
      this.resultMsg = `HAI VINTO! Vincitore: ${winner.name}. Moltiplicatore: x${mult.toFixed(2)} → +${payout} crediti`;
    } else {
      this.resultMsg = `Hai perso. Vincitore: ${winner.name}. Il tuo: ${chosen.name}`;
    }
  }
}
