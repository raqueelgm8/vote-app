import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';

describe('AppComponent', () => {
  const authStub = {
    user$: of(null),
    isLoading$: of(false),
    isAdmin$: of(false)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        {
          provide: Router,
          useValue: {
            url: '/',
            events: of(new NavigationEnd(1, '/', '/'))
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('detects join route on init', () => {
    TestBed.overrideProvider(Router, {
      useValue: {
        url: '/join/ABC123',
        events: of(new NavigationEnd(1, '/join/ABC123', '/join/ABC123'))
      }
    });
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.isJoinRoute()).toBe(true);
  });
});
