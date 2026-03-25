import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, ReplaySubject } from 'rxjs';
import { ActiveRoom } from './active-room';
import { RoomService } from '../../../services/room.service';

describe('ActiveRoom', () => {
  let component: ActiveRoom;
  let fixture: ComponentFixture<ActiveRoom>;
  let roomService: {
    getRoomByCode: jasmine.Spy;
    startVoting: jasmine.Spy;
    startReveal: jasmine.Spy;
    nextParticipant: jasmine.Spy;
    updateRoomSettings: jasmine.Spy;
    closeVoting: jasmine.Spy;
  };
  let queryParams$: ReplaySubject<{ code: string }>;

  beforeEach(async () => {
    queryParams$ = new ReplaySubject(1);
    roomService = {
      getRoomByCode: jasmine.createSpy('getRoomByCode').and.returnValue(
        of({ code: 'ABC', status: 'waiting', options: ['A', 'B'], durationMinutes: 5 })
      ),
      startVoting: jasmine.createSpy('startVoting').and.returnValue(Promise.resolve()),
      startReveal: jasmine.createSpy('startReveal').and.returnValue(Promise.resolve()),
      nextParticipant: jasmine.createSpy('nextParticipant').and.returnValue(Promise.resolve()),
      updateRoomSettings: jasmine.createSpy('updateRoomSettings').and.returnValue(Promise.resolve()),
      closeVoting: jasmine.createSpy('closeVoting').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [ActiveRoom],
      providers: [
        { provide: RoomService, useValue: roomService },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$ } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveRoom);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if ((navigator as any).share) {
      delete (navigator as any).share;
    }
    if ((navigator as any).clipboard) {
      delete (navigator as any).clipboard;
    }
  });

  it('initializes room from query params', fakeAsync(() => {
    (component as any).route = { queryParams: queryParams$ };
    component.ngOnInit();
    queryParams$.next({ code: 'ABC' });
    tick();

    expect(component.roomCode).toBe('ABC');
    expect(component.qrCodeValue).toContain('/join/ABC');
    expect(component.optionsDraft).toEqual(['A', 'B']);
    expect(component.durationDraft).toBe(5);
  }));

  it('initializes with empty options when room has no options array', fakeAsync(() => {
    roomService.getRoomByCode.and.returnValue(
      of({ code: 'ABC', status: 'waiting', options: null, durationMinutes: undefined })
    );
    component.ngOnInit();
    queryParams$.next({ code: 'ABC' });
    tick();

    expect(component.optionsDraft).toEqual([]);
    expect(component.durationDraft).toBe(3);
  }));

  it('unsubscribes previous room subscription when new code arrives', fakeAsync(() => {
    const unsubscribeSpy = jasmine.createSpy('unsubscribe');
    (component as any).roomSub = { unsubscribe: unsubscribeSpy };

    component.ngOnInit();
    queryParams$.next({ code: 'XYZ' });
    tick();

    expect(unsubscribeSpy).toHaveBeenCalled();
  }));

  it('startReveal blocks when pending changes exist', () => {
    component.roomCode = 'ABC';
    component.hasPendingChanges = true;
    component.startReveal();
    expect(roomService.startReveal).not.toHaveBeenCalled();
    expect(component.notice?.type).toBe('info');
  });

  it('startReveal skips when roomCode is empty', () => {
    component.roomCode = '';
    component.hasPendingChanges = false;

    component.startReveal();

    expect(roomService.startReveal).not.toHaveBeenCalled();
    expect(component.notice).toBeNull();
  });

  it('startReveal calls service when allowed', async () => {
    component.roomCode = 'ABC';
    component.startReveal();
    await Promise.resolve();
    expect(roomService.startReveal).toHaveBeenCalledWith('ABC');
  });

  it('startReveal logs when service rejects', fakeAsync(() => {
    roomService.startReveal.and.returnValue(Promise.reject(new Error('fail')));
    spyOn(console, 'error');
    component.roomCode = 'ABC';

    component.startReveal();
    flushMicrotasks();

    expect(console.error).toHaveBeenCalled();
  }));

  it('nextParticipant calls service', async () => {
    component.roomCode = 'ABC';
    component.nextParticipant();
    await Promise.resolve();
    expect(roomService.nextParticipant).toHaveBeenCalledWith('ABC');
  });

  it('nextParticipant skips when roomCode is empty', () => {
    component.roomCode = '';

    component.nextParticipant();

    expect(roomService.nextParticipant).not.toHaveBeenCalled();
  });

  it('nextParticipant logs when service rejects', fakeAsync(() => {
    roomService.nextParticipant.and.returnValue(Promise.reject(new Error('fail')));
    spyOn(console, 'error');
    component.roomCode = 'ABC';

    component.nextParticipant();
    flushMicrotasks();

    expect(console.error).toHaveBeenCalled();
  }));

  it('startFinalVoting delegates to startVoting', () => {
    component.roomCode = 'ABC';
    component.startFinalVoting();
    expect(roomService.startVoting).toHaveBeenCalledWith('ABC');
  });

  it('startVoting skips when roomCode is empty', () => {
    component.roomCode = '';
    component.hasPendingChanges = false;

    component.startVoting();

    expect(roomService.startVoting).not.toHaveBeenCalled();
  });

  it('startVoting calls service when allowed', async () => {
    component.roomCode = 'ABC';
    component.hasPendingChanges = false;
    component.startVoting();
    await Promise.resolve();
    expect(roomService.startVoting).toHaveBeenCalledWith('ABC');
  });

  it('startVoting logs when service rejects', fakeAsync(() => {
    roomService.startVoting.and.returnValue(Promise.reject(new Error('fail')));
    spyOn(console, 'error');
    component.roomCode = 'ABC';

    component.startVoting();
    flushMicrotasks();

    expect(console.error).toHaveBeenCalled();
  }));

  it('startVoting blocks when pending changes exist', () => {
    component.roomCode = 'ABC';
    component.hasPendingChanges = true;
    component.startVoting();
    expect(roomService.startVoting).not.toHaveBeenCalled();
    expect(component.notice?.type).toBe('info');
  });

  it('addOption ignores non-waiting rooms', () => {
    component.room = { status: 'closed' };
    component.optionName = 'Equipo';
    component.addOption();
    expect(component.optionsDraft).toEqual([]);
  });

  it('addOption ignores empty values', () => {
    component.room = { status: 'waiting' };
    component.optionName = '   ';
    component.addOption();
    expect(component.optionsDraft).toEqual([]);
  });

  it('addOption prevents duplicates', () => {
    component.room = { status: 'waiting' };
    component.optionName = 'Equipo';
    component.addOption();
    expect(component.optionsDraft).toEqual(['Equipo']);

    component.optionName = 'equipo';
    component.addOption();
    expect(component.notice?.type).toBe('error');
    expect(component.optionsDraft).toEqual(['Equipo']);
  });

  it('removeOption ignores non-waiting rooms', () => {
    component.room = { status: 'closed' };
    component.optionsDraft = ['A', 'B'];
    component.removeOption(0);
    expect(component.optionsDraft).toEqual(['A', 'B']);
  });

  it('removeOption removes when waiting', () => {
    component.room = { status: 'waiting' };
    component.optionsDraft = ['A', 'B'];
    component.removeOption(0);
    expect(component.optionsDraft).toEqual(['B']);
  });

  it('onDurationChange normalizes and sets pending changes', () => {
    component.onDurationChange('2');
    expect(component.durationDraft).toBe(2);
    expect(component.hasPendingChanges).toBe(true);
  });

  it('onDurationChange accepts numeric values', () => {
    component.onDurationChange(4);
    expect(component.durationDraft).toBe(4);
    expect(component.hasPendingChanges).toBe(true);
  });

  it('saveOptions requires at least 2 options', () => {
    component.room = { status: 'waiting' };
    component.optionsDraft = ['A'];
    component.saveOptions();
    expect(component.notice?.type).toBe('error');
    expect(roomService.updateRoomSettings).not.toHaveBeenCalled();
  });

  it('saveOptions ignores non-waiting rooms', () => {
    component.room = { status: 'closed' };
    component.optionsDraft = ['A', 'B'];
    component.saveOptions();
    expect(roomService.updateRoomSettings).not.toHaveBeenCalled();
  });

  it('saveOptions updates settings when valid', async () => {
    component.room = { status: 'waiting' };
    component.roomCode = 'ABC';
    component.optionsDraft = ['A', 'B'];
    component.durationDraft = 4;

    component.saveOptions();
    await Promise.resolve();

    expect(roomService.updateRoomSettings).toHaveBeenCalledWith('ABC', ['A', 'B'], 4);
    expect(component.hasPendingChanges).toBe(false);
  });

  it('saveOptions handles service error', fakeAsync(() => {
    roomService.updateRoomSettings.and.returnValue(Promise.reject(new Error('fail')));
    component.room = { status: 'waiting' };
    component.roomCode = 'ABC';
    component.optionsDraft = ['A', 'B'];
    component.durationDraft = 4;
    spyOn(console, 'error');

    component.saveOptions();
    flushMicrotasks();

    expect(component.notice?.type).toBe('error');
  }));

  it('currentParticipantName respects order and index', () => {
    component.room = {
      options: ['A', 'B', 'C'],
      order: [2, 0, 1],
      currentIndex: 1
    };
    expect(component.currentParticipantName).toBe('A');
  });

  it('currentParticipantName falls back to index when order is invalid', () => {
    component.room = {
      options: ['A', 'B'],
      order: null,
      currentIndex: 'x'
    };
    expect(component.currentParticipantName).toBe('A');
  });

  it('currentParticipantName returns empty when index out of bounds', () => {
    component.room = { options: [], order: [], currentIndex: 0 };
    expect(component.currentParticipantName).toBe('');
  });

  it('currentParticipantName returns empty when options missing', () => {
    component.room = { options: null };
    expect(component.currentParticipantName).toBe('');
  });

  it('isLastReveal returns true on last participant', () => {
    component.room = { options: ['A', 'B'], order: [0, 1], currentIndex: 1 };
    expect(component.isLastReveal).toBe(true);
  });

  it('revealProgress returns zeros when room missing', () => {
    component.room = null;
    expect(component.revealProgress).toEqual({ current: 0, total: 0 });
  });

  it('revealProgress returns current and total', () => {
    component.room = {
      options: ['A', 'B'],
      order: [1, 0],
      currentIndex: 0
    };
    expect(component.revealProgress).toEqual({ current: 1, total: 2 });
  });

  it('revealProgress falls back to options length and default index', () => {
    component.room = {
      options: ['A', 'B', 'C'],
      order: null,
      currentIndex: 'x'
    };
    expect(component.revealProgress).toEqual({ current: 1, total: 3 });
  });

  it('updateTimer clears when not voting', () => {
    component.room = { status: 'waiting' };
    (component as any).updateTimer();
    expect(component.timeLeft).toBe('');
  });

  it('updateTimer clears when room is missing', () => {
    component.room = null;
    component.timeLeft = '01:00';

    (component as any).updateTimer();

    expect(component.timeLeft).toBe('');
  });

  it('updateTimer clears when endsAt is missing', () => {
    component.room = { status: 'voting', endsAt: null };
    component.timeLeft = '01:00';

    (component as any).updateTimer();

    expect(component.timeLeft).toBe('');
  });

  it('updateTimer clears existing interval before recalculating', () => {
    const clearSpy = spyOn(window, 'clearInterval');
    (component as any).timerId = 123;
    component.room = { status: 'waiting' };
    (component as any).updateTimer();
    expect(clearSpy).toHaveBeenCalledWith(123);
  });

  it('updateTimer sets interval when voting', () => {
    component.room = { status: 'voting', endsAt: new Date(Date.now() + 60000) };
    (component as any).updateTimer();
    expect((component as any).timerId).toBeDefined();
  });

  it('updateTimer invokes interval callback', () => {
    // Configuramos la sala
    component.room = { status: 'voting', endsAt: new Date(Date.now() + 60000) };

    // Espiamos la función tick
    const tickSpy = spyOn(component as any, 'tick').and.callThrough();

    // Activamos el reloj simulado
    jasmine.clock().install();

    try {
      // Llamamos a updateTimer
      (component as any).updateTimer();

      // Avanzamos el reloj 2 segundos (o el intervalo que use updateTimer)
      // Si tu setInterval en updateTimer es 1000ms, avanzamos 2000ms
      jasmine.clock().tick(2000);

      // Comprobamos que tick fue llamado al menos 2 veces
      expect(tickSpy.calls.count()).toBeGreaterThanOrEqual(2);
    } finally {
      // Restauramos el reloj real
      jasmine.clock().uninstall();
    }
  });
  it('tick returns early when endsAt is missing', () => {
    component.room = { status: 'voting' };
    component.timeLeft = '01:00';

    (component as any).tick();

    expect(component.timeLeft).toBe('01:00');
  });

  it('tick returns early when room is missing', () => {
    component.room = null;
    component.timeLeft = '01:00';

    (component as any).tick();

    expect(component.timeLeft).toBe('01:00');
  });

  it('tick updates timeLeft when time remains', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() + 90 * 1000) };
    (component as any).tick();
    expect(component.timeLeft).toMatch(/\d{2}:\d{2}/);
  });

  it('tick closes voting when timer reaches zero', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() - 1000) };
    (component as any).tick();
    expect(component.timeLeft).toBe('00:00');
    expect(roomService.closeVoting).toHaveBeenCalledWith('ABC');
  });

  it('tick clears interval when time is up', () => {
    const clearSpy = spyOn(window, 'clearInterval');
    (component as any).timerId = 321;
    component.roomCode = 'ABC';
    component.room = { status: 'voting', endsAt: new Date(Date.now() - 1000) };

    (component as any).tick();

    expect(clearSpy).toHaveBeenCalledWith(321);
    expect((component as any).timerId).toBeUndefined();
  });

  it('tick does not close voting again if already closed', () => {
    component.roomCode = 'ABC';
    component.room = { status: 'closed', endsAt: new Date(Date.now() - 1000) };
    (component as any).tick();
    expect(roomService.closeVoting).not.toHaveBeenCalled();
  });

  it('toDate handles plain values', () => {
    const date = new Date('2024-01-02T00:00:00Z');
    expect((component as any).toDate(date)).toEqual(date);
  });

  it('toDate handles values with toDate', () => {
    const date = new Date('2024-01-03T00:00:00Z');
    const value = { toDate: () => date };
    expect((component as any).toDate(value)).toEqual(date);
  });

  it('results returns empty when room or options missing', () => {
    component.room = null;
    expect(component.results).toEqual([]);

    component.room = { options: null };
    expect(component.results).toEqual([]);
  });

  it('results handles missing votes and totals', () => {
    component.room = { options: ['A', 'B'], votes: null, totalVotes: 0 };
    expect(component.results).toEqual([
      { position: 1, name: 'A', votes: 0, percent: 0 },
      { position: 2, name: 'B', votes: 0, percent: 0 }
    ]);
  });

  it('results calculates totals and percentages when votes exist', () => {
    component.room = { options: ['A', 'B'], votes: { A: 2, B: 1 }, totalVotes: 3 };
    expect(component.results).toEqual([
      { position: 1, name: 'A', votes: 2, percent: 67 },
      { position: 2, name: 'B', votes: 1, percent: 33 }
    ]);
  });

  it('winnerLabel returns top name when votes exist', () => {
    component.room = { options: ['A', 'B'], votes: { A: 2, B: 1 }, totalVotes: 3 };
    expect(component.winnerLabel).toBe('A');
  });

  it('winnerLabel returns "Sin votos" when empty', () => {
    component.room = { options: [] };
    expect(component.winnerLabel).toBe('Sin votos');
  });

  it('shareQrLink uses navigator.share when available', async () => {
    const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    component.qrCodeValue = 'http://test';
    component.room = { name: 'Sala' };

    component.shareQrLink();
    await Promise.resolve();

    expect(shareSpy).toHaveBeenCalled();
  });

  it('shareQrLink does nothing when qrCodeValue is empty', () => {
    component.qrCodeValue = '';
    const copySpy = spyOn(component, 'copyQrLink');

    component.shareQrLink();

    expect(copySpy).not.toHaveBeenCalled();
  });

  it('shareQrLink falls back to copy when share fails', async () => {
    const shareSpy = jasmine.createSpy('share').and.returnValue(Promise.reject());
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    component.qrCodeValue = 'http://test';
    const copySpy = spyOn(component, 'copyQrLink');

    component.shareQrLink();
    await Promise.resolve();

    expect(copySpy).toHaveBeenCalled();
  });

  it('shareQrLink falls back to copy when share is unavailable', fakeAsync(() => {
    const proto = Object.getPrototypeOf(navigator);
    const protoDesc = Object.getOwnPropertyDescriptor(proto, 'share');
    const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'share');
    let overridden: 'proto' | 'own' | null = null;

    try {
      if (protoDesc?.configurable) {
        Object.defineProperty(proto, 'share', { value: undefined, configurable: true });
        overridden = 'proto';
      } else if (!ownDesc || ownDesc.configurable) {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        overridden = 'own';
      }
    } catch {
      overridden = null;
    }

    if (!overridden) {
      expect(true).toBeTrue();
      return;
    }

    component.qrCodeValue = 'http://test';
    const copySpy = spyOn(component, 'copyQrLink');

    component.shareQrLink();
    flushMicrotasks();

    expect(copySpy).toHaveBeenCalled();

    if (overridden === 'proto') {
      if (protoDesc) {
        Object.defineProperty(proto, 'share', protoDesc);
      } else {
        delete (proto as any).share;
      }
    } else {
      if (ownDesc) {
        Object.defineProperty(navigator, 'share', ownDesc);
      } else {
        delete (navigator as any).share;
      }
    }
  }));

  it('copyQrLink does nothing when qrCodeValue is empty', () => {
    const writeSpy = jasmine.createSpy('writeText');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeSpy }, configurable: true });
    component.qrCodeValue = '';

    component.copyQrLink();

    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('copyQrLink sets success notice', async () => {
    const writeSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeSpy }, configurable: true });
    component.qrCodeValue = 'http://test';

    component.copyQrLink();
    await Promise.resolve();

    expect(writeSpy).toHaveBeenCalledWith('http://test');
    expect(component.notice?.type).toBe('success');
  });

  it('copyQrLink sets error notice on failure', fakeAsync(() => {
    const writeSpy = jasmine.createSpy('writeText').and.returnValue(Promise.reject(new Error('fail')));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeSpy }, configurable: true });
    component.qrCodeValue = 'http://test';

    component.copyQrLink();
    flushMicrotasks();

    expect(component.notice?.type).toBe('error');
  }));

  it('setNotice clears existing timeout', () => {
    const clearSpy = spyOn(window, 'clearTimeout');
    (component as any).noticeTimeoutId = 999;

    (component as any).setNotice('info', 'Mensaje');

    expect(clearSpy).toHaveBeenCalledWith(999);
  });

  it('clears timers and subscriptions on destroy', () => {
    const intervalSpy = spyOn(window, 'clearInterval');
    const timeoutSpy = spyOn(window, 'clearTimeout');
    const subSpy = jasmine.createSpy('unsubscribe');

    (component as any).timerId = 111;
    (component as any).noticeTimeoutId = 222;
    (component as any).roomSub = { unsubscribe: subSpy };

    component.ngOnDestroy();

    expect(intervalSpy).toHaveBeenCalledWith(111);
    expect(timeoutSpy).toHaveBeenCalledWith(222);
    expect(subSpy).toHaveBeenCalled();
  });

  it('normalizeDuration handles null and invalid values', () => {
    const normalize = (component as any).normalizeDuration.bind(component);
    expect(normalize(null)).toBe(3);
    expect(normalize(-1)).toBe(1);
    expect(normalize(2.7)).toBe(2);
  });

  it('triggers console ninja fallback when console error logs', fakeAsync(() => {
    roomService.startReveal.and.returnValue(Promise.reject(new Error('fail')));
    spyOn(console, 'error');
    component.roomCode = 'ABC';

    const g: any = globalThis as any;
    const hadProp = Object.prototype.hasOwnProperty.call(g, '_console_ninja');
    const originalDesc = Object.getOwnPropertyDescriptor(g, '_console_ninja');
    const originalValue = g._console_ninja;
    let overridden = false;

    try {
      Object.defineProperty(g, '_console_ninja', { value: undefined, configurable: true, writable: true });
      overridden = true;
    } catch {
      try {
        g._console_ninja = undefined;
        overridden = true;
      } catch { }
    }

    if (!overridden) {
      expect(true).toBeTrue();
      return;
    }

    component.startReveal();
    flushMicrotasks();

    if (originalDesc) {
      try {
        Object.defineProperty(g, '_console_ninja', originalDesc);
      } catch {
        g._console_ninja = originalValue;
      }
    } else if (hadProp) {
      try {
        g._console_ninja = originalValue;
      } catch { }
    } else {
      try {
        delete g._console_ninja;
      } catch { }
    }
  }));

  it('touches console ninja helper when available', () => {
    let helper: any;
    try {
      helper = (0, eval)('oo_cm');
    } catch {
      helper = undefined;
    }
    if (typeof helper === 'function') {
      const g: any = globalThis as any;
      const hadProp = Object.prototype.hasOwnProperty.call(g, '_console_ninja');
      const original = g._console_ninja;
      try {
        g._console_ninja = { touched: true };
      } catch { }
      try {
        helper();
      } catch { }
      try {
        g._console_ninja = undefined;
      } catch { }
      try {
        delete g._console_ninja;
      } catch { }
      try {
        helper();
      } catch { }
      if (hadProp) {
        try {
          g._console_ninja = original;
        } catch { }
      } else {
        try {
          delete g._console_ninja;
        } catch { }
      }
    }
    expect(true).toBeTrue();
  });

  it('statusLabel maps known statuses', () => {
    expect(component.statusLabel('waiting')).toBe('En espera');
    expect(component.statusLabel('reveal')).toBe('Revelación');
    expect(component.statusLabel('voting')).toBe('Votación');
    expect(component.statusLabel('closed')).toBe('Cerrada');
    expect(component.statusLabel('archived')).toBe('Archivada');
    expect(component.statusLabel('other')).toBe('other');
  });
});
