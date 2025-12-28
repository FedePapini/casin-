import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { auth, db } from '../firebase';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<User | null>(null);
  user$ = this._user$.asObservable();

  constructor() {
    onAuthStateChanged(auth, async (u) => {
      this._user$.next(u);
      if (u) {
        // assicura che esista il doc utente
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: u.email ?? '',
            credits: 1000, // bonus iniziale
            createdAt: serverTimestamp()
          });
        }
      }
    });
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  async register(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async logout() {
    await signOut(auth);
  }
}
