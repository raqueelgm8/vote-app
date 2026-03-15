import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';
import Vote from './vote';
import { RoomService } from '../../../services/room.service';

describe('Vote Component', () => {
  let component: Vote;
  let fixture: ComponentFixture<Vote>;
  let roomService: {
    getRoomByCode: jasmine.Spy;
    vote: jasmine.Spy;
    closeVoting: jasmine.Spy;
  };
  let params$: ReplaySubject<{ code: string }>;

  beforeEach(async () => {
    params$ = new ReplaySubject(1);
    roomService = {
      getRoomByCode: jasmine.createSpy('getRoomByCode'),
      vote: jasmine.createSpy('vote'),
      closeVoting: jasmine.createSpy('closeVoting')
    };

    await TestBed.configureTestingModule({
      imports: [Vote],
      providers: [
        { provide: RoomService, useValue: roomService },
        { provide: ActivatedRoute, useValue: { params: params$ } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates and loads room by code', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'waiting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;

    fixture.detectChanges();
    params$.next({ code: 'ABC' });
    fixture.detectChanges();

    expect(component.roomCode).toBe('ABC');
    expect(roomService.getRoomByCode).toHaveBeenCalledWith('ABC');
  });

  it('builds results and winner', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'closed' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;

    component.room = {
      options: ['A', 'B'],
      votes: { A: 3, B: 1 },
      totalVotes: 4
    };

    expect(component.results).toEqual([
      { position: 1, name: 'A', votes: 3, percent: 75 },
      { position: 2, name: 'B', votes: 1, percent: 25 }
    ]);
    expect(component.winnerLabel).toBe('A');
  });

  it('reads vote state from localStorage', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    localStorage.setItem('vote:ABC', 'B');

    (component as any).updateVoteState();

    expect(component.hasVoted).toBe(true);
    expect(component.selectedOption).toBe('B');
  });

  it('returns "Sin votos" when there are no options', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'closed' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;

    component.room = { options: [], votes: {}, totalVotes: 0 };
    expect(component.winnerLabel).toBe('Sin votos');
  });

  it('sets notice when user already voted', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.room = { status: 'voting' };
    component.hasVoted = true;

    component.vote('A');
    expect(component.notice?.type).toBe('info');
  });

  it('registers vote and saves localStorage', async () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    roomService.vote.and.returnValue(Promise.resolve());
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    component.room = { status: 'voting' };

    await component.vote('A');

    expect(roomService.vote).toHaveBeenCalledWith('ABC', 'A');
    expect(localStorage.getItem('vote:ABC')).toBe('A');
    expect(component.hasVoted).toBe(true);
  });

  it('closes voting when timer reaches zero', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    roomService.closeVoting.and.returnValue(Promise.resolve());
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() - 1000) };

    (component as any).tick();

    expect(component.timeLeft).toBe('00:00');
    expect(roomService.closeVoting).toHaveBeenCalledWith('ABC');
  });

  it('does not close voting again if already closed', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'closed' }));
    roomService.closeVoting.and.returnValue(Promise.resolve());
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    component.room = { status: 'closed', endsAt: new Date(Date.now() - 1000) };

    (component as any).tick();

    expect(roomService.closeVoting).not.toHaveBeenCalled();
  });

  it('clears timers and subscriptions on destroy', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    const intervalSpy = spyOn(window, 'clearInterval');
    const timeoutSpy = spyOn(window, 'clearTimeout');
    const subSpy = jasmine.createSpy('unsubscribe');

    (component as any).timerId = 123;
    (component as any).noticeTimeoutId = 456;
    (component as any).roomSub = { unsubscribe: subSpy };

    component.ngOnDestroy();

    expect(intervalSpy).toHaveBeenCalledWith(123);
    expect(timeoutSpy).toHaveBeenCalledWith(456);
    expect(subSpy).toHaveBeenCalled();
  });
});
