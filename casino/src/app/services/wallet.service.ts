import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { db } from '../firebase';
import { AuthService } from './auth.service';
import {
  doc,
  onSnapshot,
  runTransaction,
  increment
} from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private _credits$ = new BehaviorSubject<number>(0);
  credits$ = this._credits$.asObservable();

  private unsubscribe: (() => void) | null = null;

  constructor(private auth: AuthService) {
    this.auth.user$.subscribe((u) => {
      if (this.unsubscribe) this.unsubscribe();
      if (!u) {
        this._credits$.next(0);
        return;
      }
      const ref = doc(db, 'users', u.uid);
      this.unsubscribe = onSnapshot(ref, (snap) => {
        const data = snap.data() as any;
        this._credits$.next(data?.credits ?? 0);
      });
    });
  }

  async addCredits(amount: number) {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Not logged in');
    const ref = doc(db, 'users', u.uid);
    await runTransaction(db, async (tx) => {
      tx.update(ref, { credits: increment(amount) });
    });
  }

  async spend(amount: number) {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Not logged in');
    const ref = doc(db, 'users', u.uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const credits = (snap.data() as any)?.credits ?? 0;
      if (credits < amount) throw new Error('Crediti insufficienti');
      tx.update(ref, { credits: credits - amount });
    });
  }

  async payout(amount: number) {
    // payout = aggiunge crediti
    await this.addCredits(amount);
  }
}
