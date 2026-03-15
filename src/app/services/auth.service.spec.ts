import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let authStub: { onAuthStateChanged: (cb: (user: any) => void) => void };
  let onAuthCallback: (user: any) => void;

  beforeEach(() => {
    authStub = {
      onAuthStateChanged: (cb: (user: any) => void) => {
        onAuthCallback = cb;
      }
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authStub }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  it('marks admin for allowed emails', async () => {
    onAuthCallback({ email: 'raquel.guti8@gmail.com' });
    const isAdmin = await firstValueFrom(service.isAdmin$);
    expect(isAdmin).toBe(true);

    onAuthCallback({ email: 'silviagutierrezm24@gmail.com' });
    const isAdmin2 = await firstValueFrom(service.isAdmin$);
    expect(isAdmin2).toBe(true);
  });

  it('marks non-admin emails as false', async () => {
    onAuthCallback({ email: 'otro@gmail.com' });
    const isAdmin = await firstValueFrom(service.isAdmin$);
    expect(isAdmin).toBe(false);
  });

  it('login calls signInWithPopup', async () => {
    const spy = spyOn(service as any, 'signInWithPopupFn').and.returnValue(Promise.resolve({} as any));
    await service.login();
    expect(spy).toHaveBeenCalled();
  });

  it('logout calls signOut', async () => {
    const spy = spyOn(service as any, 'signOutFn').and.returnValue(Promise.resolve());
    await service.logout();
    expect(spy).toHaveBeenCalled();
  });
});
