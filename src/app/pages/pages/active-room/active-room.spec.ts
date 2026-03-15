import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  it('saveOptions requires at least 2 options', () => {
    component.room = { status: 'waiting' };
    component.optionsDraft = ['A'];
    component.saveOptions();
    expect(component.notice?.type).toBe('error');
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

  it('startVoting blocks when pending changes exist', () => {
    component.roomCode = 'ABC';
    component.hasPendingChanges = true;
    component.startVoting();
    expect(roomService.startVoting).not.toHaveBeenCalled();
    expect(component.notice?.type).toBe('info');
  });

  it('normalizeDuration handles null and invalid values', () => {
    const normalize = (component as any).normalizeDuration.bind(component);
    expect(normalize(null)).toBe(3);
    expect(normalize(-1)).toBe(1);
    expect(normalize(2.7)).toBe(2);
  });

  it('statusLabel maps known statuses', () => {
    expect(component.statusLabel('waiting')).toBe('En espera');
    expect(component.statusLabel('voting')).toBe('Votación');
    expect(component.statusLabel('closed')).toBe('Cerrada');
    expect(component.statusLabel('archived')).toBe('Archivada');
    expect(component.statusLabel('other')).toBe('other');
  });
});
