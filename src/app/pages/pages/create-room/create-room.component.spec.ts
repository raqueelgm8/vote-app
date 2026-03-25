import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CreateRoomComponent } from './create-room.component';
import { RoomService } from '../../../services/room.service';

describe('CreateRoomComponent', () => {
  let component: CreateRoomComponent;
  let fixture: ComponentFixture<CreateRoomComponent>;
  let roomService: { createRoom: jasmine.Spy };
  let router: { navigate: jasmine.Spy };

  beforeEach(async () => {
    roomService = {
      createRoom: jasmine.createSpy('createRoom').and.returnValue(Promise.resolve())
    };
    router = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [CreateRoomComponent],
      providers: [
        { provide: RoomService, useValue: roomService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRoomComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('addOption adds and prevents duplicates', () => {
    component.optionName = 'Equipo A';
    component.addOption();
    expect(component.options).toEqual(['Equipo A']);

    component.optionName = 'equipo a';
    component.addOption();
    expect(component.notice?.type).toBe('error');
    expect(component.options).toEqual(['Equipo A']);
  });

  it('addOption ignores when room already created', () => {
    component.roomCode = 'ABC';
    component.optionName = 'Equipo A';
    component.addOption();
    expect(component.options).toEqual([]);
  });

  it('addOption ignores empty values', () => {
    component.optionName = '   ';
    component.addOption();
    expect(component.options).toEqual([]);
  });

  it('removeOption ignores when room already created', () => {
    component.roomCode = 'ABC';
    component.options = ['A', 'B'];
    component.removeOption(0);
    expect(component.options).toEqual(['A', 'B']);
  });

  it('removeOption removes when allowed', () => {
    component.options = ['A', 'B'];
    component.removeOption(0);
    expect(component.options).toEqual(['B']);
  });

  it('clampDuration enforces minimum of 1', () => {
    component.durationMinutes = 0;
    component.clampDuration();
    expect(component.durationMinutes).toBe(1);
  });

  it('clampDuration keeps valid values', () => {
    component.durationMinutes = 4;
    component.clampDuration();
    expect(component.durationMinutes).toBe(4);
  });

  it('canCreateRoom depends on name and options', () => {
    component.votingName = 'Mi sala';
    component.options = ['A', 'B'];
    component.roomCode = '';
    expect(component.canCreateRoom).toBe(true);

    component.roomCode = 'CODE';
    expect(component.canCreateRoom).toBe(false);
  });

  it('createRoom blocks when room already exists', async () => {
    component.roomCode = 'ABC';
    await component.createRoom();
    expect(component.notice?.type).toBe('info');
    expect(roomService.createRoom).not.toHaveBeenCalled();
  });

  it('createRoom validates name and options', async () => {
    component.votingName = '';
    component.options = ['A', 'B'];
    await component.createRoom();
    expect(component.notice?.type).toBe('error');
    expect(roomService.createRoom).not.toHaveBeenCalled();
  });

  it('createRoom validates minimum participants', async () => {
    component.votingName = 'Sala';
    component.options = ['A'];
    await component.createRoom();
    expect(component.notice?.type).toBe('error');
    expect(roomService.createRoom).not.toHaveBeenCalled();
  });

  it('createRoom validates duration', async () => {
    component.votingName = 'Sala';
    component.options = ['A', 'B'];
    component.durationMinutes = 0;
    await component.createRoom();
    expect(component.notice?.type).toBe('error');
    expect(roomService.createRoom).not.toHaveBeenCalled();
  });

  it('createRoom handles service error', async () => {
    roomService.createRoom.and.returnValue(Promise.reject(new Error('fail')));
    component.votingName = 'Sala';
    component.options = ['A', 'B'];
    component.durationMinutes = 3;
    spyOn(component as any, 'generateCode').and.returnValue('ABC123');
    spyOn(console, 'error');

    await component.createRoom();

    expect(component.notice?.type).toBe('error');
  });

  it('createRoom creates and navigates', async () => {
    spyOn(component as any, 'generateCode').and.returnValue('ABC123');
    component.votingName = 'Sala';
    component.options = ['A', 'B'];
    component.durationMinutes = 3;

    await component.createRoom();

    expect(roomService.createRoom).toHaveBeenCalledWith('Sala', 'ABC123', 'admin', ['A', 'B'], 3);
    expect(component.roomCode).toBe('ABC123');
    expect(component.qrCodeValue).toContain('/join/ABC123');
    expect(router.navigate).toHaveBeenCalledWith(['/active-room'], { queryParams: { code: 'ABC123' } });
  });

  it('generateCode returns desired length', () => {
    const code = (component as any).generateCode(8);
    expect(code.length).toBe(8);
  });
});
