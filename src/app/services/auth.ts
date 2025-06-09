import { Injectable, inject } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, switchMap, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

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
        this.checkIfAdmin(user.uid).then(isAdmin => {
          this.isAdminSubject.next(isAdmin);
          this.loadingSubject.next(false);
        });
      } else {
        this.isAdminSubject.next(false);
        this.loadingSubject.next(false);
      }
    });
  }

  login() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  logout() {
    return signOut(this.auth);
  }

  private async checkIfAdmin(uid: string): Promise<boolean> {
    // Comentado el acceso a Firestore para pruebas
    // const adminDocRef = doc(this.firestore, 'admins', uid);
    // const adminDocSnap = await getDoc(adminDocRef);
    // return adminDocSnap.exists();

    return true; // Forzar que siempre es admin durante pruebas
  }

}
