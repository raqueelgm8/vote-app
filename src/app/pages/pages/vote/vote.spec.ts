import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
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
    savePreScore: jasmine.Spy;
  };
  let params$: ReplaySubject<{ code: string }>;

  beforeEach(async () => {
    params$ = new ReplaySubject(1);
    roomService = {
      getRoomByCode: jasmine.createSpy('getRoomByCode'),
      vote: jasmine.createSpy('vote').and.returnValue(Promise.resolve()),
      closeVoting: jasmine.createSpy('closeVoting').and.returnValue(Promise.resolve()),
      savePreScore: jasmine.createSpy('savePreScore').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [Vote],
      providers: [
        { provide: RoomService, useValue: roomService },
        { provide: ActivatedRoute, useValue: { params: params$ } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
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

  it('sets loading false when code is missing', () => {
    roomService.getRoomByCode.and.returnValue(of({}));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;

    fixture.detectChanges();
    params$.next({} as any);
    fixture.detectChanges();

    expect(component.roomCode).toBe('');
    expect(component.loading).toBe(false);
    expect(roomService.getRoomByCode).not.toHaveBeenCalled();
  });

  it('persists voter id when room loads', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'waiting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;

    fixture.detectChanges();
    params$.next({ code: 'ABC' });
    fixture.detectChanges();

    expect(localStorage.getItem('voter:ABC')).toContain('v-');
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

  it('currentParticipantName returns empty when no options', () => {
    component.room = { options: null };
    expect(component.currentParticipantName).toBe('');
  });

  it('currentParticipantName respects order and index', () => {
    component.room = { options: ['A', 'B'], order: [1, 0], currentIndex: 0 };
    expect(component.currentParticipantName).toBe('B');
  });

  it('revealProgress returns zeros when room missing', () => {
    component.room = null;
    expect(component.revealProgress).toEqual({ current: 0, total: 0 });
  });

  it('revealProgress uses order when available', () => {
    component.room = { options: ['A', 'B', 'C'], order: [2, 1, 0], currentIndex: 1 };
    expect(component.revealProgress).toEqual({ current: 2, total: 3 });
  });

  it('revealProgress falls back to options length and default index', () => {
    component.room = { options: ['A', 'B', 'C'], order: null, currentIndex: 'x' };
    expect(component.revealProgress).toEqual({ current: 1, total: 3 });
  });

  it('returns myScores and currentScore', () => {
    component.voterId = 'v-1';
    component.room = {
      preScores: {
        'v-1': { Ana: 7 }
      },
      options: ['Ana']
    };
    expect(component.myScores).toEqual({ Ana: 7 });
    expect(component.currentScore).toBe(7);
  });

  it('currentScore returns null when score missing', () => {
    component.voterId = 'v-1';
    component.room = { preScores: { 'v-1': {} }, options: ['Ana'] };
    expect(component.currentScore).toBeNull();
  });

  it('myScoresList includes null for missing scores', () => {
    component.voterId = 'v-1';
    component.room = {
      preScores: { 'v-1': { Ana: 6 } },
      options: ['Ana', 'Luis']
    };
    expect(component.myScoresList).toEqual([
      { name: 'Ana', score: 6 },
      { name: 'Luis', score: null }
    ]);
  });

  it('reads vote state from localStorage', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    localStorage.setItem('voter:ABC', 'v-1');
    localStorage.setItem('vote:ABC', 'B');

    (component as any).updateVoteState();

    expect(component.hasVoted).toBe(true);
    expect(component.selectedOption).toBe('B');
  });

  it('prefers finalVotes over localStorage', () => {
    roomService.getRoomByCode.and.returnValue(of({ code: 'ABC', status: 'voting' }));
    fixture = TestBed.createComponent(Vote);
    component = fixture.componentInstance;
    component.roomCode = 'ABC';
    component.voterId = 'v-1';
    localStorage.setItem('vote:ABC', 'B');
    component.room = { finalVotes: { 'v-1': 'A' } };

    (component as any).updateVoteState();

    expect(component.selectedOption).toBe('A');
    expect(localStorage.getItem('vote:ABC')).toBe('A');
  });

  it('scoreParticipant skips when not in reveal state', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'voting' };
    component.scoreParticipant(7);
    expect(roomService.savePreScore).not.toHaveBeenCalled();
  });

  it('scoreParticipant skips when participant missing', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'reveal', options: [], order: [], currentIndex: 0 };
    component.scoreParticipant(7);
    expect(roomService.savePreScore).not.toHaveBeenCalled();
  });

  it('scoreParticipant saves pre score for current participant', async () => {
    roomService.savePreScore.and.returnValue(Promise.resolve());
    component.roomCode = 'ABC';
    component.room = { status: 'reveal', options: ['A', 'B'], order: [1, 0], currentIndex: 0 };
    localStorage.setItem('voter:ABC', 'v-1');

    component.scoreParticipant(8);
    await Promise.resolve();

    expect(roomService.savePreScore).toHaveBeenCalledWith('ABC', 'v-1', 'B', 8);
  });

  it('vote skips when not voting', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'waiting' };
    component.vote('A');
    expect(roomService.vote).not.toHaveBeenCalled();
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
    localStorage.setItem('voter:ABC', 'v-1');

    await component.vote('A');

    expect(roomService.vote).toHaveBeenCalledWith('ABC', 'A', 'v-1');
    expect(localStorage.getItem('vote:ABC')).toBe('A');
    expect(component.hasVoted).toBe(true);
  });

  it('vote handles service error', fakeAsync(() => {
    roomService.vote.and.returnValue(Promise.reject(new Error('fail')));
    component.roomCode = 'ABC';
    component.room = { status: 'voting' };
    localStorage.setItem('voter:ABC', 'v-1');
    spyOn(console, 'error');

    component.vote('A');
    flushMicrotasks();

    expect(component.notice?.type).toBe('error');
  }));

  it('scoreParticipant handles service error', fakeAsync(() => {
    roomService.savePreScore.and.returnValue(Promise.reject(new Error('fail')));
    component.roomCode = 'ABC';
    component.room = { status: 'reveal', options: ['A'], order: [0], currentIndex: 0 };
    localStorage.setItem('voter:ABC', 'v-1');
    spyOn(console, 'error');

    component.scoreParticipant(6);
    flushMicrotasks();

    expect(component.notice?.type).toBe('error');
  }));

  it('updateTimer clears when not voting', () => {
    component.room = { status: 'waiting' };
    (component as any).updateTimer();
    expect(component.timeLeft).toBe('');
  });

  it('updateVoteState leaves hasVoted false when no stored votes', () => {
    component.roomCode = 'ABC';
    component.voterId = 'v-1';
    component.room = {};
    (component as any).updateVoteState();
    expect(component.hasVoted).toBe(false);
  });

  it('results default to zero when votes are missing', () => {
    component.room = { options: ['A'] };
    expect(component.results).toEqual([
      { position: 1, name: 'A', votes: 0, percent: 0 }
    ]);
  });

  it('tick updates timeLeft when time remains', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() + 90 * 1000) };
    (component as any).tick();
    expect(component.timeLeft).toMatch(/\d{2}:\d{2}/);
  });

  it('updateTimer clears timeLeft when endsAt is missing', () => {
    component.room = { status: 'voting' };
    (component as any).updateTimer();
    expect(component.timeLeft).toBe('');
  });

  it('closes voting when timer reaches zero', () => {
    roomService.closeVoting.and.returnValue(Promise.resolve());
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() - 1000) };

    (component as any).tick();

    expect(component.timeLeft).toBe('00:00');
    expect(roomService.closeVoting).toHaveBeenCalledWith('ABC');
  });

  it('does not close voting again if already closed', () => {
    roomService.closeVoting.and.returnValue(Promise.resolve());
    component.roomCode = 'ABC';
    component.room = { status: 'closed', endsAt: new Date(Date.now() - 1000) };

    (component as any).tick();

    expect(roomService.closeVoting).not.toHaveBeenCalled();
  });

  it('ensureVoterId returns empty when roomCode missing', () => {
    component.roomCode = '';
    expect((component as any).ensureVoterId()).toBe('');
  });

  it('ensureVoterId returns existing id', () => {
    component.roomCode = 'ABC';
    localStorage.setItem('voter:ABC', 'v-9');
    expect((component as any).ensureVoterId()).toBe('v-9');
  });

  it('toDate uses toDate when available', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect((component as any).toDate({ toDate: () => date })).toBe(date);
  });

  it('toDate handles raw Date', () => {
    const date = new Date('2024-02-01T00:00:00Z');
    expect((component as any).toDate(date)).toEqual(date);
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
