import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MainComponent } from './main.component';
import { AuthService } from '../../services/auth.service';

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;
  let router: Router;
  let authService: { logout: jasmine.Spy };

  beforeEach(async () => {
    authService = {
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [MainComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('calls checkScreen on init', () => {
    const spy = spyOn(component, 'checkScreen');
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
  });

  it('calls checkScreen on resize', () => {
    const spy = spyOn(component, 'checkScreen');
    component.onResize();
    expect(spy).toHaveBeenCalled();
  });

  it('sets mobile mode and closes sidenav on small screens', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });

    component.sidenavOpened = true;
    component.checkScreen();

    expect(component.isMobile).toBe(true);
    expect(component.sidenavOpened).toBe(false);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('keeps sidenav opened on desktop when user has not toggled', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });

    component.userToggled = false;
    component.sidenavOpened = false;
    component.checkScreen();

    expect(component.isMobile).toBe(false);
    expect(component.sidenavOpened).toBe(true);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('does not force open when user already toggled', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });

    component.userToggled = true;
    component.sidenavOpened = false;
    component.checkScreen();

    expect(component.isMobile).toBe(false);
    expect(component.sidenavOpened).toBe(false);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('toggleSidenav flips state and sets userToggled', () => {
    component.sidenavOpened = true;
    component.userToggled = false;

    component.toggleSidenav();

    expect(component.sidenavOpened).toBe(false);
    expect(component.userToggled).toBe(true);
  });

  it('closeSidenav only closes on mobile', () => {
    component.isMobile = true;
    component.sidenavOpened = true;
    component.closeSidenav();
    expect(component.sidenavOpened).toBe(false);

    component.isMobile = false;
    component.sidenavOpened = true;
    component.closeSidenav();
    expect(component.sidenavOpened).toBe(true);
  });

  it('logout delegates to authService', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('goTo navigates to path', () => {
    component.goTo('/rooms');
    expect(router.navigate).toHaveBeenCalledWith(['/rooms']);
  });
});
