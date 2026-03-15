import { Injectable, inject } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private adminEmails = ['raquel.guti8@gmail.com', 'silviagutierrezm24@gmail.com'];
  private signInWithPopupFn = signInWithPopup;
  private signOutFn = signOut;

  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject(true);
  private isAdminSubject = new BehaviorSubject(false);

  user$: Observable<User | null> = this.userSubject.asObservable();
  isLoading$: Observable<boolean> = this.loadingSubject.asObservable();
  isAdmin$: Observable<boolean> = this.isAdminSubject.asObservable();

  constructor() {
    this.auth.onAuthStateChanged(user => {
      this.userSubject.next(user);
      if (user) {
        const email = (user.email || '').toLowerCase();
        const isAdmin = this.adminEmails.includes(email);
        this.isAdminSubject.next(isAdmin);
        this.loadingSubject.next(false);
      } else {
        this.isAdminSubject.next(false);
        this.loadingSubject.next(false);
      }
    });
  }

  login() {
    const provider = new GoogleAuthProvider();
    return this.signInWithPopupFn(this.auth, provider);
  }

  logout() {
    return this.signOutFn(this.auth);
  }

}
